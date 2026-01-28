// Context types for pupt-lib rendering

import type { ComponentRegistry } from '../services/component-registry';
import type { Scope } from '../services/scope';
import type { PostExecutionAction, RenderError } from './render';

// Browser-safe detection
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * LLM configuration for prompt rendering
 */
export interface LlmConfig {
  model: string;
  provider: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Output configuration for rendered prompts
 */
export interface OutputConfig {
  format: 'xml' | 'markdown' | 'json' | 'text';
  trim: boolean;
  indent: string;
}

/**
 * Code-related configuration
 */
export interface CodeConfig {
  language: string;
  highlight?: boolean;
}

/**
 * Runtime configuration gathered from the environment
 */
export interface RuntimeConfig {
  hostname: string;
  username: string;
  cwd: string;
  timestamp: number;
  date: string;
  time: string;
  uuid: string;
  [key: string]: unknown;
}

/**
 * Environment context containing all configuration
 */
export interface EnvironmentContext {
  llm: LlmConfig;
  output: OutputConfig;
  code: CodeConfig;
  runtime: Partial<RuntimeConfig>;
}

/**
 * Render context passed to components during rendering
 */
export interface RenderContext {
  inputs: Map<string, unknown>;
  env: EnvironmentContext;
  scope: Scope | null;
  registry: ComponentRegistry;
  postExecution: PostExecutionAction[];
  errors: RenderError[];
}

/**
 * Default environment configuration
 */
export const DEFAULT_ENVIRONMENT: EnvironmentContext = {
  llm: { model: 'claude-3-sonnet', provider: 'anthropic' },
  output: { format: 'xml', trim: true, indent: '  ' },
  code: { language: 'typescript' },
  runtime: {},
};

/**
 * Create an environment context with optional overrides
 */
export function createEnvironment(
  overrides?: Partial<EnvironmentContext>,
): EnvironmentContext {
  return { ...DEFAULT_ENVIRONMENT, ...overrides };
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

  // In Node.js, use actual system values
  if (!isBrowser) {
    try {
      // Dynamic require to avoid bundling issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const os = require('os');
      hostname = os.hostname();
      username = os.userInfo().username;
      cwd = process.cwd();
    } catch {
      // Fall back to defaults if os module not available
    }
  }

  return {
    hostname,
    username,
    cwd,
    timestamp: Date.now(),
    date: now.toISOString().split('T')[0],
    time: now.toISOString().split('T')[1].split('.')[0],
    uuid: crypto.randomUUID(),
  };
}
