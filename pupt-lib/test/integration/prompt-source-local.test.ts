import { describe, it, expect } from 'vitest';
import { Pupt } from '../../src/api';

describe('LocalPromptSource integration', () => {
  it('should discover, compile, and render a .prompt file from a local directory', async () => {
    const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/basic'] });
    await pupt.init();
    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);

    const greeting = pupt.getPrompt('greeting');
    expect(greeting).toBeDefined();
    expect(greeting!.description).toBe('A simple greeting');
    expect(greeting!.tags).toContain('test');

    const result = await greeting!.render();
    expect(result.ok).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('should discover multiple prompts from same directory', async () => {
    const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/basic'] });
    await pupt.init();
    const prompts = pupt.getPrompts();

    // Should have 2 prompts: greeting and code-review
    expect(prompts.length).toBe(2);
    const names = prompts.map(p => p.name).sort();
    expect(names).toEqual(['code-review', 'greeting']);
  });

  it('should make discovered prompts searchable', async () => {
    const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/basic'] });
    await pupt.init();

    const results = pupt.searchPrompts('greeting');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should support tag filtering on discovered prompts', async () => {
    const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/basic'] });
    await pupt.init();

    const codePrompts = pupt.getPrompts({ tags: ['code'] });
    expect(codePrompts.length).toBe(1);
    expect(codePrompts[0].name).toBe('code-review');
  });

  it('should handle empty prompt directories gracefully', async () => {
    // The empty directory has no .prompt files and no JS module,
    // so the module loader should skip it with a warning (error isolation)
    const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/empty'] });
    await pupt.init();
    expect(pupt.getPrompts()).toHaveLength(0);
    expect(pupt.getWarnings().length).toBeGreaterThan(0);
  });
});
