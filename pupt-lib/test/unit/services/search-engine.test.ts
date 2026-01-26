import { describe, it, expect } from 'vitest';
import { createSearchEngine } from '../../../src/services/search-engine';

describe('SearchEngine', () => {
  it('should index prompts', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'code-review', description: 'Review code', tags: ['code'], library: 'test' },
      { name: 'bug-fix', description: 'Fix bugs', tags: ['code', 'debug'], library: 'test' },
    ]);

    const results = engine.search('review');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].prompt.name).toBe('code-review');
  });

  it('should support fuzzy matching', () => {
    const engine = createSearchEngine({ fuzzy: true });

    engine.index([
      { name: 'authentication', description: 'Handle auth', tags: [], library: 'test' },
    ]);

    // Typo in search
    const results = engine.search('authentcation');

    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter by tags', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'prompt-1', tags: ['frontend'], library: 'test' },
      { name: 'prompt-2', tags: ['backend'], library: 'test' },
      { name: 'prompt-3', tags: ['frontend', 'backend'], library: 'test' },
    ]);

    const frontend = engine.getByTag('frontend');

    expect(frontend.length).toBe(2);
    expect(frontend.map(p => p.name)).toContain('prompt-1');
    expect(frontend.map(p => p.name)).toContain('prompt-3');
  });

  it('should return all tags', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'a', tags: ['x', 'y'], library: 'test' },
      { name: 'b', tags: ['y', 'z'], library: 'test' },
    ]);

    const tags = engine.getAllTags();

    expect(tags).toContain('x');
    expect(tags).toContain('y');
    expect(tags).toContain('z');
  });

  it('should clear indexed data', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'test', description: 'Test', tags: [], library: 'test' },
    ]);

    expect(engine.search('test').length).toBeGreaterThan(0);

    engine.clear();

    expect(engine.search('test').length).toBe(0);
    expect(engine.getAllTags().length).toBe(0);
  });

  it('should respect search limit option', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'test-1', description: 'Test one', tags: [], library: 'test' },
      { name: 'test-2', description: 'Test two', tags: [], library: 'test' },
      { name: 'test-3', description: 'Test three', tags: [], library: 'test' },
    ]);

    const results = engine.search('test', { limit: 2 });

    expect(results.length).toBe(2);
  });

  it('should search by description', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'prompt-a', description: 'Quality assurance review', tags: [], library: 'test' },
      { name: 'prompt-b', description: 'Performance testing', tags: [], library: 'test' },
    ]);

    const results = engine.search('quality');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].prompt.name).toBe('prompt-a');
  });

  it('should include score in results', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'code-review', description: 'Review code', tags: [], library: 'test' },
    ]);

    const results = engine.search('review');

    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].score).toBe('number');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should support prefix matching', () => {
    const engine = createSearchEngine({ prefix: true });

    engine.index([
      { name: 'refactoring', description: 'Code refactoring guide', tags: [], library: 'test' },
      { name: 'testing', description: 'Testing guide', tags: [], library: 'test' },
    ]);

    // "ref" should match "refactoring" via prefix
    const results = engine.search('ref');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].prompt.name).toBe('refactoring');
  });

  it('should require all terms with AND combineWith', () => {
    const engine = createSearchEngine({ combineWith: 'AND' });

    engine.index([
      { name: 'code-review', description: 'Review code quality', tags: ['code'], library: 'test' },
      { name: 'code-format', description: 'Format code style', tags: ['code'], library: 'test' },
      { name: 'review-guide', description: 'General review guide', tags: [], library: 'test' },
    ]);

    // Both "code" and "review" must match
    const results = engine.search('code review');

    expect(results.length).toBe(1);
    expect(results[0].prompt.name).toBe('code-review');
  });

  it('should match any term with OR combineWith', () => {
    const engine = createSearchEngine({ combineWith: 'OR' });

    engine.index([
      { name: 'code-review', description: 'Review code quality', tags: [], library: 'test' },
      { name: 'code-format', description: 'Format code style', tags: [], library: 'test' },
      { name: 'review-guide', description: 'General review guide', tags: [], library: 'test' },
    ]);

    // Either "code" or "review" can match
    const results = engine.search('code review');

    // All three should match (code-review matches both, others match one)
    expect(results.length).toBe(3);
  });

  it('should boost name field higher than content', () => {
    const engine = createSearchEngine();

    engine.index([
      { name: 'authentication', description: 'Handle auth', tags: [], library: 'test' },
      { name: 'setup-guide', description: 'Authentication setup instructions', tags: [], library: 'test' },
    ]);

    const results = engine.search('authentication');

    // Name match should score higher than description match
    expect(results.length).toBe(2);
    expect(results[0].prompt.name).toBe('authentication');
  });
});
