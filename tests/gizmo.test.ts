import { describe, expect, it } from 'vitest'
import {
  bossReplyPrompt,
  buildShareSummary,
  countItems,
  gizmoGreeting,
  gizmoMood,
  pickGizmoVoice,
} from '../webview/src/lib/gizmo'
import { buildFixList, type FixItem, type FixStatus } from '../webview/src/lib/build-fix-list'
import type { ProductAnalysis } from '../src/analysis/schemas'

function item(id: string, level: FixItem['level'], text = id): FixItem {
  return { id, level, kind: 'Test', text, evidence: [], createdBy: 'ai' }
}

function statusFrom(map: Record<string, FixStatus>): (id: string) => FixStatus {
  return (id) => map[id] ?? 'open'
}

const items = [item('a', 1, 'Upload is blank'), item('b', 2, 'No empty state'), item('c', 3)]

describe('countItems', () => {
  it('counts open blockers and other open items, ignoring later and dismissed', () => {
    const counts = countItems(items, statusFrom({ c: 'later' }))
    expect(counts).toEqual({ blocking: 1, alsoToFix: 1, done: 0 })
  })

  it('treats done blockers as no longer blocking', () => {
    const counts = countItems(items, statusFrom({ a: 'done', b: 'dismissed' }))
    expect(counts).toEqual({ blocking: 0, alsoToFix: 1, done: 1 })
  })

  it('handles an empty list', () => {
    expect(countItems([], statusFrom({}))).toEqual({ blocking: 0, alsoToFix: 0, done: 0 })
  })
})

describe('gizmoMood', () => {
  it('is alert while something blocks, happy otherwise', () => {
    expect(gizmoMood({ blocking: 2, alsoToFix: 0, done: 0 })).toBe('alert')
    expect(gizmoMood({ blocking: 0, alsoToFix: 5, done: 0 })).toBe('happy')
  })
})

describe('gizmoGreeting', () => {
  it('leads with blockers and pluralizes correctly', () => {
    const text = gizmoGreeting({
      featureName: 'Capture screen',
      fileCount: 4,
      counts: { blocking: 2, alsoToFix: 1, done: 0 },
    })
    expect(text).toBe(
      'I checked Capture screen (4 files). 2 things will block your launch, plus 1 smaller thing to tidy up. Want to see the blockers?',
    )
  })

  it('says nothing is blocking when only smaller items remain', () => {
    const text = gizmoGreeting({
      featureName: 'Capture screen',
      counts: { blocking: 0, alsoToFix: 1, done: 0 },
    })
    expect(text).toBe(
      'I checked Capture screen. Nothing is blocking your launch. 1 smaller thing is left to tidy up.',
    )
  })

  it('celebrates when the list is clear', () => {
    const text = gizmoGreeting({
      featureName: 'Capture screen',
      fileCount: 1,
      counts: { blocking: 0, alsoToFix: 0, done: 3 },
    })
    expect(text).toContain('(1 file)')
    expect(text).toContain('ready to share')
  })
})

describe('buildShareSummary', () => {
  const analysis = {
    featureName: 'Capture screen',
    summary: 'Users photograph an animal.',
    whatsWorking: [{ text: 'Saving works', confidence: 'confirmed', evidence: [] }],
    nextSteps: [{ title: 'Hide the Upload route', detail: '', evidence: [] }],
    perspectives: { stakeholder: { launchSummary: 'Core flow works end to end.' } },
  } as unknown as ProductAnalysis // only the fields the summary reads

  it('lists blockers, other open items, what works and next steps in plain bullets', () => {
    const text = buildShareSummary({
      areas: [{ label: 'Capture screen', analysis, items }],
      statusOf: statusFrom({}),
    })
    expect(text).toContain('Update: Capture screen')
    expect(text).toContain('Status: Not ready yet: 1 thing blocks the launch')
    expect(text).toContain('Core flow works end to end.')
    expect(text).toContain('Blocking:\n- Upload is blank')
    expect(text).toContain('Still to fix:\n- No empty state')
    expect(text).toContain('Working:\n- Saving works')
    expect(text).toContain('Next:\n- Hide the Upload route')
    expect(text.trimEnd().endsWith('- Hide the Upload route')).toBe(true)
    expect(text).not.toMatch(/gizmo/i)
  })

  it('drops empty sections and reports ready when nothing blocks', () => {
    const text = buildShareSummary({
      areas: [{ label: 'Capture screen', analysis, items }],
      statusOf: statusFrom({ a: 'done', b: 'done', c: 'done' }),
    })
    expect(text).toContain('Status: Ready to ship: nothing is blocking')
    expect(text).not.toContain('Blocking:')
    expect(text).not.toContain('Still to fix:')
  })

  it('names the area on every line and uses the combined summary for several areas', () => {
    const settings = {
      ...analysis,
      featureName: 'Settings',
      whatsWorking: [{ text: 'Profile edits save', confidence: 'confirmed', evidence: [] }],
    } as unknown as ProductAnalysis // only the fields the summary reads
    const text = buildShareSummary({
      areas: [
        { label: 'Capture', analysis, items },
        { label: 'Settings', analysis: settings, items: [] },
      ],
      combined: { summary: 'Both areas mostly work.', launchGoal: '', nextSteps: [] },
      statusOf: statusFrom({}),
    })
    expect(text).toContain('Update: Capture, Settings')
    expect(text).toContain('Both areas mostly work.')
    expect(text).toContain('Blocking:\n- Capture: Upload is blank')
    expect(text).toContain('- Settings: Profile edits save')
  })
})

