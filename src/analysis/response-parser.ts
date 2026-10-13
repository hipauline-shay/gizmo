import {
  gapAnalysisSchema,
  productAnalysisSchema,
  type GapAnalysis,
  type ProductAnalysis,
} from './schemas'
import { knownError } from '../utilities/errors'

export function parseAnalysisResponse(rawText: string): ProductAnalysis {
  const jsonText = extractJson(rawText)
  if (!jsonText) throw knownError('invalid-response', 'No JSON object was found in the response.')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw knownError('invalid-response', 'The response was not valid JSON.')
  }

  const result = productAnalysisSchema.safeParse(parsed)
  if (!result.success)
    throw knownError('invalid-response', 'The response did not match the expected structure.')
  return result.data
}

export function parseGapAnalysisResponse(rawText: string): GapAnalysis {
  const jsonText = extractJson(rawText)
  if (!jsonText) throw knownError('invalid-response', 'No JSON object was found in the response.')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw knownError('invalid-response', 'The response was not valid JSON.')
  }

  const result = gapAnalysisSchema.safeParse(parsed)
  if (!result.success)
    throw knownError('invalid-response', 'The response did not match the expected structure.')
  return result.data
}

export function extractJson(text: string): string | undefined {
  const trimmed = text.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  const candidate = fenced?.[1]?.trim() ?? trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return undefined
  return candidate.slice(start, end + 1)
}
