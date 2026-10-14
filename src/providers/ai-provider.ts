import type { AnalysisContext, FollowUpAnswer } from '../analysis/types'
import type { CombinedSummary, GapAnalysis, ProductAnalysis } from '../analysis/schemas'
import type { PromptArea } from '../analysis/prompt-builder'

export interface AIProvider {
  readonly name: string
  analyze(context: AnalysisContext): Promise<ProductAnalysis>
  askFollowUp(areas: PromptArea[], question: string): Promise<FollowUpAnswer>
  summarizeAreas(areas: Pick<PromptArea, 'label' | 'analysis'>[]): Promise<CombinedSummary>
  compareToSpec(
    context: AnalysisContext,
    analysis: ProductAnalysis,
    spec: string,
  ): Promise<GapAnalysis>
}
