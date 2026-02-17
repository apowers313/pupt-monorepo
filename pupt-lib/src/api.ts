import { render } from './render';
import { createInputIterator, type InputIterator } from './services/input-iterator';
import { ModuleLoader } from './services/module-loader';
import { createSearchEngine, type SearchEngine } from './services/search-engine';
import type {
  ModuleEntry,
  PuptElement,
  PuptInitConfig,
  RenderOptions,
  RenderResult,
  SearchOptions,
  SearchResult,
} from './types';
import { isPuptElement } from './types/element';
import { isResolvedModuleEntry } from './types/module';
import { isPromptSource } from './types/prompt-source';
import { PROPS } from './types/symbols';

/**
 * A discovered prompt with render and input iterator capabilities
 */
export interface DiscoveredPromptWithMethods {
  id: string;
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
  private warnings: string[] = [];
  private initialized = false;

  constructor(private config: PuptInitConfig) {
    this.searchEngine = createSearchEngine(config.searchConfig);
  }

  async init(): Promise<void> {
    if (this.initialized) {return;}

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
      const { tags } = filter;
      return this.prompts.filter(p => tags.every(t => p.tags.includes(t)));
    }
    return [...this.prompts];
  }

  getPrompt(name: string): DiscoveredPromptWithMethods | undefined {
    return this.prompts.find(p => p.name === name);
  }

  getPromptById(id: string): DiscoveredPromptWithMethods | undefined {
    return this.prompts.find(p => p.id === id);
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

  getWarnings(): string[] {
    return [...this.warnings];
  }

  private async discoverPrompts(): Promise<DiscoveredPromptWithMethods[]> {
    const discovered: DiscoveredPromptWithMethods[] = [];
    const processedLibraries = new Set<string>();

    // Go through all configured modules and find prompts
    for (const entry of this.config.modules ?? []) {
      try {
        // Deduplicate entries
        const dedupKey = this.getEntryDedupKey(entry);
        if (dedupKey !== null) {
          if (processedLibraries.has(dedupKey)) {
            continue;
          }
          processedLibraries.add(dedupKey);
        }

        const library = await this.moduleLoader.loadEntry(entry);

        // Discover prompts from compiled .prompt files (via PromptSource)
        for (const compiled of Object.values(library.prompts)) {
          const prompt = this.createDiscoveredPrompt(
            compiled.id,
            compiled.name,
            compiled.description,
            compiled.tags,
            library.name,
            compiled.element,
          );
          discovered.push(prompt);
        }
      } catch (error) {
        const sourceId = this.getEntryDisplayName(entry);
        const message = error instanceof Error ? error.message : String(error);
        this.warnings.push(`Failed to load module "${sourceId}": ${message}`);
      }
    }

    return discovered;
  }

  /**
   * Get a deduplication key for a module entry.
   * Returns null for PromptSource instances (cannot be deduplicated).
   */
  private getEntryDedupKey(entry: ModuleEntry): string | null {
    if (isPromptSource(entry)) {
      // PromptSource instances cannot be deduplicated — no reliable identity comparison
      return null;
    }

    if (isResolvedModuleEntry(entry)) {
      return this.moduleLoader.normalizeSource(entry.source, entry.type);
    }

    // { source, config } objects: serialize as a stable key
    if (typeof entry === 'object' && entry !== null && 'source' in entry && 'config' in entry) {
      const ref = entry as { source: string; config: Record<string, unknown> };
      return `pkg:${ref.source}:${JSON.stringify(ref.config)}`;
    }

    return null;
  }

  /**
   * Get a human-readable display name for a module entry (used in error messages).
   */
  private getEntryDisplayName(entry: ModuleEntry): string {
    if (isPromptSource(entry)) {
      return entry.constructor?.name ?? 'PromptSource';
    }

    if (isResolvedModuleEntry(entry)) {
      return entry.name;
    }

    if (typeof entry === 'object' && entry !== null && 'source' in entry) {
      return `{ source: ${(entry as { source: string }).source} }`;
    }

    return 'unknown';
  }

  private isPromptElement(value: unknown): boolean {
    if (!isPuptElement(value)) {
      return false;
    }
    const props = (value)[PROPS];
    return (
      props !== null &&
      typeof props === 'object' &&
      'name' in props
    );
  }

  private createDiscoveredPrompt(
    id: string,
    name: string,
    description: string,
    tags: string[],
    library: string,
    element: PuptElement,
  ): DiscoveredPromptWithMethods {
    return {
      id,
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
            : new Map(Object.entries(inputsObj));

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
