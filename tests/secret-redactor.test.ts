import { describe, expect, it } from 'vitest'
import { REDACTED, countRedactions, redactSecrets } from '../src/analysis/secret-redactor'
import { isInsideRoot, resolveInsideRoot } from '../src/utilities/paths'

describe('redactSecrets', () => {
  it('masks well-known key formats wherever they appear', () => {
    const source = [
      // Fake keys below, each split so GitHub's secret scanner doesn't flag the repo.
      `const anthropic = '${'sk-ant-'}api03-abcdefghijklmnopqrstuvwxyz0123456789'`,
      `headers.Authorization = \`Bearer ${'sk-proj-'}abcdefghijklmnopqrstuvwxyz0123\``,
      `stripe('${'sk_live_'}abcdefghijklmnop')`,
      `accessKeyId: "${'AKIA'}IOSFODNN7EXAMPLE"`,
      `key=${'AIza'}SyA-1234567890abcdefghijklmnopqrstu`,
      `token: "${'ghp_'}abcdefghijklmnopqrstuvwxyz0123456789"`,
      `slack: "${'xoxb-'}1234567890-abcdefghij"`,
      'const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijklmnop"',
    ].join('\n')
    const result = redactSecrets(source)
    for (const leaked of [
      'sk-ant-',
      'sk-proj-',
      'sk_live_',
      'AKIA',
      'AIza',
      'ghp_',
      'xoxb-',
      'eyJ',
    ])
      expect(result).not.toContain(leaked)
    expect(result.match(/\[REDACTED\]/g)).toHaveLength(8)
  })

  it('masks private key blocks and quoted secret assignments', () => {
    const source = [
      '-----BEGIN RSA PRIVATE KEY-----',
      'MIIEowIBAAKCAQEA',
      '-----END RSA PRIVATE KEY-----',
      'const apiKey = "abc123def456ghi"',
      "SUPABASE_SERVICE_ROLE_SECRET: 'verysecretvalue99'",
      'password: `hunter2hunter2`',
    ].join('\n')
    const result = redactSecrets(source)
    expect(result).not.toContain('MIIEowIBAAKCAQEA')
    expect(result).not.toContain('abc123def456ghi')
    expect(result).not.toContain('verysecretvalue99')
    expect(result).not.toContain('hunter2hunter2')
    expect(result).toContain(`const apiKey = "${REDACTED}"`)
  })

  it('leaves ordinary code and UI copy alone', () => {
    const source = [
      "const [password, setPassword] = useState('')",
      'errors.password = "Password must be at least 8 characters"',
      "import { apiKey } from './config'",
      'const token = await getToken()',
      'const short = "abc"',
    ].join('\n')
    expect(redactSecrets(source)).toBe(source)
  })

  it('masks long random-looking strings even in formats it does not know', () => {
    const source = [
      'const aws = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
      "const unknownVendor = 'Q7mZ2pL9vX4kR8nT1bW6yH3cJ5dF0gA2sE'",
      'const hash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"',
    ].join('\n')
    const result = redactSecrets(source)
    expect(result).not.toContain('wJalrXUtnFEMI')
    expect(result).not.toContain('Q7mZ2pL9vX4k')
    expect(result).not.toContain('9f86d081884c')
    expect(result.match(/\[REDACTED\]/g)).toHaveLength(3)
  })

  it('keeps ids, paths, URLs and readable names that merely contain digits', () => {
    const source = [
      'id: "550e8400-e29b-41d4-a716-446655440000"',
      "import x from './components/patient-card-v2'",
      'const url = "https://api.example.com/v1/users/12345/profile"',
      'const testId = "patientCardHeaderTitle2024"',
      'const label = "Loading your dashboard, step 2 of 3"',
    ].join('\n')
    expect(redactSecrets(source)).toBe(source)
  })

  it('handles empty input', () => {
    expect(redactSecrets('')).toBe('')
  })

  it('counts how many strings were masked, ignoring pre-existing placeholders', () => {
    const original = `a = "${'sk_live_'}abcdefghijklmnop"\nnote = "[REDACTED]"`
    expect(countRedactions(original, redactSecrets(original))).toBe(1)
    expect(countRedactions('x', 'x')).toBe(0)
  })
})

describe('isInsideRoot', () => {
  it('accepts the root itself and anything below it', () => {
    expect(isInsideRoot('/a/proj', '/a/proj')).toBe(true)
    expect(isInsideRoot('/a/proj', '/a/proj/src/x.ts')).toBe(true)
    expect(isInsideRoot('/a/proj', '/a/proj/src/../src/x.ts')).toBe(true)
  })

  it('rejects paths that climb out, including sibling folders sharing a prefix', () => {
    expect(isInsideRoot('/a/proj', '/a/proj/../other/x.ts')).toBe(false)
    expect(isInsideRoot('/a/proj', '/a/project2/x.ts')).toBe(false)
    expect(isInsideRoot('/a/proj', '/etc/passwd')).toBe(false)
  })

  it('resolves relative paths only when they stay inside', () => {
    expect(resolveInsideRoot('/a/proj', 'src/x.ts')).toBe('/a/proj/src/x.ts')
    expect(resolveInsideRoot('/a/proj', '../leak.ts')).toBeUndefined()
    expect(resolveInsideRoot('/a/proj', '/etc/passwd')).toBeUndefined()
  })
})
