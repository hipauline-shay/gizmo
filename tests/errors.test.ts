import { describe, expect, it } from 'vitest'
import { GizmoError, knownError, toErrorInfo } from '../src/utilities/errors'

describe('knownError', () => {
  it('gives every first-run failure a plain message and a next step', () => {
    for (const code of [
      'api-key-missing',
      'auth-failed',
      'no-credit',
      'busy',
      'refused',
    ] as const) {
      const error = knownError(code)
      expect(error).toBeInstanceOf(GizmoError)
      expect(error.message.length).toBeGreaterThan(10)
      expect(error.action.length).toBeGreaterThan(10)
      expect(toErrorInfo(error)).toEqual({ code, message: error.message, action: error.action })
    }
  })

  it('points a user with no credit to the Anthropic console', () => {
    expect(knownError('no-credit').action).toContain('console.anthropic.com')
  })
})
