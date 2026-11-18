import type { AIProvider, Priced } from './ai-provider'
import type { AnalysisContext, FollowUpAnswer } from '../analysis/types'
import type { CombinedSummary, GapAnalysis, ProductAnalysis } from '../analysis/schemas'
import {
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

export interface Completion {
  text: string
  costUsd?: number
}

// Every provider asks the same prompts and reads the same answers; only the request differs.
export abstract class PromptProvider implements AIProvider {
  abstract readonly name: string

  protected abstract complete(userPrompt: string): Promise<Completion>

  async analyze(context: AnalysisContext): Promise<Priced<ProductAnalysis>> {
    const { text, costUsd } = await this.complete(buildAnalysisPrompt(context))
    return { result: parseAnalysisResponse(text), costUsd }
  }

  async askFollowUp(areas: PromptArea[], question: string): Promise<FollowUpAnswer> {
    const { text } = await this.complete(buildFollowUpPrompt({ areas, question }))
    return { answer: text.trim() }
  }

  async summarizeAreas(
    areas: Pick<PromptArea, 'label' | 'analysis'>[],
  ): Promise<Priced<CombinedSummary>> {
    const { text, costUsd } = await this.complete(buildCombinedSummaryPrompt(areas))
    return { result: parseCombinedSummaryResponse(text), costUsd }
  }

  async compareToSpec(
    context: AnalysisContext,
    analysis: ProductAnalysis,
    spec: string,
  ): Promise<GapAnalysis> {
    const { text } = await this.complete(buildSpecComparisonPrompt(context, analysis, spec))
    return parseGapAnalysisResponse(text)
  }
}
