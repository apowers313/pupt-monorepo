import { vi } from 'vitest';

interface MockOptions {
  promptSelection?: string;
  inputs?: Record<string, string>;
  confirmResponses?: boolean[];
}

const originalModules: any = {};

export function setupInquirerMocks(options: MockOptions = {}) {
  // Mock @inquirer/prompts
  vi.doMock('@inquirer/prompts', () => ({
    input: vi.fn().mockImplementation((config) => {
      const name = config.name || 'default';
      return Promise.resolve(options.inputs?.[name] || 'default-value');
    }),
    confirm: vi.fn().mockImplementation(() => {
      if (options.confirmResponses && options.confirmResponses.length > 0) {
        return Promise.resolve(options.confirmResponses.shift());
      }
      return Promise.resolve(false);
    }),
    select: vi.fn().mockImplementation(() => {
      return Promise.resolve(options.promptSelection || 'first-option');
    }),
    search: vi.fn().mockImplementation(() => {
      return Promise.resolve(options.promptSelection || 'first-option');
    })
  }));

  // Mock the interactive search used for prompt selection
  vi.doMock('../../src/ui/interactive-search.js', () => ({
    InteractiveSearch: vi.fn().mockImplementation(() => ({
      selectPrompt: vi.fn().mockImplementation((prompts) => {
        // Find the prompt by name or title
        const selected = prompts.find((p: any) => 
          p.name === options.promptSelection || 
          p.title === options.promptSelection
        );
        return Promise.resolve(selected || prompts[0]);
      })
    }))
  }));
}

export function restoreInquirerMocks() {
  vi.doUnmock('@inquirer/prompts');
  vi.doUnmock('../../src/ui/interactive-search.js');
}