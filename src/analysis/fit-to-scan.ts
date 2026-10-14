import fs from 'fs/promises'
import path from 'path'
import type { ContextLimits } from '../utilities/limits'

// When Gizmo picks the files itself (a question, a chip, "What I changed this week"), it keeps
// them in order and stops before they outgrow one scan, so a tap never ends in "too big".
// The first file always stays: a single large file is trimmed by the collector instead.
export async function fitToScan({
  rootPath,
  relativePaths,
  limits,
}: {
  rootPath: string
  relativePaths: string[]
  limits: Pick<ContextLimits, 'maxFiles' | 'maxTotalChars'>
}): Promise<string[]> {
  const fitted: string[] = []
  let totalSize = 0
  for (const relativePath of relativePaths) {
    if (fitted.length >= limits.maxFiles) break
    const stat = await fs.stat(path.join(rootPath, relativePath)).catch(() => undefined)
    const size = stat?.size ?? 0
    if (fitted.length > 0 && totalSize + size > limits.maxTotalChars) continue
    fitted.push(relativePath)
    totalSize += size
  }
  return fitted
}
