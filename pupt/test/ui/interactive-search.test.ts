import { describe, it, expect, vi } from 'vitest';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';
import { Prompt } from '../../src/types/prompt.js';
import * as inquirerPrompts from '@inquirer/prompts';

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  search: vi.fn(),
}));

describe('InteractiveSearch', () => {
  const testPrompts: Prompt[] = [
    {
      path: '/prompts/test1.md',
      relativePath: 'test1.md',
      filename: 'test1.md',
      title: 'Test Prompt 1',
      labels: ['test'],
      content: 'Content 1',
      frontmatter: {},
    },
    {
      path: '/prompts/test2.md',
      relativePath: 'test2.md',
      filename: 'test2.md',
      title: 'Test Prompt 2',
      labels: ['test'],
      content: 'Content 2',
      frontmatter: {},
    },
  ];

  it('should present search interface and return selected prompt', async () => {
    const mockSearch = vi.mocked(inquirerPrompts.search);
    mockSearch.mockResolvedValueOnce(testPrompts[0]);

    const search = new InteractiveSearch();
    const result = await search.selectPrompt(testPrompts);

    expect(mockSearch).toHaveBeenCalledWith({
      message: 'Search for a prompt:',
      source: expect.any(Function),
    });
    expect(result).toBe(testPrompts[0]);
  });

  it('should filter prompts based on search input', async () => {
    const mockSearch = vi.mocked(inquirerPrompts.search);
    let sourceFunction: any;

    mockSearch.mockImplementationOnce(async (config: any) => {
      sourceFunction = config.source;
      return testPrompts[1];
    });

    const search = new InteractiveSearch();
    await search.selectPrompt(testPrompts);

    // Test the source function
    const results = await sourceFunction('2');
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(testPrompts[1]);
    expect(results[0].name).toContain('Test Prompt 2');
  });
});
