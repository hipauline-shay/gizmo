import type { FixLevel } from './build-fix-list'

export const TAG_GROUPS: { level: FixLevel; label: string; kinds: string[] }[] = [
  { level: 1, label: 'Blocking', kinds: ['Dead End', 'Broken', "Doesn't Exist"] },
  { level: 2, label: 'Should Fix', kinds: ['Missing State', 'Misleading'] },
  { level: 3, label: 'Polish', kinds: ['Iteration', 'Cleanup', 'Design System'] },
  { level: 4, label: 'Pause', kinds: ['Review', 'Question'] },
]

export function levelForKind(kind: string): FixLevel {
  for (const group of TAG_GROUPS) {
    if (group.kinds.includes(kind)) return group.level
  }
  return 2
}
