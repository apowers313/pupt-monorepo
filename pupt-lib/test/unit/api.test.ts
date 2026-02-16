import { describe, it, expect } from 'vitest';
import { Pupt } from '../../src/api';
import type { PromptSource } from '../../src/types/prompt-source';

describe('Pupt', () => {
  it('should initialize with modules', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    // Verify initialization completes without error
    const prompts = pupt.getPrompts();
    expect(Array.isArray(prompts)).toBe(true);
  });

  it('should return discovered prompts', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompts = pupt.getPrompts();

    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts[0].name).toBeDefined();
  });

  it('should get prompt by name', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompt = pupt.getPrompt('test-prompt');

    expect(prompt).toBeDefined();
    expect(prompt?.name).toBe('test-prompt');
  });

  it('should search prompts', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const results = pupt.searchPrompts('test');

    expect(results.length).toBeGreaterThan(0);
  });

  it('should get prompts by tag', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompts = pupt.getPromptsByTag('example');

    expect(Array.isArray(prompts)).toBe(true);
  });

  it('should return empty array for non-existent tag', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompts = pupt.getPromptsByTag('non-existent-tag');

    expect(Array.isArray(prompts)).toBe(true);
    expect(prompts.length).toBe(0);
  });

  it('should return undefined for non-existent prompt', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompt = pupt.getPrompt('non-existent-prompt');

    expect(prompt).toBeUndefined();
  });

  it('should not re-initialize if already initialized', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();
    const prompts1 = pupt.getPrompts();

    await pupt.init(); // Second call should be no-op
    const prompts2 = pupt.getPrompts();

    expect(prompts1.length).toBe(prompts2.length);
  });

  it('should get all available tags', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const tags = pupt.getTags();

    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
  });
});

describe('Pupt.getPrompts with tag filter', () => {
  it('should filter prompts by tags', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    // Filter by 'test' tag
    const filtered = pupt.getPrompts({ tags: ['test'] });

    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(p => {
      expect(p.tags).toContain('test');
    });
  });

  it('should filter by multiple tags (AND logic)', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    // Filter by both 'test' and 'example' tags
    const filtered = pupt.getPrompts({ tags: ['test', 'example'] });

    filtered.forEach(p => {
      expect(p.tags).toContain('test');
      expect(p.tags).toContain('example');
    });
  });

  it('should return empty array when no prompts match all tags', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const filtered = pupt.getPrompts({ tags: ['nonexistent-tag-xyz'] });

    expect(filtered).toEqual([]);
  });
});

describe('DiscoveredPrompt', () => {
  it('should render with correct scope', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompt = pupt.getPrompt('test-prompt');
    const result = await prompt?.render({ inputs: { name: 'Alice' } });

    expect(result?.text).toBeDefined();
  });

  it('should render with Map inputs', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompt = pupt.getPrompt('test-prompt');
    // Pass inputs as a Map instead of an object
    const inputsMap = new Map<string, unknown>([['name', 'Bob']]);
    const result = await prompt?.render({ inputs: inputsMap });

    expect(result?.text).toBeDefined();
  });

  it('should provide input iterator', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompt = pupt.getPrompt('prompt-with-inputs');
    const iterator = prompt?.getInputIterator();

    expect(iterator).toBeDefined();
    await iterator?.start();
    expect(iterator?.current()).toBeDefined();
  });

  it('should have description and tags', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    const prompt = pupt.getPrompt('test-prompt');

    expect(prompt?.description).toBe('A simple test prompt');
    expect(prompt?.tags).toContain('test');
    expect(prompt?.tags).toContain('example');
  });
});

describe('Pupt with mixed module entries', () => {
  it('should accept PromptSource instances alongside ResolvedModuleEntry', async () => {
    const mockSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'custom.prompt', content: '<Prompt name="custom"><Task>Test</Task></Prompt>' }];
      },
    };
    const pupt = new Pupt({ modules: [mockSource] });
    await pupt.init();
    expect(pupt.getPrompt('custom')).toBeDefined();
    expect(pupt.getPrompt('custom')!.name).toBe('custom');
  });

  it('should accept PromptSource instances mixed with ResolvedModuleEntry modules', async () => {
    const mockSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'dynamic.prompt', content: '<Prompt name="dynamic" tags={["dynamic"]}><Task>Dynamic task</Task></Prompt>' }];
      },
    };
    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' },
        mockSource,
      ],
    });
    await pupt.init();

    // Should have prompts from both sources
    const allPrompts = pupt.getPrompts();
    expect(allPrompts.length).toBeGreaterThanOrEqual(3); // 2 from basic + 1 from mockSource

    expect(pupt.getPrompt('greeting')).toBeDefined();
    expect(pupt.getPrompt('dynamic')).toBeDefined();
  });

  it('should accept { source, config } package references', async () => {
    const pupt = new Pupt({
      modules: [
        {
          source: './test/fixtures/prompt-sources/mock-source',
          config: { path: 'test/fixtures/prompt-packages/basic' },
        },
      ],
    });
    await pupt.init();

    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    expect(pupt.getPrompt('greeting')).toBeDefined();
  });

  it('should render prompts from PromptSource instances', async () => {
    const mockSource: PromptSource = {
      async getPrompts() {
        return [{
          filename: 'renderable.prompt',
          content: '<Prompt name="renderable"><Role>You are helpful.</Role><Task>Help the user.</Task></Prompt>',
        }];
      },
    };
    const pupt = new Pupt({ modules: [mockSource] });
    await pupt.init();

    const prompt = pupt.getPrompt('renderable');
    expect(prompt).toBeDefined();

    const result = await prompt!.render();
    expect(result.ok).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
  });
});
