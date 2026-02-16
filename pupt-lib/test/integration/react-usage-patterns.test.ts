import { describe, it, expect } from 'vitest';
import { Pupt } from '../../src/api';
import type { PromptSource } from '../../src/types/prompt-source';

describe('pupt-react integration patterns', () => {
  it('should accept PromptSource instances in modules (programmatic usage)', async () => {
    const customSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'react-test.prompt', content: '<Prompt name="react-test"><Task>Test</Task></Prompt>' }];
      },
    };
    const pupt = new Pupt({ modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }, customSource] });
    await pupt.init();
    const all = pupt.getPrompts();
    expect(all.find(p => p.name === 'react-test')).toBeDefined();
  });

  it('should accept package references in modules (config-driven usage)', async () => {
    const pupt = new Pupt({
      modules: [
        { source: './test/fixtures/prompt-sources/mock-source', config: { path: 'test/fixtures/prompt-packages/basic' } },
      ],
    });
    await pupt.init();
    expect(pupt.getPrompts().length).toBeGreaterThan(0);
  });

  it('should make prompts searchable by name, description, and tags', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();
    // Search by tag
    expect(pupt.searchPrompts('test').length).toBeGreaterThan(0);
    // Search by description keyword
    expect(pupt.searchPrompts('greeting').length).toBeGreaterThan(0);
  });

  it('should expose prompt elements for custom rendering pipelines', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();

    const prompt = pupt.getPrompt('greeting');
    expect(prompt).toBeDefined();
    // pupt-react would use the element property for custom rendering
    expect(prompt!.element).toBeDefined();
  });

  it('should expose input iterators for building form UIs', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();

    const prompt = pupt.getPrompt('greeting');
    expect(prompt).toBeDefined();
    // pupt-react would use getInputIterator() to build form fields
    const iterator = prompt!.getInputIterator();
    expect(iterator).toBeDefined();
  });

  it('should support mixing multiple source types for flexible integration', async () => {
    const inlineSource: PromptSource = {
      async getPrompts() {
        return [
          { filename: 'inline-a.prompt', content: '<Prompt name="inline-a" tags={["inline"]}><Task>Task A</Task></Prompt>' },
          { filename: 'inline-b.prompt', content: '<Prompt name="inline-b" tags={["inline"]}><Task>Task B</Task></Prompt>' },
        ];
      },
    };

    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' },
        inlineSource,
      ],
    });
    await pupt.init();

    // All sources loaded
    const all = pupt.getPrompts();
    expect(all.length).toBe(4); // 2 from basic + 2 from inline

    // Tag filtering works across sources
    const inlineOnly = pupt.getPrompts({ tags: ['inline'] });
    expect(inlineOnly).toHaveLength(2);

    const testOnly = pupt.getPrompts({ tags: ['test'] });
    expect(testOnly.length).toBeGreaterThan(0);
  });

  it('should provide unique IDs for all prompts across sources', async () => {
    const sourceA: PromptSource = {
      async getPrompts() {
        return [{ filename: 'a.prompt', content: '<Prompt name="prompt-a"><Task>A</Task></Prompt>' }];
      },
    };
    const sourceB: PromptSource = {
      async getPrompts() {
        return [{ filename: 'b.prompt', content: '<Prompt name="prompt-b"><Task>B</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({ modules: [sourceA, sourceB] });
    await pupt.init();

    const prompts = pupt.getPrompts();
    const ids = prompts.map(p => p.id);
    // All IDs should be unique
    expect(new Set(ids).size).toBe(ids.length);
    // All IDs should be non-empty strings
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
  });

  it('should gracefully handle sources that fail without breaking the UI', async () => {
    const failingSource: PromptSource = {
      async getPrompts() { throw new Error('API key expired'); },
    };
    const workingSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'works.prompt', content: '<Prompt name="works"><Task>Works</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({ modules: [failingSource, workingSource] });
    await pupt.init();

    // UI can still render working prompts
    expect(pupt.getPrompts()).toHaveLength(1);
    expect(pupt.getPrompt('works')).toBeDefined();

    // UI can show warnings to the user
    const warnings = pupt.getWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('API key expired');
  });
});
