import { describe, expect,it } from 'vitest';

import { Pupt } from '../../src/api';
import type { PromptSource } from '../../src/types/prompt-source';

describe('all prompt sources together', () => {
  it('should load prompts from local and PromptSource instances simultaneously', async () => {
    const customSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'custom.prompt', content: '<Prompt name="custom"><Task>Custom</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' },  // local
        customSource,                              // PromptSource instance
      ],
    });
    await pupt.init();

    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(3); // 2 from local + 1 custom

    // Verify specific prompts from each source
    expect(pupt.getPrompt('greeting')).toBeDefined();
    expect(pupt.getPrompt('code-review')).toBeDefined();
    expect(pupt.getPrompt('custom')).toBeDefined();
  });

  it('should handle mixed sources with one failing gracefully', async () => {
    const failingSource: PromptSource = {
      async getPrompts() { throw new Error('Source unavailable'); },
    };
    const workingSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'inline.prompt', content: '<Prompt name="inline"><Task>Inline task</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' },
        failingSource,
        workingSource,
      ],
    });
    await pupt.init();

    // Should have prompts from local + working source, skipping the failing one
    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(3); // 2 from local + 1 from working

    expect(pupt.getPrompt('greeting')).toBeDefined();
    expect(pupt.getPrompt('inline')).toBeDefined();

    // Should have a warning for the failing source
    expect(pupt.getWarnings()).toHaveLength(1);
    expect(pupt.getWarnings()[0]).toContain('Source unavailable');
  });

  it('should make all discovered prompts searchable regardless of source type', async () => {
    const customSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'searchable.prompt', content: '<Prompt name="searchable" description="A searchable prompt" tags={["search"]}><Task>Search test</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' },
        customSource,
      ],
    });
    await pupt.init();

    // Search should work across all sources
    const results = pupt.searchPrompts('searchable');
    expect(results.length).toBeGreaterThan(0);

    // Tag-based retrieval should also work
    const searchTagged = pupt.getPrompts({ tags: ['search'] });
    expect(searchTagged).toHaveLength(1);
    expect(searchTagged[0].name).toBe('searchable');
  });

  it('should render prompts from all source types', async () => {
    const customSource: PromptSource = {
      async getPrompts() {
        return [{
          filename: 'renderable.prompt',
          content: '<Prompt name="renderable"><Role>You are helpful.</Role><Task>Help the user.</Task></Prompt>',
        }];
      },
    };

    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' },
        customSource,
      ],
    });
    await pupt.init();

    // Render from local source
    const greeting = pupt.getPrompt('greeting');
    const greetingResult = await greeting!.render();
    expect(greetingResult.ok).toBe(true);
    expect(greetingResult.text.length).toBeGreaterThan(0);

    // Render from custom source
    const renderable = pupt.getPrompt('renderable');
    const renderableResult = await renderable!.render();
    expect(renderableResult.ok).toBe(true);
    expect(renderableResult.text.length).toBeGreaterThan(0);
  });
});
