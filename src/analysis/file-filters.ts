import path from 'path'

export const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'] as const

const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.expo',
  '.turbo',
  '.vercel',
  'coverage',
  '.cache',
  'android',
  'ios',
])

const secretFilePatterns = [
  /^\.env(\..*)?$/i,
  /^.*\.(pem|key|p12|keystore|jks)$/i,
  /credentials/i,
  /secret/i,
]

const binaryExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.pdf',
  '.zip',
  '.gz',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.mp3',
  '.mov',
  '.wasm',
  '.node',
  '.exe',
  '.dll',
  '.dylib',
  '.so',
  '.db',
  '.sqlite',
  '.lock',
])

export function isSupportedSourceFile(filePath: string): boolean {
  const base = path.basename(filePath)
  if (isSecretFile(base)) return false
  const ext = path.extname(filePath).toLowerCase()
  return (supportedExtensions as readonly string[]).includes(ext)
}

export function isSecretFile(fileName: string): boolean {
  return secretFilePatterns.some((pattern) => pattern.test(fileName))
}

export function isBinaryFile(fileName: string): boolean {
  return binaryExtensions.has(path.extname(fileName).toLowerCase())
}

export function isIgnoredDirectory(directoryName: string): boolean {
  return ignoredDirectories.has(directoryName) || directoryName.startsWith('.')
}

export interface GitignoreMatcher {
  isIgnored(relativePath: string): boolean
}

export function createGitignoreMatcher(gitignoreContent: string): GitignoreMatcher {
  const rules = gitignoreContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('!'))
    .map((line) => line.replace(/^\//, '').replace(/\/$/, ''))

  const regexes = rules.map((rule) => {
    const escaped = rule
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§/g, '.*')
      .replace(/\?/g, '[^/]')
    return new RegExp(`(^|/)${escaped}(/|$)`)
  })

  return {
    isIgnored(relativePath: string): boolean {
      const normalized = relativePath.split(path.sep).join('/')
      return regexes.some((regex) => regex.test(normalized))
    },
  }
}

const priorityHints = [
  'index',
  'screen',
  'page',
  'route',
  'view',
  'component',
  'hook',
  'service',
  'store',
  'type',
]

export function filePriority(relativePath: string): number {
  const lower = relativePath.toLowerCase()
  const hintIndex = priorityHints.findIndex((hint) => lower.includes(hint))
  const depth = relativePath.split('/').length
  return (hintIndex === -1 ? priorityHints.length : hintIndex) * 100 + depth
}
