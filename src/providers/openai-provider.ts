import { z } from 'zod'
import { analysisSystemPrompt } from '../analysis/prompt-builder'
import { PromptProvider, type Completion } from './prompt-provider'
import { knownError, type GizmoError } from '../utilities/errors'
import type { Logger } from '../services/logger'
import { estimateCostUsd } from './pricing'

export interface OpenAIProviderOptions {
  getApiKey: () => Promise<string | undefined>
  getModel: () => string
  logger: Logger
  onCost?: (usd: number) => void
  fetchFn?: typeof fetch
}

// A fixed address: nothing in the user's shell can reroute the code or the key elsewhere.
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
// Reasoning counts toward this limit, so leave the same room Claude gets.
const maxOutputTokens = 64000

export class OpenAIProvider extends PromptProvider {
  readonly name = 'openai'

  constructor(private readonly options: OpenAIProviderOptions) {
    super()
  }

  protected async complete(userPrompt: string): Promise<Completion> {
    const apiKey = await this.options.getApiKey()
    if (!apiKey) throw knownError('api-key-missing')

    const model = this.options.getModel()
    const startedAt = Date.now()
    const fetchFn = this.options.fetchFn ?? fetch

    let response: Response
    try {
      response = await fetchFn(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          instructions: analysisSystemPrompt,
          input: userPrompt,
          max_output_tokens: maxOutputTokens,
          reasoning: { effort: 'medium' },
          // OpenAI keeps no copy of the answer for later retrieval.
          store: false,
          // Streaming keeps the connection alive while the model thinks through a long scan.
          stream: true,
        }),
      })
    } catch {
      throw knownError('network')
    }

    if (!response.ok) throw this.mapHttpError(response.status, await readErrorBody(response))

    const final = await readFinalResponse(response)
    if (!final) throw knownError('invalid-response', 'The response ended early.')

    const inputTokens = final.usage?.input_tokens ?? 0
    const outputTokens = final.usage?.output_tokens ?? 0
    this.options.logger.info(
      `request completed in ${Date.now() - startedAt}ms (model=${final.model} input=${inputTokens} output=${outputTokens} status=${final.status})`,
    )
    const usage = { inputTokens, outputTokens }
    const costUsd = estimateCostUsd(final.model, usage) ?? estimateCostUsd(model, usage)
    if (costUsd !== undefined) this.options.onCost?.(costUsd)

    if (final.status === 'failed') throw this.mapStreamError(final.error)
    const content = final.output.flatMap((item) => item.content ?? [])
    if (content.some((part) => part.type === 'refusal')) throw knownError('refused')
    const text = content
      .filter((part) => part.type === 'output_text')
      .map((part) => part.text ?? '')
      .join('\n')
    if (text.trim().length === 0) throw knownError('invalid-response', 'The response was empty.')
    return { text, costUsd }
  }

  private mapHttpError(status: number, body: ErrorBody | undefined): GizmoError {
    const code = body?.error?.code ?? ''
    const type = body?.error?.type ?? ''
    const message = (body?.error?.message ?? '').toLowerCase()
    if (status === 401 || status === 403) return knownError('auth-failed')
    if (status === 429) {
      if (isOutOfCredit(code, type)) return knownError('no-credit')
      return knownError('rate-limited')
    }
    if (status === 400) {
      if (code === 'context_length_exceeded' || message.includes('context length'))
        return knownError('context-too-large')
      // OpenAI's validation message describes the request shape, never the code sent.
      this.options.logger.error(
        `provider rejected request (bad request): ${(body?.error?.message ?? '').slice(0, 400)}`,
      )
      return knownError('unknown')
    }
    this.options.logger.error(`provider error status=${String(status)}`)
    if (status >= 500) return knownError('busy')
    return knownError('unknown', 'The AI provider returned an error.')
  }

  private mapStreamError(error: StreamError | null | undefined): GizmoError {
    const code = error?.code ?? ''
    this.options.logger.error(`provider stream failed code=${code}`)
    if (isOutOfCredit(code, '')) return knownError('no-credit')
    if (code === 'rate_limit_exceeded') return knownError('rate-limited')
    if (code === 'server_error') return knownError('busy')
    return knownError('unknown', 'The AI provider returned an error.')
  }
}

function isOutOfCredit(code: string, type: string): boolean {
  return type === 'insufficient_quota' || outOfCreditCodes.includes(code)
}

async function readErrorBody(response: Response): Promise<ErrorBody | undefined> {
  const parsed = errorBodySchema.safeParse(await response.json().catch(() => undefined))
  return parsed.success ? parsed.data : undefined
}

// Reads the server-sent events and returns the finished response object, which arrives last.
async function readFinalResponse(response: Response): Promise<FinalResponse | undefined> {
  if (!response.body) return undefined
  const decoder = new TextDecoder()
  let buffer = ''
  let final: FinalResponse | undefined
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) final = finalFromEvent(event) ?? final
  }
  return finalFromEvent(buffer) ?? final
}

export function finalFromEvent(event: string): FinalResponse | undefined {
  const data = event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('')
  if (data.length === 0 || data === '[DONE]') return undefined
  let json: unknown
  try {
    json = JSON.parse(data)
  } catch {
    return undefined
  }
  const parsed = finishedEventSchema.safeParse(json)
  return parsed.success ? parsed.data.response : undefined
}

// From OpenAI's error-codes guide: an empty balance or a spending cap the user set.
const outOfCreditCodes = [
  'insufficient_quota',
  'credit_balance_exhausted',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
]

const streamErrorSchema = z.object({ code: z.string().nullish(), message: z.string().nullish() })

const finalResponseSchema = z.object({
  model: z.string(),
  status: z.enum(['completed', 'incomplete', 'failed']),
  error: streamErrorSchema.nullish(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }).loose())
        .optional(),
    }),
  ),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).nullish(),
})

const finishedEventSchema = z.object({
  type: z.enum(['response.completed', 'response.incomplete', 'response.failed']),
  response: finalResponseSchema,
})

const errorBodySchema = z.object({
  error: z
    .object({
      message: z.string().nullish(),
      type: z.string().nullish(),
      code: z.string().nullish(),
    })
    .nullish(),
})

type FinalResponse = z.infer<typeof finalResponseSchema>
type StreamError = z.infer<typeof streamErrorSchema>
type ErrorBody = z.infer<typeof errorBodySchema>
