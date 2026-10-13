import { describe, expect, it } from 'vitest'
import { extractJson, parseAnalysisResponse } from '../src/analysis/response-parser'
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
    expect(analysis.primaryActions[0]?.evidence[0]?.startLine).toBe(10)
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
    expect(analysis.completionStatus).toBe('in-progress')
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
