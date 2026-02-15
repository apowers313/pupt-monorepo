import path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { Pupt } from '../../../src/api';
import type { PromptSource } from '../../../src/types/prompt-source';
import { ModuleLoader } from '../../../src/services/module-loader';

describe('module deduplication', () => {
  it('should not load the same string module twice', async () => {
    const pupt = new Pupt({
      modules: [
        './test/fixtures/prompt-packages/basic',
        './test/fixtures/prompt-packages/basic', // duplicate
      ],
    });
    await pupt.init();
    // Should have 2 prompts (from basic), not 4
    expect(pupt.getPrompts()).toHaveLength(2);
  });

  it('should deduplicate equivalent relative paths', async () => {
    const pupt = new Pupt({
      modules: [
        './test/fixtures/prompt-packages/basic',
        'test/fixtures/prompt-packages/basic', // same path, different format — treated as npm
      ],
    });
    await pupt.init();
    // The second path is treated as npm (no ./ prefix) so it will fail.
    // Only first should load. Warnings expected for second.
    expect(pupt.getPrompts()).toHaveLength(2);
  });

  it('should not deduplicate different sources that happen to share prompt names', async () => {
    const pupt = new Pupt({
      modules: [
        './test/fixtures/prompt-packages/basic',
        './test/fixtures/prompt-packages/alt-basic', // different source, same prompt names
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
    expect(loader.normalizeSource('MyPackage')).toBe('mypackage');
    expect(loader.normalizeSource('My-Package@1.0.0')).toBe('my-package@1.0.0');
  });

  it('should preserve URLs as-is', () => {
    const url = 'https://cdn.example.com/lib.js';
    expect(loader.normalizeSource(url)).toBe(url);
  });

  it('should preserve GitHub sources as-is', () => {
    const source = 'github:user/repo#main';
    expect(loader.normalizeSource(source)).toBe(source);
  });

  it('should normalize local paths by prepending cwd', () => {
    const result = loader.normalizeSource('./test/fixtures/prompt-packages/basic');
    expect(result).toContain('test/fixtures/prompt-packages/basic');
    // Should contain an absolute path (works on both POSIX and Windows)
    expect(path.isAbsolute(result)).toBe(true);
  });
});
