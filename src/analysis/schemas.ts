import { z } from 'zod'

export const evidenceSchema = z.object({
  file: z.string(),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
})

export const confidenceSchema = z.enum(['confirmed', 'likely', 'unclear', 'team'])

const evidenceList = z.array(evidenceSchema).default([])

export const primaryActionSchema = z.object({
  label: z.string(),
  behavior: z.string(),
  evidence: evidenceList,
})

export const userFlowStepSchema = z.object({
  step: z.number().int(),
  title: z.string(),
  description: z.string(),
  confidence: confidenceSchema.default('unclear'),
})

export const uxStateSchema = z.object({
  name: z.string(),
  status: z.enum(['implemented', 'partial', 'missing', 'unclear']),
  description: z.string(),
  evidence: evidenceList,
})

export const findingSchema = z.object({
  text: z.string(),
  confidence: confidenceSchema.default('unclear'),
  evidence: evidenceList,
})

const findingList = z.array(findingSchema).default([])

export const designerPerspectiveSchema = z.object({
  painPoints: findingList,
  designSystem: findingList,
})

export const pmPerspectiveSchema = z.object({
  valueProposition: z.string().default(''),
  sellingPoints: findingList,
  mvpMustFix: findingList,
  analytics: findingList,
})

export const stakeholderPerspectiveSchema = z.object({
  launchSummary: z.string().default(''),
  launchGoal: z.string().default(''),
  launchBlockers: findingList,
})

const emptyDesigner = { painPoints: [], designSystem: [] }
const emptyPm = { valueProposition: '', sellingPoints: [], mvpMustFix: [], analytics: [] }
const emptyStakeholder = { launchSummary: '', launchGoal: '', launchBlockers: [] }

export const perspectivesSchema = z
  .object({
    designer: designerPerspectiveSchema.default(emptyDesigner),
    pm: pmPerspectiveSchema.default(emptyPm),
    stakeholder: stakeholderPerspectiveSchema.default(emptyStakeholder),
  })
  .default({ designer: emptyDesigner, pm: emptyPm, stakeholder: emptyStakeholder })

export const nextStepSchema = z.object({
  title: z.string(),
  detail: z.string().default(''),
  userImpact: z.enum(['high', 'medium', 'low']).default('medium'),
  effort: z.enum(['low', 'medium', 'high']).default('medium'),
  required: z.boolean().default(false),
  evidence: evidenceList,
})

export const productAnalysisSchema = z.object({
  featureName: z.string(),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  completionStatus: z
    .enum(['complete', 'mostly-complete', 'in-progress', 'not-started'])
    .default('in-progress'),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  whatsWorking: z.array(findingSchema).default([]),
  evidenceSummary: z.string().default(''),
  userGoal: z.string().default(''),
  primaryActions: z.array(primaryActionSchema).default([]),
  userFlow: z.array(userFlowStepSchema).default([]),
  states: z.array(uxStateSchema).default([]),
  businessRules: z.array(findingSchema).default([]),
  permissions: z.array(findingSchema).default([]),
  dataDependencies: z.array(findingSchema).default([]),
  externalServices: z.array(findingSchema).default([]),
  components: z.array(findingSchema).default([]),
  risks: z.array(findingSchema).default([]),
  uxConcerns: z.array(findingSchema).default([]),
  missingStates: z.array(findingSchema).default([]),
  openQuestions: z.array(findingSchema).default([]),
  acceptanceCriteria: z.array(findingSchema).default([]),
  changeImpact: z.array(findingSchema).default([]),
  technicalNotes: z.array(findingSchema).default([]),
  nextSteps: z.array(nextStepSchema).default([]),
  perspectives: perspectivesSchema,
})

export const gapItemSchema = z.object({
  requirement: z.string(),
  status: z.enum(['built', 'partial', 'missing', 'not-specified']),
  explanation: z.string(),
  evidence: evidenceList,
})

export const gapAnalysisSchema = z.object({
  summary: z.string(),
  items: z.array(gapItemSchema).default([]),
})

export type NextStep = z.infer<typeof nextStepSchema>
export type Perspectives = z.infer<typeof perspectivesSchema>
export type GapItem = z.infer<typeof gapItemSchema>
export type GapAnalysis = z.infer<typeof gapAnalysisSchema>
export type ProductAnalysis = z.infer<typeof productAnalysisSchema>
export type Evidence = z.infer<typeof evidenceSchema>
export type PrimaryAction = z.infer<typeof primaryActionSchema>
export type UserFlowStep = z.infer<typeof userFlowStepSchema>
export type UxState = z.infer<typeof uxStateSchema>
export type Finding = z.infer<typeof findingSchema>
export type Confidence = z.infer<typeof confidenceSchema>
