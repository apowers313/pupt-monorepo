import { search } from '@inquirer/prompts';
import { Prompt } from '../types/prompt.js';
import { SearchEngine } from '../search/search-engine.js';
import chalk from 'chalk';

export class InteractiveSearch {
  private searchEngine: SearchEngine;

  constructor() {
    this.searchEngine = new SearchEngine([]);
  }

  async selectPrompt(prompts: Prompt[]): Promise<Prompt> {
    this.searchEngine = new SearchEngine(prompts);

    const selected = await search<Prompt>({
      message: 'Search for a prompt:',
      source: async input => {
        const results = input ? this.searchEngine.search(input) : prompts;

        return results.map(prompt => ({
          name: this.formatPromptDisplay(prompt),
          value: prompt,
          description: prompt.relativePath,
        }));
      },
    });

    return selected;
  }

  private formatPromptDisplay(prompt: Prompt): string {
    const tags = prompt.tags.length > 0 ? chalk.dim(` [${prompt.tags.join(', ')}]`) : '';

    return `${chalk.bold(prompt.title)}${tags}`;
  }
}
