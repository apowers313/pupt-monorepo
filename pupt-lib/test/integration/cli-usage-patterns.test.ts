import { describe, expect,it } from 'vitest';

import { Pupt } from '../../src/api';
import type { ModuleEntry } from '../../src/types/module';
import type { PromptSource } from '../../src/types/prompt-source';

describe('CLI integration patterns', () => {
  it('should support a modules array mixing entry types and package references', async () => {
    // Simulates what the CLI passes after reading .pt-config.json
    const modules: ModuleEntry[] = [
      { name: 'basic', type: 'local', source: './test/fixtures/prompt-packages/basic' },
      { source: './test/fixtures/prompt-sources/mock-source', config: { path: 'test/fixtures/prompt-packages/basic' } },
    ];
    const pupt = new Pupt({ modules });
    await pupt.init();
    expect(pupt.getPrompts().length).toBeGreaterThan(0);
    expect(pupt.searchPrompts('greeting').length).toBeGreaterThan(0);
  });

  it('should support promptDirs-style local paths as module string entries', async () => {
    // Old promptDirs paths work identically as module entries
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();
    expect(pupt.getPrompts().length).toBeGreaterThan(0);
  });

  it('should expose searchPrompts() for CLI prompt discovery UI', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();
    const results = pupt.searchPrompts('review');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should expose getWarnings() for CLI error display', async () => {
    const failingSource: PromptSource = {
      async getPrompts() { throw new Error('Source unavailable'); },
    };
    const pupt = new Pupt({ modules: [failingSource, { name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }] });
    await pupt.init();
    expect(pupt.getWarnings()).toHaveLength(1);
    expect(pupt.getPrompts().length).toBeGreaterThan(0); // working source still loaded
  });

  it('should support getPromptById() for precise prompt selection in CLI', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();
    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);

    // Each prompt should have a unique ID that can be used for precise lookup
    const first = prompts[0];
    const byId = pupt.getPromptById(first.id);
    expect(byId).toBeDefined();
    expect(byId!.name).toBe(first.name);
  });

  it('should support tag-based filtering for CLI category navigation', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();

    // Filter by tag (useful for CLI category menus)
    const codePrompts = pupt.getPrompts({ tags: ['code'] });
    expect(codePrompts.length).toBe(1);
    expect(codePrompts[0].name).toBe('code-review');

    // All tags discoverable for building navigation
    const allTags = pupt.getTags();
    expect(allTags).toContain('test');
    expect(allTags).toContain('code');
  });

  it('should render prompts discovered through the API', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'basic', type: 'local' as const, source: './test/fixtures/prompt-packages/basic' }],
    });
    await pupt.init();

    const greeting = pupt.getPrompt('greeting');
    expect(greeting).toBeDefined();

    const result = await greeting!.render();
    expect(result.ok).toBe(true);
    expect(result.text).toContain('friendly assistant');
  });

  it('should handle empty modules array gracefully', async () => {
    const pupt = new Pupt({ modules: [] });
    await pupt.init();
    expect(pupt.getPrompts()).toHaveLength(0);
    expect(pupt.getWarnings()).toHaveLength(0);
  });

  it('should handle undefined modules gracefully', async () => {
    const pupt = new Pupt({});
    await pupt.init();
    expect(pupt.getPrompts()).toHaveLength(0);
    expect(pupt.getWarnings()).toHaveLength(0);
  });
});
