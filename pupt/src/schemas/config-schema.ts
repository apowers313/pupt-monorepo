import { z } from 'zod';

// Helper configurations
export const HelperConfigSchema = z.object({
  type: z.enum(['inline', 'file']),
  value: z.string().optional(),
  path: z.string().optional()
}).refine(
  (data) => {
    if (data.type === 'inline') return !!data.value;
    if (data.type === 'file') return !!data.path;
    return false;
  },
  {
    message: 'Inline helpers must have a value, file helpers must have a path'
  }
);

export const HandlebarsExtensionConfigSchema = z.object({
  type: z.enum(['inline', 'file']),
  value: z.string().optional(),
  path: z.string().optional()
}).refine(
  (data) => {
    if (data.type === 'inline') return !!data.value;
    if (data.type === 'file') return !!data.path;
    return false;
  },
  {
    message: 'Inline extensions must have a value, file extensions must have a path'
  }
);

// Main config schema
export const ConfigSchema = z.object({
  promptDirs: z.array(z.string()).min(1, 'At least one prompt directory is required'),
  historyDir: z.string().optional(),
  annotationDir: z.string().optional(),
  defaultCmd: z.string().optional(),
  defaultCmdArgs: z.array(z.string()).optional(),
  defaultCmdOptions: z.record(z.string()).optional(),
  autoReview: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  gitPromptDir: z.string().optional(),
  handlebarsExtensions: z.array(HandlebarsExtensionConfigSchema).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (x.y.z)').optional(),
  helpers: z.record(HelperConfigSchema).optional(),
  // Legacy fields (deprecated)
  codingTool: z.string().optional(),
  codingToolArgs: z.array(z.string()).optional(),
  codingToolOptions: z.record(z.string()).optional()
});

// Partial config for updates
export const PartialConfigSchema = ConfigSchema.partial();

// Validated config type
export type ValidatedConfig = z.infer<typeof ConfigSchema>;
export type PartialValidatedConfig = z.infer<typeof PartialConfigSchema>;

// Migration schemas for different versions
export const ConfigV1Schema = z.object({
  promptDirectory: z.union([z.string(), z.array(z.string())]),
  historyDirectory: z.string().optional(),
  annotationDirectory: z.string().optional(),
  codingTool: z.string().optional(),
  codingToolArgs: z.array(z.string()).optional(),
  codingToolOptions: z.record(z.string()).optional()
});

export const ConfigV2Schema = z.object({
  promptDirs: z.array(z.string()),
  historyDir: z.string().optional(),
  annotationDir: z.string().optional(),
  codingTool: z.string().optional(),
  codingToolArgs: z.array(z.string()).optional(),
  codingToolOptions: z.record(z.string()).optional(),
  autoReview: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  gitPromptDir: z.string().optional(),
  handlebarsExtensions: z.array(HandlebarsExtensionConfigSchema).optional(),
  version: z.string().optional()
});

// Config file schemas (what's actually in the file)
export const ConfigFileSchema = z.union([
  ConfigV1Schema,
  ConfigV2Schema,
  ConfigSchema
]);

export type ConfigFile = z.infer<typeof ConfigFileSchema>;