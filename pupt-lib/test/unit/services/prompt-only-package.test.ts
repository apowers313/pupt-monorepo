import { beforeEach,describe, expect, it } from 'vitest';

import { ModuleLoader } from '../../../src/services/module-loader';
import { LocalPromptSource } from '../../../src/services/prompt-sources/local-prompt-source';
import type { ResolvedModuleEntry } from '../../../src/types/module';

const promptOnlyEntry: ResolvedModuleEntry = {
  name: 'prompt-only',
  type: 'local',
  source: './test/fixtures/prompt-packages/prompt-only',
};

describe('prompt-only package (no main/exports)', () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  it('should discover prompts from a package with no JS entry point', async () => {
    // The prompt-only fixture has package.json but no main/exports, only prompts/
    const source = new LocalPromptSource('test/fixtures/prompt-packages/prompt-only');
    const prompts = await source.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts[0].filename).toBe('simple.prompt');
  });

  it('should not fail when there is no JS entry point to import()', async () => {
    // Package has package.json with no main/exports, only prompts/
    const library = await loader.loadResolvedEntry(promptOnlyEntry);
    expect(Object.keys(library.components)).toHaveLength(0);
    expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
    expect(library.prompts.simple).toBeDefined();
    expect(library.prompts.simple.name).toBe('simple');
  });

  it('should extract correct metadata from prompt-only package prompts', async () => {
    const library = await loader.loadResolvedEntry(promptOnlyEntry);
    const {simple} = library.prompts;
    expect(simple.description).toBe('A simple prompt from a prompt-only package');
    expect(simple.tags).toContain('simple');
    expect(simple.id).toBeDefined();
  });
});
