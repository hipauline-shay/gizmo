import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider } from './ai-provider'
import type { AnalysisContext, FollowUpAnswer } from '../analysis/types'
import type { CombinedSummary, GapAnalysis, ProductAnalysis } from '../analysis/schemas'
import {
  analysisSystemPrompt,
  buildAnalysisPrompt,
  buildCombinedSummaryPrompt,
  buildFollowUpPrompt,
  buildSpecComparisonPrompt,
  type PromptArea,
} from '../analysis/prompt-builder'
import {
  parseAnalysisResponse,
  parseCombinedSummaryResponse,
  parseGapAnalysisResponse,
} from '../analysis/response-parser'
import { knownError, GizmoError } from '../utilities/errors'
import type { Logger } from '../services/logger'
import { estimateCostUsd } from './pricing'

export interface AnthropicProviderOptions {
  getApiKey: () => Promise<string | undefined>
  getModel: () => string
  logger: Logger
  onCost?: (usd: number) => void
}

// Thinking is always on for Opus 5.5 and counts toward max_tokens, so leave room for it.
const maxOutputTokens = 64000
const ANTHROPIC_API_URL = 'https://api.anthropic.com'

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'

  constructor(private readonly options: AnthropicProviderOptions) {}

  async analyze(context: AnalysisContext): Promise<ProductAnalysis> {
    const text = await this.complete(buildAnalysisPrompt(context))
    return parseAnalysisResponse(text)
  }

  async askFollowUp(areas: PromptArea[], question: string): Promise<FollowUpAnswer> {
    const text = await this.complete(buildFollowUpPrompt({ areas, question }))
    return { answer: text.trim() }
  }

  async summarizeAreas(areas: Pick<PromptArea, 'label' | 'analysis'>[]): Promise<CombinedSummary> {
    const text = await this.complete(buildCombinedSummaryPrompt(areas))
    return parseCombinedSummaryResponse(text)
  }

  async compareToSpec(
    context: AnalysisContext,
    analysis: ProductAnalysis,
    spec: string,
  ): Promise<GapAnalysis> {
    const text = await this.complete(buildSpecComparisonPrompt(context, analysis, spec))
    return parseGapAnalysisResponse(text)
  }

  private async complete(userPrompt: string): Promise<string> {
    const apiKey = await this.options.getApiKey()
    if (!apiKey) throw knownError('api-key-missing')

    // Explicit destination and credentials: the SDK would otherwise honor ANTHROPIC_BASE_URL
    // and ANTHROPIC_AUTH_TOKEN from the user's shell, which could silently reroute code and key.
    const client = new Anthropic({ apiKey, authToken: null, baseURL: ANTHROPIC_API_URL })
    const model = this.options.getModel()
    const startedAt = Date.now()

    const request = {
      model,
      max_tokens: maxOutputTokens,
      output_config: { effort: 'medium' as const },
      system: analysisSystemPrompt,
      messages: [{ role: 'user' as const, content: userPrompt }],
    }
    const withFallbacks = supportsDefaultFallbacks(model)
      ? { ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : request

    try {
      let message: Anthropic.Beta.BetaMessage
      try {
        message = await client.beta.messages.stream(withFallbacks).finalMessage()
      } catch (error) {
        // If this account or region doesn't accept the fallback option yet, run without it
        // rather than failing the scan. The rejection happens before any tokens are billed.
        if (withFallbacks === request || !isFallbackRejection(error)) throw error
        this.options.logger.info('fallback option not accepted; retrying without it')
        message = await client.beta.messages.stream(request).finalMessage()
      }
      const { input_tokens: inputTokens, output_tokens: outputTokens } = message.usage
      this.options.logger.info(
        `request completed in ${Date.now() - startedAt}ms (model=${message.model} input=${inputTokens} output=${outputTokens} stop=${message.stop_reason})`,
      )
      const costUsd = estimateCostUsd(message.model, { inputTokens, outputTokens })
      if (costUsd !== undefined) this.options.onCost?.(costUsd)
      if (message.stop_reason === 'refusal') throw knownError('refused')
      const text = message.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
      if (text.trim().length === 0) throw knownError('invalid-response', 'The response was empty.')
      return text
    } catch (error) {
      throw this.mapError(error)
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof GizmoError) return error
    if (error instanceof Anthropic.AuthenticationError) return knownError('auth-failed')
    if (error instanceof Anthropic.PermissionDeniedError) return knownError('auth-failed')
    if (error instanceof Anthropic.RateLimitError) return knownError('rate-limited')
    if (error instanceof Anthropic.BadRequestError) {
      const message = error.message.toLowerCase()
      if (message.includes('credit') || message.includes('billing')) return knownError('no-credit')
      if (message.includes('token') || message.includes('too long') || message.includes('exceed'))
        return knownError('context-too-large')
      // Anthropic's validation message describes the request shape, never the code sent.
      this.options.logger.error(
        `provider rejected request (bad request): ${error.message.slice(0, 400)}`,
      )
      return knownError('unknown')
    }
    if (error instanceof Anthropic.APIConnectionError) return knownError('network')
    if (error instanceof Anthropic.APIError) {
      this.options.logger.error(`provider error status=${String(error.status)}`)
      if (error.status === 529 || error.status === 503) return knownError('busy')
      return knownError('unknown', 'The AI provider returned an error.')
    }
    return error instanceof Error ? error : new Error(String(error))
  }
}

// If Claude's safety check declines a request, these models can re-run it on Anthropic's
// recommended fallback model instead of failing. Other models don't accept the parameter.
function supportsDefaultFallbacks(model: string): boolean {
  return ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'].includes(
    model,
  )
}

function isFallbackRejection(error: unknown): boolean {
  if (!(error instanceof Anthropic.BadRequestError)) return false
  const message = error.message.toLowerCase()
  return message.includes('fallback') || message.includes('beta')
}
