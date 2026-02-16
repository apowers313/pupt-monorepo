import path from 'path';
import { beforeEach,describe, expect, it } from 'vitest';

import { Pupt } from '../../../src/api';
import { ModuleLoader } from '../../../src/services/module-loader';
import type { ResolvedModuleEntry } from '../../../src/types/module';
import type { PromptSource } from '../../../src/types/prompt-source';

describe('module deduplication', () => {
  it('should not load the same module twice', async () => {
    const entry: ResolvedModuleEntry = {
      name: 'basic',
      type: 'local',
      source: './test/fixtures/prompt-packages/basic',
    };
    const pupt = new Pupt({
      modules: [entry, { ...entry }], // duplicate
    });
    await pupt.init();
    // Should have 2 prompts (from basic), not 4
    expect(pupt.getPrompts()).toHaveLength(2);
  });

  it('should not deduplicate different sources that happen to share prompt names', async () => {
    const pupt = new Pupt({
      modules: [
        { name: 'basic', type: 'local', source: './test/fixtures/prompt-packages/basic' },
        { name: 'alt-basic', type: 'local', source: './test/fixtures/prompt-packages/alt-basic' },
      ],
    });
    await pupt.init();
    expect(pupt.getPrompts()).toHaveLength(4); // 2 from each
  });

  it('should not deduplicate PromptSource instances (no way to compare identity)', async () => {
    const makeSource = (): PromptSource => ({
      async getPrompts() {
        return [{ filename: 'test.prompt', content: '<Prompt name="test"><Task>Do stuff</Task></Prompt>' }];
      },
    });
    const pupt = new Pupt({ modules: [makeSource(), makeSource()] });
    await pupt.init();
    // Two distinct instances — both loaded, even though they return the same content
    expect(pupt.getPrompts()).toHaveLength(2);
  });
});

describe('normalizeSource', () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  it('should normalize npm package names to lowercase', () => {
    expect(loader.normalizeSource('MyPackage', 'npm')).toBe('mypackage');
    expect(loader.normalizeSource('My-Package@1.0.0', 'npm')).toBe('my-package@1.0.0');
  });

  it('should preserve URLs as-is', () => {
    const url = 'https://cdn.example.com/lib.js';
    expect(loader.normalizeSource(url, 'url')).toBe(url);
  });

  it('should preserve git sources as-is', () => {
    const source = 'https://github.com/user/repo';
    expect(loader.normalizeSource(source, 'git')).toBe(source);
  });

  it('should normalize local paths by prepending cwd', () => {
    const result = loader.normalizeSource('./test/fixtures/prompt-packages/basic', 'local');
    expect(result).toContain('test/fixtures/prompt-packages/basic');
    // Should contain an absolute path (works on both POSIX and Windows)
    expect(path.isAbsolute(result)).toBe(true);
  });
});
