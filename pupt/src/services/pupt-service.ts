import {
  Pupt,
  createEnvironment,
  inferProviderFromModel,
} from 'pupt-lib';
import type {
  ModuleEntry,
  RenderOptions,
  RenderResult,
  DiscoveredPromptWithMethods,
  EnvironmentContext,
} from 'pupt-lib';
import { Prompt, fromDiscoveredPrompt } from '../types/prompt.js';
import type { EnvironmentConfig } from '../types/config.js';

/**
 * Convert pupt's EnvironmentConfig to pupt-lib's EnvironmentContext.
 * Only includes explicitly configured values (runtime values are auto-detected by pupt-lib).
 */
function toEnvironmentContext(envConfig?: EnvironmentConfig): Record<string, unknown> | undefined {
  if (!envConfig) return undefined;

  const result: Record<string, unknown> = {};

  if (envConfig.llm) {
    const model = envConfig.llm.model ?? 'unspecified';
    let provider = envConfig.llm.provider;
    if (!provider && model !== 'unspecified') {
      provider = inferProviderFromModel(model) ?? undefined;
    }
    const llm: Record<string, unknown> = {
      model,
      provider: provider ?? 'unspecified',
    };
    if (envConfig.llm.maxTokens !== undefined) llm.maxTokens = envConfig.llm.maxTokens;
    if (envConfig.llm.temperature !== undefined) llm.temperature = envConfig.llm.temperature;
    result.llm = llm;
  }

  if (envConfig.output) {
    const output: Record<string, unknown> = {
      trim: envConfig.output.trim ?? true,
      indent: envConfig.output.indent ?? '  ',
    };
    if (envConfig.output.format && envConfig.output.format !== 'unspecified') {
      output.format = envConfig.output.format;
    }
    result.output = output;
  }

  if (envConfig.code) {
    const code: Record<string, unknown> = {
      language: envConfig.code.language ?? 'unspecified',
    };
    if (envConfig.code.highlight !== undefined) code.highlight = envConfig.code.highlight;
    result.code = code;
  }

  if (envConfig.user) {
    result.user = {
      editor: envConfig.user.editor ?? 'unknown',
    };
  }

  return result;
}

export interface PuptServiceConfig {
  modules: ModuleEntry[];
  /** Environment configuration for prompt rendering */
  environment?: EnvironmentConfig;
}

/**
 * Service that discovers and manages pupt-lib prompts.
 * Delegates all prompt discovery and compilation to pupt-lib's Pupt class.
 */
export class PuptService {
  private pupt: Pupt;
  private config: PuptServiceConfig;
  private initialized = false;

  constructor(config: PuptServiceConfig) {
    this.config = config;
    this.pupt = new Pupt({ modules: config.modules });
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.pupt.init();
    this.initialized = true;
  }

  getPrompts(): DiscoveredPromptWithMethods[] {
    return this.pupt.getPrompts();
  }

  getWarnings(): string[] {
    return this.pupt.getWarnings();
  }

  /**
   * Get all discovered prompts as pupt Prompt objects (for use with search/UI).
   */
  getPromptsAsAdapted(): Prompt[] {
    return this.getPrompts().map(dp => fromDiscoveredPrompt(dp));
  }

  getPrompt(name: string): DiscoveredPromptWithMethods | undefined {
    return this.pupt.getPrompt(name);
  }

  findPrompt(nameOrFilename: string): DiscoveredPromptWithMethods | undefined {
    const normalized = nameOrFilename.replace(/\.(prompt|tsx|jsx)$/i, '');
    return this.pupt.getPrompt(nameOrFilename) ?? this.pupt.getPrompt(normalized);
  }

  /**
   * Wrap a DiscoveredPromptWithMethods to inject default environment config into render calls.
   * Returns a new object with the same interface but with env config merged.
   */
  wrapWithEnvironment(dp: DiscoveredPromptWithMethods): DiscoveredPromptWithMethods {
    const defaultEnv = this.config.environment;
    if (!defaultEnv) return dp;

    const envFromConfig = toEnvironmentContext(defaultEnv);
    if (!envFromConfig) return dp;

    return {
      ...dp,
      async render(options?: Partial<RenderOptions>): Promise<RenderResult> {
        const mergedEnv = createEnvironment({ ...envFromConfig, ...options?.env } as Partial<EnvironmentContext>);
        return dp.render({ ...options, env: mergedEnv });
      },
    };
  }
}
