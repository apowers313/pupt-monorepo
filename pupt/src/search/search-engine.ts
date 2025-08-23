import MiniSearch from 'minisearch';
import { Prompt } from '../types/prompt.js';

interface SearchablePrompt extends Omit<Prompt, 'tags'> {
  id: number;
  tags: string;
  originalTags: string[];
}

export class SearchEngine {
  private miniSearch: MiniSearch<SearchablePrompt>;
  private prompts: Prompt[];

  constructor(prompts: Prompt[]) {
    this.prompts = prompts;

    this.miniSearch = new MiniSearch<SearchablePrompt>({
      fields: ['title', 'tags', 'content'],
      storeFields: [
        'path',
        'relativePath',
        'filename',
        'title',
        'tags',
        'content',
        'frontmatter',
        'variables',
        'originalTags',
      ],
    });

    if (prompts.length > 0) {
      // Process prompts to ensure tags is searchable as a string
      const processedPrompts: SearchablePrompt[] = prompts.map((prompt, index) => ({
        ...prompt,
        id: index,
        tags: prompt.tags.join(' '),
        originalTags: prompt.tags,
      }));

      this.miniSearch.addAll(processedPrompts);
    }
  }

  search(query: string): Prompt[] {
    if (!query || query.trim() === '') {
      return this.prompts;
    }

    const searchResults = this.miniSearch.search(query, {
      boost: {
        title: 3,
        tags: 2,
        content: 1,
      },
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'AND',
    });

    return searchResults.map(result => {
      const originalPrompt = this.prompts[result.id];
      return originalPrompt;
    });
  }
}
