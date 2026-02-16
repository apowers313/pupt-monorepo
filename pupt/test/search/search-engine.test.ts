import { beforeEach,describe, expect, it } from 'vitest';

import { SearchEngine } from '../../src/search/search-engine.js';
import { Prompt } from '../../src/types/prompt.js';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let prompts: Prompt[];

  beforeEach(() => {
    prompts = [
      {
        path: '/prompts/code-review.md',
        relativePath: 'code-review.md',
        filename: 'code-review.md',
        title: 'Code Review Template',
        tags: ['code', 'review'],
        content: 'Template for conducting thorough code reviews',
        frontmatter: { title: 'Code Review Template', tags: ['code', 'review'] },
      },
      {
        path: '/prompts/refactoring/extract-method.md',
        relativePath: 'refactoring/extract-method.md',
        filename: 'extract-method.md',
        title: 'Extract Method Refactoring',
        tags: ['refactoring', 'code'],
        content: 'Guide for extracting methods from existing code',
        frontmatter: { title: 'Extract Method Refactoring', tags: ['refactoring', 'code'] },
      },
      {
        path: '/prompts/testing/unit-test.md',
        relativePath: 'testing/unit-test.md',
        filename: 'unit-test.md',
        title: 'Unit Test Generator',
        tags: ['testing', 'unit'],
        content: 'Generate comprehensive unit tests for your code',
        frontmatter: { title: 'Unit Test Generator', tags: ['testing', 'unit'] },
      },
    ];
    searchEngine = new SearchEngine(prompts);
  });

  describe('initialization', () => {
    it('should create an instance with prompts', () => {
      expect(searchEngine).toBeDefined();
    });

    it('should handle empty prompt list', () => {
      const emptyEngine = new SearchEngine([]);
      expect(emptyEngine).toBeDefined();
    });
  });

  describe('search', () => {
    it('should find prompts by title', () => {
      const results = searchEngine.search('code review');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Code Review Template');
    });

    it('should find prompts by tag', () => {
      const results = searchEngine.search('refactoring');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Extract Method Refactoring');
    });

    it('should find prompts by content', () => {
      const results = searchEngine.search('unit tests');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Unit Test Generator');
    });

    it('should return all prompts when query is empty', () => {
      const results = searchEngine.search('');
      expect(results).toHaveLength(3);
    });

    it('should return empty array when no matches found', () => {
      const results = searchEngine.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should handle fuzzy matching', () => {
      const results = searchEngine.search('cod revew'); // typo
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Code Review Template');
    });

    it('should handle prefix matching', () => {
      const results = searchEngine.search('ref');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Extract Method Refactoring');
    });

    it('should rank title matches higher than content matches', () => {
      const testPrompts: Prompt[] = [
        {
          path: '/prompts/a.md',
          relativePath: 'a.md',
          filename: 'a.md',
          title: 'Something else',
          tags: [],
          content: 'This is about testing',
          frontmatter: {},
        },
        {
          path: '/prompts/b.md',
          relativePath: 'b.md',
          filename: 'b.md',
          title: 'Testing Guide',
          tags: [],
          content: 'Some other content',
          frontmatter: {},
        },
      ];
      const engine = new SearchEngine(testPrompts);
      const results = engine.search('testing');
      expect(results[0].title).toBe('Testing Guide'); // Title match should be first
    });

    it('should find multiple matches', () => {
      const results = searchEngine.search('code');
      expect(results).toHaveLength(3); // All prompts contain 'code' in content
      const titles = results.map(r => r.title);
      expect(titles).toContain('Code Review Template');
      expect(titles).toContain('Extract Method Refactoring');
      expect(titles).toContain('Unit Test Generator');
    });
  });

  describe('field boosting', () => {
    it('should apply correct boost weights', () => {
      const testPrompts: Prompt[] = [
        {
          path: '/prompts/a.md',
          relativePath: 'a.md',
          filename: 'a.md',
          title: 'Low priority',
          tags: [],
          content: 'test test test', // Multiple occurrences in content
          frontmatter: {},
        },
        {
          path: '/prompts/b.md',
          relativePath: 'b.md',
          filename: 'b.md',
          title: 'Medium priority',
          tags: ['test'],
          content: 'Something else',
          frontmatter: {},
        },
        {
          path: '/prompts/c.md',
          relativePath: 'c.md',
          filename: 'c.md',
          title: 'Test priority',
          tags: [],
          content: 'Something else',
          frontmatter: {},
        },
      ];
      const engine = new SearchEngine(testPrompts);
      const results = engine.search('test');

      // Title match (boost 3) should be first
      expect(results[0].title).toBe('Test priority');
      // Tag match (boost 2) should be second
      expect(results[1].title).toBe('Medium priority');
      // Content match (boost 1) should be last
      expect(results[2].title).toBe('Low priority');
    });
  });
});
