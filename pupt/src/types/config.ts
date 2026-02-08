/**
 * LLM configuration for prompt rendering.
 * Defines the target AI model and provider.
 */
export interface LlmConfig {
  /** Model name (e.g., 'claude-3-opus', 'gpt-4') */
  model?: string;
  /** Provider name (e.g., 'anthropic', 'openai') */
  provider?: string;
  /** Maximum tokens for the response */
  maxTokens?: number;
  /** Temperature for response generation (0-2) */
  temperature?: number;
}

/**
 * Output formatting configuration.
 */
export interface OutputConfigOptions {
  /** Preferred output format */
  format?: 'xml' | 'markdown' | 'json' | 'text' | 'unspecified';
  /** Whether to trim whitespace from output */
  trim?: boolean;
  /** Indentation string for structured output */
  indent?: string;
}

/**
 * Code-related configuration.
 */
export interface CodeConfig {
  /** Programming language context (e.g., 'typescript', 'python') */
  language?: string;
  /** Whether to enable syntax highlighting */
  highlight?: boolean;
}

/**
 * User/caller context configuration.
 */
export interface UserContextConfig {
  /** User's preferred editor */
  editor?: string;
}

/**
 * Environment configuration for prompt rendering.
 * These are explicitly configured values (auto-detected values like
 * hostname, cwd, platform, etc. are NOT stored here - they come from
 * pupt-lib's createRuntimeConfig() at render time).
 */
export interface EnvironmentConfig {
  /** LLM/AI model configuration */
  llm?: LlmConfig;
  /** Output formatting preferences */
  output?: OutputConfigOptions;
  /** Code-related settings */
  code?: CodeConfig;
  /** User context */
  user?: UserContextConfig;
}

export interface Config {
  promptDirs: string[];
  historyDir?: string;
  annotationDir?: string;
  defaultCmd?: string;
  defaultCmdArgs?: string[];
  defaultCmdOptions?: Record<string, string>;
  autoReview?: boolean;
  autoRun?: boolean;
  gitPromptDir?: string;
  version?: string;
  helpers?: Record<string, HelperConfig>;
  logLevel?: string;
  outputCapture?: OutputCaptureConfig;
  libraries?: string[];   // npm packages providing pupt-lib prompts
  /** Environment configuration for prompt rendering (LLM, output format, code language, etc.) */
  environment?: EnvironmentConfig;
  // Legacy fields for backward compatibility (will be migrated)
  codingTool?: string;
  codingToolArgs?: string[];
  codingToolOptions?: Record<string, string>;
  /** @deprecated Use environment.llm.provider instead */
  targetLlm?: string;
}

interface OutputCaptureConfig {
  enabled: boolean;
  directory?: string;
  maxSizeMB?: number;
  retentionDays?: number;
}

interface HelperConfig {
  type: 'inline' | 'file';
  value?: string;
  path?: string;
}

export const DEFAULT_CONFIG: Partial<Config> = {
  autoReview: true,
  autoRun: false,
  gitPromptDir: '.git-prompts',
  version: '7.0.0',
  outputCapture: {
    enabled: false,
    directory: '.pt-output',
    maxSizeMB: 50,
    retentionDays: 30
  },
};
