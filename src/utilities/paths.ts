import path from 'path'

export function toRelative(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).split(path.sep).join('/')
}

export function isInsideRoot(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath))
  if (relative === '') return true
  if (path.isAbsolute(relative)) return false
  return relative.split(path.sep)[0] !== '..'
}

export function resolveInsideRoot(rootPath: string, relativePath: string): string | undefined {
  const absolute = path.resolve(rootPath, relativePath)
  return isInsideRoot(rootPath, absolute) ? absolute : undefined
}
