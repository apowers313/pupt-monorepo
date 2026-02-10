import fs from 'fs-extra';
import path from 'node:path';
import { logger } from '../utils/logger.js';
import {
  render,
  createInputIterator,
  Transformer,
  createEnvironment,
  PROPS,
  isPuptElement,
  inferProviderFromModel,
} from 'pupt-lib';
import type {
  PuptElement,
  RenderOptions,
  RenderResult,
  DiscoveredPromptWithMethods,
  InputIterator,
  EnvironmentContext,
} from 'pupt-lib';
import * as puptLib from 'pupt-lib';
import { jsx, jsxs } from 'pupt-lib/jsx-runtime';
import { PUPT_LIB_EXTENSIONS, detectPromptFormat } from '../utils/prompt-format.js';
import { Prompt, fromDiscoveredPrompt } from '../types/prompt.js';
import type { EnvironmentConfig } from '../types/config.js';

// Shared transformer instance — first async call loads Babel,
// then subsequent sync calls work without await.
const transformer = new Transformer();

/**
 * Evaluate transformed JS code with the given scope variables.
 * Returns the default export (a PuptElement).
 */
function evaluateCode(
  code: string,
  extraScope: Record<string, unknown>,
): PuptElement {
  const scope: Record<string, unknown> = {
    ...puptLib,
    _jsx: jsx,
    _jsxs: jsxs,
    ...extraScope,
  };

  // Strip import statements and convert export default to return
  let evalCode = code.replace(/^import\s+.*?from\s+["'].*?["'];?\s*$/gm, '');
  evalCode = evalCode.replace(/^export\s+default\s+/m, 'return ');

  const scopeKeys = Object.keys(scope);
  const scopeValues = scopeKeys.map(k => scope[k]);
  const fn = new Function(...scopeKeys, evalCode);
  const element = fn(...scopeValues);

  if (!isPuptElement(element)) {
    throw new Error('Prompt source did not produce a valid PuptElement');
  }

  return element as PuptElement;
}

/**
 * A loaded prompt file with its transformed code and metadata.
 * Supports two-pass evaluation: first pass for discovery, second for rendering.
 */
export interface LoadedPrompt {
  /** Transformed JS code ready for evaluation */
  code: string;
  /** File path of the source .prompt file */
  filePath: string;
  /** Element created with empty inputs (for discovery/metadata) */
  discoveryElement: PuptElement;
}

/**
 * Convert pupt's EnvironmentConfig to pupt-lib's EnvironmentContext.
 * Only includes explicitly configured values (runtime values are auto-detected by pupt-lib).
 *
 * Note: This function returns a partial environment object that can be passed to createEnvironment().
 * It's designed to be compatible with different versions of pupt-lib.
 */
function toEnvironmentContext(envConfig?: EnvironmentConfig): Record<string, unknown> | undefined {
  if (!envConfig) return undefined;

  // Use a generic record type to be compatible with different pupt-lib versions
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
    // Only set format if it's a valid value (not 'unspecified' for older pupt-lib versions)
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

  // User config may not exist in older pupt-lib versions
  if (envConfig.user) {
    result.user = {
      editor: envConfig.user.editor ?? 'unknown',
    };
  }

  return result;
}

/**
 * Create a DiscoveredPromptWithMethods that supports the two-pass pattern:
 * 1. getInputIterator() uses the discovery element (empty inputs)
 * 2. render() re-evaluates the transformed code with actual inputs
 *
 * @param defaultEnv - Default environment config to use when rendering (can be overridden via options)
 */
function createPromptWithMethods(
  name: string,
  description: string,
  tags: string[],
  library: string,
  loaded: LoadedPrompt,
  defaultEnv?: EnvironmentConfig,
): DiscoveredPromptWithMethods {
  return {
    name,
    description,
    tags,
    library,
    element: loaded.discoveryElement,
    async render(options?: Partial<RenderOptions>): Promise<RenderResult> {
      // Create environment from default config, then let options override
      const envFromConfig = toEnvironmentContext(defaultEnv);
      // Cast is safe because createEnvironment validates the input
      const mergedEnv = envFromConfig
        ? createEnvironment({ ...envFromConfig, ...options?.env } as Partial<EnvironmentContext>)
        : options?.env;

      const mergedOptions: Partial<RenderOptions> = {
        ...options,
        ...(mergedEnv && { env: mergedEnv }),
      };

      const inputs = options?.inputs;
      if (inputs) {
        const inputsObj = inputs instanceof Map
          ? Object.fromEntries(inputs)
          : inputs as Record<string, unknown>;

        // Re-evaluate the pre-transformed code with actual inputs
        const finalElement = evaluateCode(loaded.code, { inputs: inputsObj });
        return await render(finalElement, mergedOptions);
      }
      return await render(loaded.discoveryElement, mergedOptions);
    },
    getInputIterator(): InputIterator {
      return createInputIterator(loaded.discoveryElement);
    },
  };
}

export interface PuptServiceConfig {
  promptDirs: string[];
  libraries?: string[];
  /** Environment configuration for prompt rendering */
  environment?: EnvironmentConfig;
}

interface DiscoveredEntry {
  prompt: DiscoveredPromptWithMethods;
  filePath: string;
}

/**
 * Service that discovers and manages pupt-lib JSX prompts.
 * Scans configured directories for .prompt, .tsx, and .jsx files
 * and loads them using pupt-lib's runtime.
 */
export class PuptService {
  private config: PuptServiceConfig;
  private prompts: DiscoveredPromptWithMethods[] = [];
  private promptPaths = new Map<string, string>();
  private initialized = false;

  constructor(config: PuptServiceConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    const allEntries: DiscoveredEntry[] = [];

    for (const dir of this.config.promptDirs) {
      if (await fs.pathExists(dir)) {
        const entries = await this.discoverPromptsInDir(dir, dir);
        allEntries.push(...entries);
      }
    }

    this.prompts = allEntries.map(e => e.prompt);
    for (const e of allEntries) {
      this.promptPaths.set(e.prompt.name, e.filePath);
    }
    this.initialized = true;
  }

  getPrompts(): DiscoveredPromptWithMethods[] {
    return this.prompts;
  }

  /**
   * Get all discovered prompts as pupt Prompt objects (for use with search/UI).
   */
  getPromptsAsAdapted(): Prompt[] {
    return this.prompts.map(dp => {
      const filePath = this.promptPaths.get(dp.name);
      const baseDir = this.getBaseDir(filePath);
      return fromDiscoveredPrompt(dp, filePath, baseDir);
    });
  }

  getPrompt(name: string): DiscoveredPromptWithMethods | undefined {
    return this.prompts.find(p => p.name === name);
  }

  findPrompt(nameOrFilename: string): DiscoveredPromptWithMethods | undefined {
    const normalized = nameOrFilename.replace(/\.(prompt|tsx|jsx)$/i, '');
    return this.prompts.find(p =>
      p.name === nameOrFilename ||
      p.name === normalized
    );
  }

  getPromptPath(name: string): string | undefined {
    return this.promptPaths.get(name);
  }

  private getBaseDir(filePath?: string): string | undefined {
    if (!filePath) return undefined;
    for (const dir of this.config.promptDirs) {
      if (filePath.startsWith(dir)) {
        return dir;
      }
    }
    return undefined;
  }

  private async discoverPromptsInDir(
    dir: string,
    baseDir: string,
  ): Promise<DiscoveredEntry[]> {
    const results: DiscoveredEntry[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subResults = await this.discoverPromptsInDir(fullPath, baseDir);
        results.push(...subResults);
      } else if (entry.isFile() && this.isPromptFile(entry.name)) {
        try {
          const result = await this.loadPromptFile(fullPath, baseDir);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          logger.warn(`Warning: Failed to load prompt ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return results;
  }

  private isPromptFile(filename: string): boolean {
    return PUPT_LIB_EXTENSIONS.some(ext => filename.endsWith(ext));
  }

  private async loadPromptFile(
    filePath: string,
    baseDir: string,
  ): Promise<DiscoveredEntry | null> {
    const format = detectPromptFormat(filePath);

    if (format === 'jsx-runtime') {
      const source = await fs.readFile(filePath, 'utf-8');

      // Prepare source: strip top-level JSX comments, wrap in export default
      let wrappedSource = source.trim();
      wrappedSource = wrappedSource.replace(/^\{\/\*[\s\S]*?\*\/\}\s*/g, '');
      if (!wrappedSource.includes('export default')) {
        const firstChar = wrappedSource.trimStart().charAt(0);
        if (firstChar === '<') {
          wrappedSource = `export default (\n${wrappedSource}\n);`;
        }
      }

      // Use pupt-lib's Transformer to compile JSX (async loads Babel on first call)
      const code = await transformer.transformSourceAsync(wrappedSource, filePath);

      // Discovery pass: evaluate with proxy inputs
      const proxyInputs = new Proxy({} as Record<string, unknown>, {
        get: (_target, prop) => typeof prop === 'string' ? '' : undefined,
      });
      const discoveryElement = evaluateCode(code, { inputs: proxyInputs });

      const loaded: LoadedPrompt = { code, filePath, discoveryElement };

      const props = discoveryElement[PROPS] as Record<string, unknown>;
      const name = (props.name as string) || path.basename(filePath, path.extname(filePath));
      const description = (props.description as string) || '';
      const tags = Array.isArray(props.tags) ? (props.tags as string[]) : [];
      const library = path.relative(baseDir, path.dirname(filePath)) || path.basename(baseDir);

      const prompt = createPromptWithMethods(name, description, tags, library, loaded, this.config.environment);
      return { prompt, filePath };
    } else if (format === 'jsx') {
      // .tsx/.jsx files: dynamic import (requires compiled JS)
      // TODO: support .tsx/.jsx via dynamic import or on-the-fly compilation
      return null;
    }

    return null;
  }
}
