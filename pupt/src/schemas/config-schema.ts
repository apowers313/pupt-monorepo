import { z } from 'zod';

// Helper configurations
const HelperConfigSchema = z.object({
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

// Output capture configuration schema
export const OutputCaptureConfigSchema = z.object({
  enabled: z.boolean(),
  directory: z.string().optional(),
  maxSizeMB: z.number().optional(),
  retentionDays: z.number().optional()
});

// ============================================================================
// Environment configuration schemas (mirrors pupt-lib's explicit config)
// Note: Runtime config (hostname, cwd, platform, etc.) is auto-detected
// by pupt-lib and should NOT be stored in the config file.
// ============================================================================

/** LLM configuration schema */
const LlmConfigSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/** Output formatting configuration schema */
const OutputConfigSchema = z.object({
  format: z.enum(['xml', 'markdown', 'json', 'text', 'unspecified']).optional(),
  trim: z.boolean().optional(),
  indent: z.string().optional(),
});

/** Code-related configuration schema */
const CodeConfigSchema = z.object({
  language: z.string().optional(),
  highlight: z.boolean().optional(),
});

/** User context configuration schema */
const UserContextConfigSchema = z.object({
  editor: z.string().optional(),
});

/** Full environment configuration schema */
const EnvironmentConfigSchema = z.object({
  llm: LlmConfigSchema.optional(),
  output: OutputConfigSchema.optional(),
  code: CodeConfigSchema.optional(),
  user: UserContextConfigSchema.optional(),
});

// Git library entry schema
const GitLibraryEntrySchema = z.object({
  name: z.string(),
  type: z.literal('git'),
  source: z.string(),
  promptDirs: z.array(z.string()),
  installedAt: z.string(),
  version: z.string().optional(),
});

// npm library entry schema
const NpmLibraryEntrySchema = z.object({
  name: z.string(),
  type: z.literal('npm'),
  source: z.string(),
  promptDirs: z.array(z.string()),
  installedAt: z.string(),
  version: z.string(),
});

const LibraryEntrySchema = z.discriminatedUnion('type', [
  GitLibraryEntrySchema,
  NpmLibraryEntrySchema,
]);

// Main config schema (v8)
export const ConfigSchema = z.object({
  promptDirs: z.array(z.string()).min(1, 'At least one prompt directory is required'),
  historyDir: z.string().optional(),
  annotationDir: z.string().optional(),
  defaultCmd: z.string().optional(),
  defaultCmdArgs: z.array(z.string()).optional(),
  defaultCmdOptions: z.record(z.string()).optional(),
  autoReview: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (x.y.z)').optional(),
  helpers: z.record(HelperConfigSchema).optional(),
  outputCapture: OutputCaptureConfigSchema.optional(),
  logLevel: z.string().optional(),
  libraries: z.array(LibraryEntrySchema).optional(),
  environment: EnvironmentConfigSchema.optional(),
}).passthrough();

// Partial config for updates
const _PartialConfigSchema = ConfigSchema.partial();

// Validated config type
type _ValidatedConfig = z.infer<typeof ConfigSchema>;
type _PartialValidatedConfig = z.infer<typeof _PartialConfigSchema>;

// Pre-v8 schema (v1-v7) - allows all deprecated fields that migration will remove.
// Covers v1 (promptDirectory), v2 (codingTool), and v3-v7 configs.
// Note: Global config is always created at v8+, but this schema is still needed
// for migration validation when loading older configs.
const ConfigPreV8Schema = z.object({
  // v2+ uses promptDirs; v1 uses promptDirectory (handled by migration)
  promptDirs: z.array(z.string()).min(1).optional(),
  promptDirectory: z.union([z.string(), z.array(z.string())]).optional(),
  historyDir: z.string().optional(),
  historyDirectory: z.string().optional(),   // v1 field name
  annotationDir: z.string().optional(),
  annotationDirectory: z.string().optional(), // v1 field name
  defaultCmd: z.string().optional(),
  defaultCmdArgs: z.array(z.string()).optional(),
  defaultCmdOptions: z.record(z.string()).optional(),
  autoReview: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  gitPromptDir: z.string().optional(),
  version: z.string().optional(),
  helpers: z.record(HelperConfigSchema).optional(),
  outputCapture: OutputCaptureConfigSchema.optional(),
  logLevel: z.string().optional(),
  libraries: z.union([z.array(z.string()), z.array(LibraryEntrySchema)]).optional(),
  environment: EnvironmentConfigSchema.optional(),
  codingTool: z.string().optional(),
  codingToolArgs: z.array(z.string()).optional(),
  codingToolOptions: z.record(z.string()).optional(),
  targetLlm: z.string().optional(),
}).passthrough();

// Config file schemas (what's actually in the file)
// Only includes pre-v8 (for migration from v3-v7) and current v8 schema.
// Old v1/v2 schemas removed — global config is always created at v8+.
export const ConfigFileSchema = z.union([
  ConfigPreV8Schema,
  ConfigSchema
]);

type _ConfigFile = z.infer<typeof ConfigFileSchema>;
