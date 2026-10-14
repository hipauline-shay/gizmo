import { describe, expect, it } from 'vitest'
import {
  extractJson,
  parseAnalysisResponse,
  parseCombinedSummaryResponse,
  quoteBareValues,
} from '../src/analysis/response-parser'
import { GizmoError } from '../src/utilities/errors'

const validResponse = JSON.stringify({
  featureName: 'Account Settings',
  summary: 'Allows signed-in users to manage their profile.',
  confidence: 'high',
  evidenceSummary: 'Based on settings-screen.tsx',
  userGoal: 'Update account details',
  primaryActions: [
    {
      label: 'Update profile',
      behavior: 'Saves the profile',
      evidence: [{ file: 'src/settings.tsx', startLine: 10, endLine: 24 }],
    },
  ],
  userFlow: [
    {
      step: 1,
      title: 'Open settings',
      description: 'User opens settings.',
      confidence: 'confirmed',
    },
  ],
  states: [{ name: 'Loading', status: 'implemented', description: 'Skeleton shown', evidence: [] }],
  businessRules: [],
  permissions: [],
  dataDependencies: [],
  externalServices: [],
  components: [],
  risks: [],
  uxConcerns: [],
  missingStates: [],
  openQuestions: [],
  acceptanceCriteria: [],
  changeImpact: [],
  technicalNotes: [],
})

describe('parseAnalysisResponse', () => {
  it('parses a valid JSON response', () => {
    const analysis = parseAnalysisResponse(validResponse)
    expect(analysis.featureName).toBe('Account Settings')
    expect(analysis.states[0]?.name).toBe('Loading')
  })

  it('parses JSON wrapped in a markdown fence', () => {
    const analysis = parseAnalysisResponse('```json\n' + validResponse + '\n```')
    expect(analysis.confidence).toBe('high')
  })

  it('parses JSON with surrounding prose', () => {
    const analysis = parseAnalysisResponse(`Here is the analysis:\n${validResponse}\nDone.`)
    expect(analysis.summary).toContain('profile')
  })

  it('applies defaults for optional list sections', () => {
    const minimal = JSON.stringify({
      featureName: 'X',
      summary: 'Y',
      confidence: 'low',
    })
    const analysis = parseAnalysisResponse(minimal)
    expect(analysis.risks).toEqual([])
    expect(analysis.states).toEqual([])
  })

  it('repairs small slips instead of failing the whole scan', () => {
    const messy = JSON.stringify({
      featureName: 'Camera capture',
      summary: 'Snap to identify.',
      confidence: 'High',
      completionStatus: 'nearly done',
      risks: null,
      states: [
        { name: 'Loading', status: 'Implemented', description: null, evidence: null },
        { status: 'missing' },
      ],
      launchBlockersTypo: [],
      nextSteps: [{ title: 'Reset share choice', userImpact: 'critical', required: 'yes' }],
      perspectives: {
        stakeholder: {
          launchBlockers: [
            {
              text: 'Privacy bug',
              confidence: 'Confirmed',
              evidence: [
                { file: 'camera-screen.tsx', startLine: '173', endLine: 190 },
                { file: 'camera-screen.tsx', startLine: 0, endLine: 'n/a' },
              ],
            },
            'not an object',
          ],
        },
        pm: null,
      },
    })
    const analysis = parseAnalysisResponse(messy)
    expect(analysis.confidence).toBe('high')
    expect(analysis.risks).toEqual([])
    expect(analysis.states).toEqual([
      { name: 'Loading', status: 'implemented', description: '', evidence: [] },
    ])
    expect(analysis.nextSteps[0]).toMatchObject({ userImpact: 'medium', required: false })
    const [blocker] = analysis.perspectives.stakeholder.launchBlockers
    expect(analysis.perspectives.stakeholder.launchBlockers).toHaveLength(1)
    expect(blocker?.confidence).toBe('confirmed')
    expect(blocker?.evidence).toEqual([{ file: 'camera-screen.tsx', startLine: 173, endLine: 190 }])
    expect(analysis.perspectives.pm.mvpMustFix).toEqual([])
  })

  it('reads an answer with an unquoted step number like 4a (the camera-flow failure)', () => {
    const broken = `{"featureName":"Camera","summary":"Snap to identify.","confidence":"high","userFlow":[{"step":4,"title":"Open camera","description":"","confidence":"confirmed"},{"step":4a,"title":"Take a photo","description":"","confidence":"confirmed"}]}`
    const analysis = parseAnalysisResponse(broken)
    expect(analysis.featureName).toBe('Camera')
    expect(analysis.summary).toBe('Snap to identify.')
  })

  it('rejects non-JSON responses', () => {
    expect(() => parseAnalysisResponse('I cannot analyze this.')).toThrow(GizmoError)
  })

  it('rejects malformed JSON', () => {
    expect(() => parseAnalysisResponse('{"featureName": ')).toThrow(GizmoError)
  })

  it('rejects JSON that fails schema validation', () => {
    expect(() => parseAnalysisResponse('{"featureName": 42}')).toThrow(GizmoError)
  })
})

describe('extractJson', () => {
  it('extracts the outermost object', () => {
    expect(extractJson('noise {"a": {"b": 1}} trailing')).toBe('{"a": {"b": 1}}')
  })

  it('returns undefined when no object exists', () => {
    expect(extractJson('nothing here')).toBeUndefined()
  })
})

describe('quoteBareValues', () => {
  it('quotes bare words outside strings and keeps real values', () => {
    expect(quoteBareValues('{"a":4a,"b":12,"c":-1.5e3,"d":true,"e":null,"f":[x, 2]}')).toBe(
      '{"a":"4a","b":12,"c":-1.5e3,"d":true,"e":null,"f":["x", 2]}',
    )
  })

  it('never touches text inside strings, including escaped quotes', () => {
    const json = '{"text":"step 4a: tap \\"Save\\" now, ratio 16x9","n":1}'
    expect(quoteBareValues(json)).toBe(json)
    expect(JSON.parse(quoteBareValues(json))).toEqual(JSON.parse(json))
  })
})

describe('parseCombinedSummaryResponse', () => {
  it('reads the cross-area summary and defaults what is missing', () => {
    const summary = parseCombinedSummaryResponse(
      '{"summary":"Camera and settings are built.","nextSteps":[{"title":"Fix the privacy bug","userImpact":"High"}]}',
    )
    expect(summary.summary).toBe('Camera and settings are built.')
    expect(summary.launchGoal).toBe('')
    expect(summary.nextSteps[0]).toMatchObject({ title: 'Fix the privacy bug', userImpact: 'high' })
  })
})
