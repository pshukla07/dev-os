import { z } from 'zod'

export const UploadQuerySchema = z.object({
  contract_type: z.enum(['nda', 'msa']),
})

export const ProcessSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  customTerms: z
    .array(z.string().min(1).max(100))
    .max(5, 'Maximum 5 custom terms allowed')
    .optional()
    .default([]),
})

export const EditTermSchema = z.object({
  value: z.string().min(1, 'Value is required').max(2000),
})

export const ChatSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  sessionId: z.string().uuid().nullable().optional(),
  message: z.string().min(1, 'Message is required').max(5000),
})

export const FeedbackSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  rating: z.enum(['up', 'down']),
  comment: z.string().max(1000).optional(),
})

export type ProcessInput   = z.infer<typeof ProcessSchema>
export type EditTermInput  = z.infer<typeof EditTermSchema>
export type ChatInput      = z.infer<typeof ChatSchema>
export type FeedbackInput  = z.infer<typeof FeedbackSchema>