describe('bossReplyPrompt', () => {
  it('quotes the trimmed message and asks for only the reply', () => {
    const prompt = bossReplyPrompt({ message: '  Can we launch Friday?  ', audience: 'manager' })
    expect(prompt).toContain('"""Can we launch Friday?"""')
    expect(prompt).toContain('Write only the reply itself')
  })

  it('keeps code details out for a boss and in for a CTO', () => {
    expect(bossReplyPrompt({ message: 'Ready?', audience: 'manager' })).toContain(
      'No code terms, file names or line numbers',
    )
    expect(bossReplyPrompt({ message: 'Ready?', audience: 'technical' })).toContain(
      'naming the files involved',
    )
  })
})

describe('pickGizmoVoice', () => {
  const voice = (name: string, lang = 'en-US') => ({ name, lang })

  it('prefers premium Oliver or Jamie, then plain Jamie, then Daniel', () => {
    expect(
      pickGizmoVoice([
        voice('Daniel', 'en-GB'),
        voice('Oliver', 'en-GB'),
        voice('Oliver (Enhanced)', 'en-GB'),
        voice('Jamie (Premium)', 'en-GB'),
      ])?.name,
    ).toBe('Oliver (Enhanced)')
    expect(
      pickGizmoVoice([voice('Daniel', 'en-GB'), voice('Jamie (Premium)', 'en-GB')])?.name,
    ).toBe('Jamie (Premium)')
    expect(pickGizmoVoice([voice('Oliver', 'en-GB'), voice('Jamie', 'en-GB')])?.name).toBe('Jamie')
    expect(pickGizmoVoice([voice('Samantha'), voice('Daniel', 'en-GB')])?.name).toBe('Daniel')
  })

  it('never picks Eddy or the other novelty voices', () => {
    expect(
      pickGizmoVoice([voice('Eddy (English (United States))'), voice('Daniel', 'en-GB')])?.name,
    ).toBe('Daniel')
  })

  it('falls back to any English voice labelled male, and ignores non-English ones', () => {
    expect(pickGizmoVoice([voice('Daniel', 'fr-FR'), voice('Some Male Voice')])?.name).toBe(
      'Some Male Voice',
    )
  })

  it('returns undefined when no suitable voice exists, so the system default is used', () => {
    expect(pickGizmoVoice([voice('Samantha'), voice('Karen', 'en-AU')])).toBeUndefined()
    expect(pickGizmoVoice([])).toBeUndefined()
  })
})

describe('buildFixList', () => {
  const finding = (text: string) => ({ text, confidence: 'confirmed' as const, evidence: [] })

  it('keeps one copy of an issue listed under several headings, at its most serious level', () => {
    const analysis = {
      perspectives: {
        stakeholder: { launchBlockers: [finding('Upload is blank')] },
        pm: { mvpMustFix: [finding('upload is  blank'), finding('No empty state')] },
        designer: { designSystem: [] },
      },
      missingStates: [],
      uxConcerns: [],
      technicalNotes: [],
      risks: [],
      openQuestions: [],
    } as unknown as ProductAnalysis // only the fields buildFixList reads
    const items = buildFixList(analysis, 'camera')
    expect(items.map((item) => [item.level, item.text])).toEqual([
      [1, 'Upload is blank'],
      [2, 'No empty state'],
    ])
    expect(items.every((item) => item.id.startsWith('camera:'))).toBe(true)
  })

  it('gives two findings on the same line different ids', () => {
    const sameLine = { file: 'a.tsx', startLine: 10, endLine: 12 }
    const analysis = {
      perspectives: {
        stakeholder: { launchBlockers: [] },
        pm: { mvpMustFix: [] },
        designer: { designSystem: [] },
      },
      missingStates: [],
      uxConcerns: [
        { text: 'Button too small', confidence: 'confirmed', evidence: [sameLine] },
        { text: 'Label unclear', confidence: 'confirmed', evidence: [sameLine] },
      ],
      technicalNotes: [],
      risks: [],
      openQuestions: [],
    } as unknown as ProductAnalysis // only the fields buildFixList reads
    const ids = buildFixList(analysis, 'camera').map((item) => item.id)
    expect(new Set(ids).size).toBe(2)
  })
})
