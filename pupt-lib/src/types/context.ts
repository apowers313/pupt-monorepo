// Context types for pupt-lib rendering

import { z } from 'zod';
import type { PostExecutionAction, RenderError } from './render';

// Browser-safe detection
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Schema for LLM configuration
 */
export const llmConfigSchema = z.object({
  model: z.string().default('unspecified'),
  provider: z.string().default('unspecified'),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * Schema for output configuration
 */
export const outputConfigSchema = z.object({
  format: z.enum(['xml', 'markdown', 'json', 'text', 'unspecified']).default('unspecified'),
  trim: z.boolean().default(true),
  indent: z.string().default('  '),
});

/**
 * Schema for code configuration
 */
export const codeConfigSchema = z.object({
  language: z.string().default('unspecified'),
  highlight: z.boolean().optional(),
});

/**
 * Schema for user/caller context configuration
 */
export const userConfigSchema = z.object({
  editor: z.string().default('unknown'),
});

/**
 * Schema for runtime configuration (auto-detected values)
 */
export const runtimeConfigSchema = z.object({
  hostname: z.string(),
  username: z.string(),
  cwd: z.string(),
  platform: z.string(),
  os: z.string(),
  locale: z.string(),
  timestamp: z.number(),
  date: z.string(),
  time: z.string(),
  uuid: z.string(),
}).passthrough();

/**
 * Schema for the full environment context
 */
export const environmentContextSchema = z.object({
  llm: llmConfigSchema.default({}),
  output: outputConfigSchema.default({}),
  code: codeConfigSchema.default({}),
  user: userConfigSchema.default({}),
  runtime: runtimeConfigSchema.partial().default({}),
});

// ============================================================================
// TypeScript Types (inferred from schemas)
// ============================================================================

/**
 * LLM configuration for prompt rendering
 */
export type LlmConfig = z.infer<typeof llmConfigSchema>;

/**
 * Output configuration for rendered prompts
 */
export type OutputConfig = z.infer<typeof outputConfigSchema>;

/**
 * Code-related configuration
 */
export type CodeConfig = z.infer<typeof codeConfigSchema>;

/**
 * User/caller context configuration
 */
export type UserConfig = z.infer<typeof userConfigSchema>;

/**
 * Runtime configuration gathered from the environment
 */
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

/**
 * Environment context containing all configuration
 */
export type EnvironmentContext = z.infer<typeof environmentContextSchema>;

/**
 * Render context passed to components during rendering
 */
export interface RenderContext {
  inputs: Map<string, unknown>;
  env: EnvironmentContext;
  postExecution: PostExecutionAction[];
  errors: RenderError[];
}

/**
 * Default environment configuration
 */
export const DEFAULT_ENVIRONMENT: EnvironmentContext = {
  llm: { model: 'unspecified', provider: 'unspecified' },
  output: { format: 'unspecified', trim: true, indent: '  ' },
  code: { language: 'unspecified' },
  user: { editor: 'unknown' },
  runtime: {},
};

/**
 * Create an environment context with optional overrides.
 * Validates input against the schema.
 */
export function createEnvironment(
  overrides?: Partial<EnvironmentContext>,
): EnvironmentContext {
  const merged = {
    llm: { ...DEFAULT_ENVIRONMENT.llm, ...overrides?.llm },
    output: { ...DEFAULT_ENVIRONMENT.output, ...overrides?.output },
    code: { ...DEFAULT_ENVIRONMENT.code, ...overrides?.code },
    user: { ...DEFAULT_ENVIRONMENT.user, ...overrides?.user },
    runtime: { ...DEFAULT_ENVIRONMENT.runtime, ...overrides?.runtime },
  };
  return environmentContextSchema.parse(merged);
}

/**
 * Detect the system locale.
 * Works in both Node.js and browser environments.
 */
function detectLocale(): string {
  // Browser: use navigator.language
  if (isBrowser) {
    try {
      // navigator.language returns BCP 47 language tag (e.g., "en-US", "ja")
      if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
      }
    } catch {
      // Fall through to Intl fallback
    }
  }

  // Node.js: try LANG environment variable first
  if (!isBrowser) {
    try {
      const lang = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES;
      if (lang) {
        // LANG format is typically "en_US.UTF-8" - extract the locale part
        const match = lang.match(/^([a-z]{2})(?:_([A-Z]{2}))?/i);
        if (match) {
          return match[2] ? `${match[1]}-${match[2]}` : match[1];
        }
      }
    } catch {
      // Fall through to Intl fallback
    }
  }

  // Fallback: use Intl API (works in both environments)
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    if (resolved.locale) {
      return resolved.locale;
    }
  } catch {
    // Intl not available
  }

  return 'unknown';
}

/**
 * Create a runtime configuration from the current environment.
 * Works in both Node.js and browser environments.
 */
export function createRuntimeConfig(): RuntimeConfig {
  const now = new Date();

  // Browser-safe defaults
  let hostname = 'browser';
  let username = 'anonymous';
  let cwd = '/';
  let platform = 'browser';
  let os = 'unknown';

  // In Node.js, use actual system values
  if (!isBrowser) {
    try {
      // Dynamic require to avoid bundling issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const osModule = require('os');
      hostname = osModule.hostname();
      username = osModule.userInfo().username;
      cwd = process.cwd();
      platform = 'node';
      os = osModule.platform();
    } catch {
      // Fall back to defaults if os module not available
    }
  }

  // Detect locale from system/browser
  const locale = detectLocale();

  return {
    hostname,
    username,
    cwd,
    platform,
    os,
    locale,
    timestamp: Date.now(),
    date: now.toISOString().split('T')[0],
    time: now.toISOString().split('T')[1].split('.')[0],
    uuid: crypto.randomUUID(),
  };
}
