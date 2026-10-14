import { z } from 'zod'

// The model's answer has hundreds of fields. One slip (a "173" instead of 173, "Confirmed"
// instead of "confirmed", a null list) must not throw away the whole scan, so every field is
// repaired or defaulted, and a malformed list item is dropped instead of failing the analysis.
// Only featureName and summary are strictly required.

export const evidenceSchema = z.object({
  file: z.string(),
  startLine: z.coerce.number().int().min(1),
  endLine: z.coerce.number().int().min(1),
})

export const confidenceSchema = lenientEnum(['confirmed', 'likely', 'unclear', 'team'], 'unclear')

const evidenceList = lenientList(evidenceSchema)

export const uxStateSchema = z.object({
  name: z.string(),
  status: lenientEnum(['implemented', 'partial', 'missing', 'unclear'], 'unclear'),
  description: lenientText(),
  evidence: evidenceList,
})

export const findingSchema = z.object({
  text: z.string(),
  confidence: confidenceSchema,
  evidence: evidenceList,
})

const findingList = lenientList(findingSchema)

export const designerPerspectiveSchema = z.object({
  designSystem: findingList,
})

export const pmPerspectiveSchema = z.object({
  mvpMustFix: findingList,
})

export const stakeholderPerspectiveSchema = z.object({
  launchSummary: lenientText(),
  launchGoal: lenientText(),
  launchBlockers: findingList,
})

export const perspectivesSchema = z.object({
  designer: lenientObject(designerPerspectiveSchema),
  pm: lenientObject(pmPerspectiveSchema),
  stakeholder: lenientObject(stakeholderPerspectiveSchema),
})

export const nextStepSchema = z.object({
  title: z.string(),
  detail: lenientText(),
  userImpact: lenientEnum(['high', 'medium', 'low'], 'medium'),
  effort: lenientEnum(['low', 'medium', 'high'], 'medium'),
  required: z.boolean().catch(false),
  evidence: evidenceList,
})

export const productAnalysisSchema = z.object({
  featureName: z.string(),
  summary: z.string(),
  confidence: lenientEnum(['high', 'medium', 'low'], 'medium'),
  whatsWorking: findingList,
  states: lenientList(uxStateSchema),
  risks: findingList,
  uxConcerns: findingList,
  missingStates: findingList,
  openQuestions: findingList,
  technicalNotes: findingList,
  nextSteps: lenientList(nextStepSchema),
  perspectives: lenientObject(perspectivesSchema),
})

// The cross-area summary Gizmo writes after a second area is added (findings only, no code).
export const combinedSummarySchema = z.object({
  summary: z.string(),
  launchGoal: lenientText(),
  nextSteps: lenientList(nextStepSchema),
})

export const gapItemSchema = z.object({
  requirement: z.string(),
  // No safe fallback: guessing "partial" would mislabel a requirement, so an unknown status
  // drops that one item instead.
  status: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['built', 'partial', 'missing', 'not-specified']),
  ),
  explanation: lenientText(),
  evidence: evidenceList,
})

export const gapAnalysisSchema = z.object({
  summary: z.string(),
  items: lenientList(gapItemSchema),
})

function lenientEnum<const Values extends readonly [string, ...string[]]>(
  values: Values,
  fallback: Values[number],
) {
  return z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
      z.enum(values),
    )
    .catch(fallback)
}

function lenientText() {
  return z.preprocess((value) => value ?? undefined, z.string().default('')).catch('')
}

function lenientList<Item extends z.ZodType>(item: Item) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((values) =>
      values.flatMap((value): z.output<Item>[] => {
        const parsed = item.safeParse(value)
        return parsed.success ? [parsed.data] : []
      }),
    )
}

function lenientObject<Shape extends z.ZodObject>(schema: Shape) {
  return z.preprocess((value) => (typeof value === 'object' && value !== null ? value : {}), schema)
}

export type NextStep = z.infer<typeof nextStepSchema>
export type Perspectives = z.infer<typeof perspectivesSchema>
export type GapItem = z.infer<typeof gapItemSchema>
export type GapAnalysis = z.infer<typeof gapAnalysisSchema>
export type CombinedSummary = z.infer<typeof combinedSummarySchema>
export type ProductAnalysis = z.infer<typeof productAnalysisSchema>
export type Evidence = z.infer<typeof evidenceSchema>
export type UxState = z.infer<typeof uxStateSchema>
export type Finding = z.infer<typeof findingSchema>
export type Confidence = z.infer<typeof confidenceSchema>
