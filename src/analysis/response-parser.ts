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

  const parsed = parseJson(jsonText)

  const result = productAnalysisSchema.safeParse(parsed)
  if (!result.success)
    throw knownError('invalid-response', 'The response did not match the expected structure.')
  return result.data
}

export function parseGapAnalysisResponse(rawText: string): GapAnalysis {
  const jsonText = extractJson(rawText)
  if (!jsonText) throw knownError('invalid-response', 'No JSON object was found in the response.')

  const parsed = parseJson(jsonText)

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

function parseJson(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText)
  } catch {
    // A 40k-character answer can be lost to one unquoted value such as "step": 4a.
    try {
      return JSON.parse(quoteBareValues(jsonText))
    } catch {
      throw knownError('invalid-response', 'The response was not valid JSON.')
    }
  }
}

// Wraps bare words outside strings (4a, maybe) in quotes; keeps numbers, true, false, null.
export function quoteBareValues(jsonText: string): string {
  const bareToken = /[A-Za-z0-9_.+-]+/y
  let output = ''
  let isInString = false
  let index = 0
  while (index < jsonText.length) {
    const char = jsonText.charAt(index)
    if (isInString) {
      output += char
      if (char === '\\') {
        output += jsonText.charAt(index + 1)
        index += 2
        continue
      }
      if (char === '"') isInString = false
      index += 1
      continue
    }
    if (char === '"') {
      isInString = true
      output += char
      index += 1
      continue
    }
    bareToken.lastIndex = index
    const token = bareToken.exec(jsonText)?.[0]
    if (!token) {
      output += char
      index += 1
      continue
    }
    output += isJsonLiteral(token) ? token : JSON.stringify(token)
    index += token.length
  }
  return output
}

function isJsonLiteral(token: string): boolean {
  return ['true', 'false', 'null'].includes(token) || /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)
}
