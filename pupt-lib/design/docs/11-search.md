# Prompt Search

[← Back to Index](00-index.md) | [Previous: Workflows](10-workflows.md) | [Next: Configuration](12-configuration.md)

---

## Overview

pupt-lib includes a fuzzy search engine for discovering prompts across loaded libraries.

---

## Searchable Prompt Interface

```typescript
export interface SearchablePrompt {
  /** Unique prompt name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Tags for categorization */
  tags: string[];
  /** Library this prompt came from */
  library: string;
  /** Full prompt text (for content search) */
  content?: string;
}
```

---

## Search Options

```typescript
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Filter by tags (AND logic) */
  tags?: string[];
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Search fields to include */
  fields?: ('name' | 'description' | 'tags' | 'content')[];
}
```

---

## Search Engine Interface

```typescript
export interface SearchEngine {
  /**
   * Index prompts for searching.
   * Call after loading new libraries.
   */
  index(prompts: SearchablePrompt[]): void;

  /**
   * Search for prompts matching a query.
   * Uses fuzzy matching on name, description, tags, and content.
   */
  search(query: string, options?: Partial<SearchOptions>): SearchResult[];

  /**
   * Get all prompts with a specific tag.
   */
  getByTag(tag: string): SearchablePrompt[];

  /**
   * Get all unique tags across indexed prompts.
   */
  getAllTags(): string[];

  /**
   * Clear the index.
   */
  clear(): void;
}

export interface SearchResult {
  /** The matched prompt */
  prompt: SearchablePrompt;
  /** Relevance score (higher = better match) */
  score: number;
  /** Which fields matched */
  matches: Array<{
    field: string;
    indices: Array<[number, number]>;
  }>;
}
```

---

## Search Engine Configuration

```typescript
export interface SearchEngineConfig {
  /** Minimum score threshold (0-1) */
  threshold?: number;
  /** Field weights for scoring */
  weights?: {
    name?: number;
    description?: number;
    tags?: number;
    content?: number;
  };
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Fuzzy matching tolerance */
  fuzziness?: number;
}

export function createSearchEngine(config?: SearchEngineConfig): SearchEngine;
```

### Default Configuration

```typescript
const defaultConfig: SearchEngineConfig = {
  threshold: 0.3,
  weights: {
    name: 2.0,         // Name matches are most important
    description: 1.5,  // Description is second
    tags: 1.0,         // Tags are third
    content: 0.5,      // Content matches are least important
  },
  fuzzy: true,
  fuzziness: 0.4,
};
```

---

## Implementation Notes

The search engine uses [MiniSearch](https://github.com/lucaong/minisearch) for fast, in-memory fuzzy searching.

### Scoring

Results are scored based on:
1. **Field weight** - Name matches score higher than content
2. **Fuzzy distance** - Exact matches score higher than fuzzy
3. **Term frequency** - Multiple matches boost score
4. **Field length** - Shorter fields with matches score higher

### Caching

The search engine maintains an in-memory index. After loading new libraries, call `index()` to update:

```typescript
const engine = createSearchEngine();

// After loading libraries
const prompts = pupt.getPrompts();
engine.index(prompts);

// Search
const results = engine.search('code review');
```

### Indexing Performance

| Prompts | Index Time | Search Time |
|---------|------------|-------------|
| 100 | < 10ms | < 1ms |
| 1,000 | < 50ms | < 5ms |
| 10,000 | < 500ms | < 20ms |

---

## Usage Examples

### Basic Search

```typescript
import { Pupt } from 'pupt-lib';

const pupt = new Pupt({
  modules: ['@acme/prompts', '@corp/prompts'],
});

await pupt.init();

// Search by query
const results = pupt.searchPrompts('code review');

for (const result of results) {
  console.log(`${result.prompt.name} (score: ${result.score.toFixed(2)})`);
  console.log(`  ${result.prompt.description}`);
}
```

### Interactive Search

```typescript
async function interactiveSearch(pupt: Pupt) {
  const rl = readline.createInterface({ input, output });

  while (true) {
    const query = await rl.question('Search: ');
    if (!query) break;

    const results = pupt.searchPrompts(query, { limit: 5 });

    if (results.length === 0) {
      console.log('No results found');
      continue;
    }

    for (let i = 0; i < results.length; i++) {
      const { prompt, score } = results[i];
      console.log(`${i + 1}. ${prompt.name} [${prompt.tags.join(', ')}]`);
      console.log(`   ${prompt.description || 'No description'}`);
    }

    const choice = await rl.question('Select (1-5): ');
    // ... use selected prompt
  }
}
```

### Tag Browsing

```typescript
// Get all available tags
const tags = pupt.getTags();
console.log('Available tags:', tags.join(', '));

// Get prompts by tag
const codePrompts = pupt.getPromptsByTag('code');
console.log(`Found ${codePrompts.length} prompts tagged 'code'`);

// Filter by multiple tags
const results = pupt.searchPrompts('', { tags: ['code', 'security'] });
```

### Combined Search and Filter

```typescript
// Search with tag filter
const results = pupt.searchPrompts('review', {
  tags: ['security'],
  limit: 10,
});

// Only search name and description
const results = pupt.searchPrompts('review', {
  fields: ['name', 'description'],
});
```

---

## Next Steps

- [Workflows](10-workflows.md) - Making your prompts discoverable
- [API](07-api.md) - Search API details
- [Configuration](12-configuration.md) - Project setup
