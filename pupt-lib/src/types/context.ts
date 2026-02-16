// Context types for pupt-lib rendering

import { z } from 'zod';
import type { PostExecutionAction, RenderError } from './render';

// Browser-safe detection
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// ============================================================================
// Runtime Values Cache (for Node.js)
// ============================================================================

interface NodeRuntimeValues {
  hostname: string;
  username: string;
  platform: string;
  os: string;
}

// Cache for Node.js runtime values - populated lazily
let nodeRuntimeCache: NodeRuntimeValues | null = null;
let nodeRuntimeCachePromise: Promise<void> | null = null;

/**
 * Initialize the Node.js runtime cache using dynamic imports.
 * This is called lazily on first access to avoid bundling issues in browsers.
 */
async function initNodeRuntimeCache(): Promise<void> {
  if (nodeRuntimeCache) return;

  try {
    // Dynamic import to avoid bundling in browser builds
    const osModule = await import(/* webpackIgnore: true */ 'os');
    nodeRuntimeCache = {
      hostname: osModule.hostname(),
      username: osModule.userInfo().username,
      platform: 'node',
      os: osModule.platform(),
    };
  } catch {
    // Fall back to defaults if os module not available
    nodeRuntimeCache = {
      hostname: 'unknown',
      username: 'anonymous',
      platform: 'node',
      os: 'unknown',
    };
  }
}

/**
 * Get the Node.js runtime values, initializing the cache if needed.
 * Returns defaults synchronously if cache isn't ready yet.
 */
function getNodeRuntimeValues(): NodeRuntimeValues {
  // Start async initialization if not already started
  if (!nodeRuntimeCachePromise && !isBrowser) {
    nodeRuntimeCachePromise = initNodeRuntimeCache();
  }

  // Return cached values if available, otherwise defaults
  return nodeRuntimeCache || {
    hostname: 'unknown',
    username: 'anonymous',
    platform: 'node',
    os: 'unknown',
  };
}

/**
 * Ensure the Node.js runtime cache is initialized.
 * In browser environments, this resolves immediately.
 * In Node.js, this waits for the async initialization to complete.
 *
 * This is primarily useful for testing to ensure runtime values are available.
 */
export async function ensureRuntimeCacheReady(): Promise<void> {
  if (isBrowser) return;

  if (!nodeRuntimeCachePromise) {
    nodeRuntimeCachePromise = initNodeRuntimeCache();
  }

  await nodeRuntimeCachePromise;
}

// Eagerly start initialization in Node.js environment
// This runs when the module is first imported
if (!isBrowser) {
  nodeRuntimeCachePromise = initNodeRuntimeCache();
}

// ============================================================================
// LLM Providers & Model Inference
// ============================================================================

/**
 * Known LLM providers (model creators, not hosting platforms).
 * Hosting platforms like AWS Bedrock and Azure are not included here
 * because the provider represents who created the model, which determines
 * the prompt optimization strategy.
 */
export const LLM_PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'meta',
  'mistral',
  'deepseek',
  'xai',
  'cohere',
  'unspecified',
] as const;

export type LlmProvider = typeof LLM_PROVIDERS[number];

/**
 * Infer the LLM provider from a model name/ID.
 * Returns the provider if the model matches a known pattern, or null if unknown.
 */
export function inferProviderFromModel(model: string): LlmProvider | null {
  const m = model.toLowerCase();

  // Anthropic: claude-*, or short names opus/sonnet/haiku
  if (m.startsWith('claude') || m === 'opus' || m === 'sonnet' || m === 'haiku') return 'anthropic';

  // OpenAI: gpt-*, chatgpt-*, o1/o3/o4 series
  if (m.startsWith('gpt-') || m.startsWith('chatgpt-') || /^o[134]([-_]|$)/.test(m)) return 'openai';

  // Google: gemini-*
  if (m.startsWith('gemini')) return 'google';

  // Meta: llama-*
  if (m.startsWith('llama')) return 'meta';

  // Mistral: mistral-*, mixtral-*, codestral-*, pixtral-*
  if (m.startsWith('mistral') || m.startsWith('mixtral') || m.startsWith('codestral') || m.startsWith('pixtral')) return 'mistral';

  // DeepSeek: deepseek-*
  if (m.startsWith('deepseek')) return 'deepseek';

  // xAI: grok-*
  if (m.startsWith('grok')) return 'xai';

  // Cohere: command-*
  if (m.startsWith('command')) return 'cohere';

  return null;
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Schema for LLM configuration.
 * When a model is specified but provider is not, the provider is automatically
 * inferred from the model name.
 */
export const llmConfigSchema = z.object({
  model: z.string().default('unspecified'),
  provider: z.enum(LLM_PROVIDERS).default('unspecified'),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
}).transform((data) => {
  if (data.provider === 'unspecified' && data.model !== 'unspecified') {
    const inferred = inferProviderFromModel(data.model);
    if (inferred) {
      return { ...data, provider: inferred };
    }
  }
  return data;
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
 * Schema for prompt configuration (controls Prompt component default sections)
 */
export const promptConfigSchema = z.object({
  includeRole: z.boolean().default(true),
  includeFormat: z.boolean().default(true),
  includeConstraints: z.boolean().default(true),
  includeSuccessCriteria: z.boolean().default(false),
  includeGuardrails: z.boolean().default(false),
  defaultRole: z.string().default('assistant'),
  defaultExpertise: z.string().default('general'),
  delimiter: z.enum(['xml', 'markdown', 'none']).default('xml'),
});

/**
 * Schema for the full environment context
 */
export const environmentContextSchema = z.object({
  llm: llmConfigSchema.default({}),
  output: outputConfigSchema.default({}),
  code: codeConfigSchema.default({}),
  user: userConfigSchema.default({}),
  runtime: runtimeConfigSchema.partial().default({}),
  prompt: promptConfigSchema.default({}),
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
 * Prompt configuration for default section behavior
 */
export type PromptConfig = z.infer<typeof promptConfigSchema>;

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
  metadata: Map<string, unknown>;
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
  prompt: {
    includeRole: true,
    includeFormat: true,
    includeConstraints: true,
    includeSuccessCriteria: false,
    includeGuardrails: false,
    defaultRole: 'assistant',
    defaultExpertise: 'general',
    delimiter: 'xml',
  },
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
    prompt: { ...DEFAULT_ENVIRONMENT.prompt, ...overrides?.prompt },
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
 *
 * In Node.js, system values (hostname, username, os) are loaded asynchronously
 * via dynamic import to avoid bundling Node.js modules in browser builds.
 * If the cache isn't ready on first call, defaults are used temporarily.
 */
export function createRuntimeConfig(): RuntimeConfig {
  const now = new Date();

  // Detect locale from system/browser
  const locale = detectLocale();

  // Browser environment
  if (isBrowser) {
    return {
      hostname: 'browser',
      username: 'anonymous',
      cwd: '/',
      platform: 'browser',
      os: 'unknown',
      locale,
      timestamp: Date.now(),
      date: now.toISOString().split('T')[0],
      time: now.toISOString().split('T')[1].split('.')[0],
      uuid: crypto.randomUUID(),
    };
  }

  // Node.js environment - use cached values
  const nodeValues = getNodeRuntimeValues();

  return {
    hostname: nodeValues.hostname,
    username: nodeValues.username,
    cwd: process.cwd(), // cwd is always synchronous
    platform: nodeValues.platform,
    os: nodeValues.os,
    locale,
    timestamp: Date.now(),
    date: now.toISOString().split('T')[0],
    time: now.toISOString().split('T')[1].split('.')[0],
    uuid: crypto.randomUUID(),
  };
}
