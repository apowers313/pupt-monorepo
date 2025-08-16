import { z } from 'zod';

// Input type schemas
export const InputTypeSchema = z.enum([
  'text',
  'select',
  'multiselect',
  'number',
  'boolean',
  'file',
  'password',
  'confirm',
  'editor'
]);

// Validation schema for input validation rules
export const InputValidationSchema = z.object({
  required: z.boolean().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  enum: z.array(z.string()).optional()
});

// Input definition schema
export const PromptInputSchema = z.object({
  name: z.string().min(1, 'Input name is required'),
  type: InputTypeSchema,
  description: z.string().optional(),
  required: z.boolean().default(true),
  default: z.any().optional(),
  options: z.array(z.union([
    z.string(),
    z.object({
      label: z.string(),
      value: z.any()
    })
  ])).optional(),
  validation: z.union([
    z.string(), // For backward compatibility with string validation rules
    InputValidationSchema
  ]).optional(),
  placeholder: z.string().optional(),
  allowMultiple: z.boolean().optional() // For file inputs
}).refine(
  (data) => {
    // Ensure select/multiselect have options
    if ((data.type === 'select' || data.type === 'multiselect') && !data.options) {
      return false;
    }
    return true;
  },
  {
    message: 'Select and multiselect inputs must have options'
  }
);

// Model configuration schema
export const ModelConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional()
});

// Prompt metadata schema (frontmatter)
export const PromptMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  inputs: z.array(PromptInputSchema).optional(),
  model: z.string().optional(), // Deprecated, use modelConfig
  temperature: z.number().min(0).max(2).optional(), // Deprecated
  maxTokens: z.number().positive().optional(), // Deprecated
  modelConfig: ModelConfigSchema.optional(),
  outputFormat: z.enum(['text', 'json', 'markdown', 'code']).optional(),
  examples: z.array(z.object({
    inputs: z.record(z.any()),
    output: z.string().optional()
  })).optional(),
  dependencies: z.array(z.string()).optional() // Other prompts this depends on
});

// Full prompt schema
export const PromptSchema = z.object({
  metadata: PromptMetadataSchema,
  content: z.string(),
  path: z.string(),
  name: z.string()
});

// History entry schema
export const HistoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  promptName: z.string(),
  promptPath: z.string(),
  inputs: z.record(z.any()),
  maskedInputs: z.record(z.any()).optional(),
  output: z.string(),
  modelConfig: ModelConfigSchema.optional(),
  duration: z.number().optional(),
  annotation: z.string().optional()
});

// Annotation schema
export const AnnotationSchema = z.object({
  historyId: z.string(),
  annotation: z.string(),
  timestamp: z.string().datetime(),
  tags: z.array(z.string()).optional()
});

// Type exports
export type InputType = z.infer<typeof InputTypeSchema>;
export type PromptInput = z.infer<typeof PromptInputSchema>;
export type PromptMetadata = z.infer<typeof PromptMetadataSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;