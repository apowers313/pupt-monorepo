import MiniSearch from 'minisearch';
import type { SearchablePrompt, SearchResult, SearchEngineConfig, SearchOptions } from '../types';

export interface SearchEngine {
  index(prompts: SearchablePrompt[]): void;
  search(query: string, options?: Partial<SearchOptions>): SearchResult[];
  getByTag(tag: string): SearchablePrompt[];
  getAllTags(): string[];
  clear(): void;
}

export function createSearchEngine(config?: SearchEngineConfig): SearchEngine {
  const {
    threshold = 0.3,
    // Match pupt's boosting: title/name (3x), tags (2x), content (1x)
    weights = { name: 3, description: 1.5, tags: 2, content: 1 },
    fuzzy = true,
    fuzziness = 0.2, // Match pupt's 20% typo tolerance
    prefix = true, // Enable prefix matching (e.g., "ref" matches "refactoring")
    combineWith = 'AND' as const, // All search terms must match
  } = config ?? {};

  const miniSearch = new MiniSearch<{
    id: number;
    name: string;
    description: string;
    tags: string;
    content: string;
    library: string;
  }>({
    fields: ['name', 'description', 'tags', 'content'],
    storeFields: ['name', 'description', 'tags', 'library'],
    searchOptions: {
      fuzzy: fuzzy ? fuzziness : false,
      prefix,
      combineWith,
      boost: weights,
    },
  });

  const allPrompts: SearchablePrompt[] = [];

  return {
    index(prompts) {
      allPrompts.push(...prompts);
      miniSearch.addAll(
        prompts.map((p, i) => ({
          id: i + allPrompts.length - prompts.length,
          name: p.name,
          description: p.description ?? '',
          tags: p.tags.join(' '),
          content: p.content ?? '',
          library: p.library,
        })),
      );
    },

    search(query, options) {
      const searchResults = miniSearch.search(query, {
        filter: options?.tags
          ? (result) => options.tags!.every(t => (result.tags as string).includes(t))
          : undefined,
      });

      return searchResults
        .filter(r => r.score >= threshold)
        .slice(0, options?.limit ?? 10)
        .map(r => ({
          prompt: allPrompts[r.id],
          score: r.score,
          matches: r.match
            ? Object.entries(r.match).map(([field]) => ({
              field,
              indices: [], // MiniSearch doesn't provide indices
            }))
            : [],
        }));
    },

    getByTag(tag) {
      return allPrompts.filter(p => p.tags.includes(tag));
    },

    getAllTags() {
      const tags = new Set<string>();
      allPrompts.forEach(p => p.tags.forEach(t => tags.add(t)));
      return [...tags];
    },

    clear() {
      miniSearch.removeAll();
      allPrompts.length = 0;
    },
  };
}
