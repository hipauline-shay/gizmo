import type { AnalysisContext, FollowUpAnswer } from '../analysis/types'
import type { GapAnalysis, ProductAnalysis } from '../analysis/schemas'

export interface AIProvider {
  readonly name: string
  analyze(context: AnalysisContext): Promise<ProductAnalysis>
  askFollowUp(
    context: AnalysisContext,
    analysis: ProductAnalysis,
    question: string,
  ): Promise<FollowUpAnswer>
  compareToSpec(
    context: AnalysisContext,
    analysis: ProductAnalysis,
    spec: string,
  ): Promise<GapAnalysis>
}
