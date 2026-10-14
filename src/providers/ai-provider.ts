import type { AnalysisContext, FollowUpAnswer } from '../analysis/types'
import type { CombinedSummary, GapAnalysis, ProductAnalysis } from '../analysis/schemas'
import type { PromptArea } from '../analysis/prompt-builder'

// A result plus what that one request cost, so overlapping requests never blur each other's price.
export interface Priced<Result> {
  result: Result
  costUsd?: number
}

export interface AIProvider {
  readonly name: string
  analyze(context: AnalysisContext): Promise<Priced<ProductAnalysis>>
  askFollowUp(areas: PromptArea[], question: string): Promise<FollowUpAnswer>
  summarizeAreas(areas: Pick<PromptArea, 'label' | 'analysis'>[]): Promise<Priced<CombinedSummary>>
  compareToSpec(
    context: AnalysisContext,
    analysis: ProductAnalysis,
    spec: string,
  ): Promise<GapAnalysis>
}
