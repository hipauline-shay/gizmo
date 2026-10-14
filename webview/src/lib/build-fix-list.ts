import type { Evidence, Finding, ProductAnalysis } from '../types/panel'

export type FixLevel = 1 | 2 | 3 | 4
export type FixStatus = 'open' | 'later' | 'done' | 'dismissed'
export type ItemSource = 'ai' | 'pm' | 'designer' | 'stakeholder'

export interface FixItem {
  id: string
  level: FixLevel
  kind: string
  text: string
  description?: string
  evidence: Evidence[]
  createdBy: ItemSource
  requestedFor?: ItemSource
}

// Ids are prefixed with the area so two areas never share an item's done/dismissed status.
export function buildFixList(analysis: ProductAnalysis, areaId: string): FixItem[] {
  const sources: { level: FixLevel; kind: string; findings: Finding[] }[] = [
    {
      level: 1,
      kind: 'Launch blocker',
      findings: analysis.perspectives.stakeholder.launchBlockers,
    },
    { level: 2, kind: 'MVP must-fix', findings: analysis.perspectives.pm.mvpMustFix },
    { level: 2, kind: 'Missing state', findings: analysis.missingStates },
    { level: 3, kind: 'Design system', findings: analysis.perspectives.designer.designSystem },
    { level: 3, kind: 'UX concern', findings: analysis.uxConcerns },
    { level: 3, kind: 'Technical note', findings: analysis.technicalNotes },
    { level: 4, kind: 'Needs a decision', findings: analysis.risks },
    { level: 4, kind: 'Question', findings: analysis.openQuestions },
  ]

  const items = sources.flatMap(({ level, kind, findings }, sourceIndex) =>
    findings.map((finding, index) => ({
      id: `${areaId}:${stableAiId(kind, finding, sourceIndex, index)}`,
      level,
      kind,
      text: finding.text,
      evidence: finding.evidence,
      createdBy: 'ai' as const,
    })),
  )
  return uniqueIds(dedupeByText(items))
}

// Two different findings of one kind can cite the same line; a suffix keeps their ids apart.
function uniqueIds(items: FixItem[]): FixItem[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const count = seen.get(item.id) ?? 0
    seen.set(item.id, count + 1)
    return count === 0 ? item : { ...item, id: `${item.id}#${count + 1}` }
  })
}

// The AI often lists the same issue under several headings (e.g. as a launch blocker and
// an MVP must-fix). Sources are ordered most serious first, so the first copy wins.
function dedupeByText(items: FixItem[]): FixItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.text.trim().toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Keyed by the code location a finding points at (not array position), so the same
// underlying issue keeps its id — and its dismissed/later/done status — across a rescan.
function stableAiId(kind: string, finding: Finding, sourceIndex: number, index: number): string {
  const evidence = finding.evidence[0]
  if (evidence) return `ai:${kind}:${evidence.file}:${evidence.startLine}`
  return `ai:${kind}:${sourceIndex}:${index}:${finding.text}`
}

export const LEVEL_LABEL: Record<FixLevel, string> = {
  1: 'Blocking',
  2: 'Should fix',
  3: 'Polish',
  4: 'Pause',
}

export const SOURCE_LABEL: Record<ItemSource, string> = {
  ai: 'AI Assistant',
  pm: 'Product Manager',
  designer: 'Designer',
  stakeholder: 'Stakeholder',
}
