import type {
  PuptInitConfig,
  SearchResult,
  SearchOptions,
  RenderOptions,
  RenderResult,
  PuptElement,
} from './types';
import { isPuptElement } from './types/element';
import { PROPS } from './types/symbols';
import { createSearchEngine, type SearchEngine } from './services/search-engine';
import { render } from './render';
import { createInputIterator, type InputIterator } from './services/input-iterator';
import { ModuleLoader } from './services/module-loader';

/**
 * A discovered prompt with render and input iterator capabilities
 */
export interface DiscoveredPromptWithMethods {
  name: string;
  description: string;
  tags: string[];
  library: string;
  element: PuptElement;
  render(options?: Partial<RenderOptions>): Promise<RenderResult>;
  getInputIterator(): InputIterator;
}

/**
 * Main Pupt class for initializing, discovering, and rendering prompts
 */
export class Pupt {
  private moduleLoader = new ModuleLoader();
  private searchEngine: SearchEngine;
  private prompts: DiscoveredPromptWithMethods[] = [];
  private initialized = false;

  constructor(private config: PuptInitConfig) {
    this.searchEngine = createSearchEngine(config.searchConfig);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    // Discover prompts from configured modules
    this.prompts = await this.discoverPrompts();

    // Index for search
    this.searchEngine.index(
      this.prompts.map(p => ({
        name: p.name,
        description: p.description,
        tags: p.tags,
        library: p.library,
      })),
    );

    this.initialized = true;
  }

  getPrompts(filter?: { tags?: string[] }): DiscoveredPromptWithMethods[] {
    if (filter?.tags) {
      return this.prompts.filter(p => filter.tags!.every(t => p.tags.includes(t)));
    }
    return [...this.prompts];
  }

  getPrompt(name: string): DiscoveredPromptWithMethods | undefined {
    return this.prompts.find(p => p.name === name);
  }

  searchPrompts(query: string, options?: Partial<SearchOptions>): SearchResult[] {
    return this.searchEngine.search(query, options);
  }

  getTags(): string[] {
    return this.searchEngine.getAllTags();
  }

  getPromptsByTag(tag: string): DiscoveredPromptWithMethods[] {
    return this.prompts.filter(p => p.tags.includes(tag));
  }

  private async discoverPrompts(): Promise<DiscoveredPromptWithMethods[]> {
    const discovered: DiscoveredPromptWithMethods[] = [];

    // Go through all configured modules and find prompts
    for (const source of this.config.modules ?? []) {
      const library = await this.moduleLoader.load(source);

      // Use the module loader to load the module again for prompt detection
      // The module is cached, so this is fast
      try {
        // Get the raw module exports
        const moduleExports = await this.loadModuleExports(source);

        // Find all PuptElements that are prompts (have a name prop)
        for (const [, value] of Object.entries(moduleExports)) {
          if (this.isPromptElement(value)) {
            const element = value as PuptElement;
            const props = element[PROPS] as {
              name: string;
              description?: string;
              tags?: string[];
            };

            const prompt = this.createDiscoveredPrompt(
              props.name,
              props.description ?? '',
              props.tags ?? [],
              library.name,
              element,
            );
            discovered.push(prompt);
          }
        }
      } catch {
        // Skip modules that can't be loaded for prompt detection
      }
    }

    return discovered;
  }

  private async loadModuleExports(source: string): Promise<Record<string, unknown>> {
    // For local paths, resolve from CWD
    const isNode = typeof process !== 'undefined' && process.versions?.node;

    if (isNode && (source.startsWith('./') || source.startsWith('/') || source.startsWith('../'))) {
      const path = await import('path');
      const url = await import('url');
      const absolutePath = path.resolve(process.cwd(), source);
      const fileUrl = url.pathToFileURL(absolutePath).href;
      return await import(/* @vite-ignore */ fileUrl);
    }

    return await import(source);
  }

  private isPromptElement(value: unknown): boolean {
    if (!isPuptElement(value)) {
      return false;
    }
    const props = (value as PuptElement)[PROPS];
    return (
      props !== null &&
      typeof props === 'object' &&
      'name' in props
    );
  }

  private createDiscoveredPrompt(
    name: string,
    description: string,
    tags: string[],
    library: string,
    element: PuptElement,
  ): DiscoveredPromptWithMethods {
    return {
      name,
      description,
      tags,
      library,
      element,
      render: async (options?: Partial<RenderOptions>): Promise<RenderResult> => {
        const inputsObj = options?.inputs ?? {};
        const inputsMap =
          inputsObj instanceof Map
            ? inputsObj
            : new Map(Object.entries(inputsObj as Record<string, unknown>));

        return render(element, {
          ...options,
          inputs: inputsMap,
        });
      },
      getInputIterator: (): InputIterator => {
        return createInputIterator(element);
      },
    };
  }
}
