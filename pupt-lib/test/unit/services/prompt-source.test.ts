import { describe, it, expect } from 'vitest';
import { LocalPromptSource } from '../../../src/services/prompt-sources/local-prompt-source';
import { isPromptSource } from '../../../src/types/prompt-source';

describe('LocalPromptSource', () => {
  it('should discover .prompt files in a directory', async () => {
    const source = new LocalPromptSource('test/fixtures/prompt-packages/basic/prompts');
    const prompts = await source.getPrompts();
    expect(prompts).toHaveLength(2);
    expect(prompts.map(p => p.filename).sort()).toEqual(['greeting.prompt', 'review.prompt']);
    expect(prompts[0].content).toContain('<Prompt');
  });

  it('should discover .prompt files in prompts/ subdirectory when given package root', async () => {
    const source = new LocalPromptSource('test/fixtures/prompt-packages/basic');
    const prompts = await source.getPrompts();
    expect(prompts).toHaveLength(2);
  });

  it('should return empty array for directory with no .prompt files', async () => {
    const source = new LocalPromptSource('test/fixtures/prompt-packages/empty');
    const prompts = await source.getPrompts();
    expect(prompts).toEqual([]);
  });

  it('should throw for non-existent directory', async () => {
    const source = new LocalPromptSource('/does/not/exist');
    await expect(source.getPrompts()).rejects.toThrow();
  });

  it('should ignore non-.prompt files in the directory', async () => {
    const source = new LocalPromptSource('test/fixtures/prompt-packages/mixed');
    const prompts = await source.getPrompts();
    expect(prompts.every(p => p.filename.endsWith('.prompt'))).toBe(true);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].filename).toBe('valid.prompt');
  });
});

describe('isPromptSource', () => {
  it('should return true for objects with getPrompts method', () => {
    const source = new LocalPromptSource('test/fixtures/prompt-packages/basic');
    expect(isPromptSource(source)).toBe(true);
  });

  it('should return true for plain objects implementing PromptSource', () => {
    const source = {
      async getPrompts() { return []; },
    };
    expect(isPromptSource(source)).toBe(true);
  });

  it('should return false for non-PromptSource values', () => {
    expect(isPromptSource(null)).toBe(false);
    expect(isPromptSource(undefined)).toBe(false);
    expect(isPromptSource('string')).toBe(false);
    expect(isPromptSource(42)).toBe(false);
    expect(isPromptSource({})).toBe(false);
    expect(isPromptSource({ getPrompts: 'not a function' })).toBe(false);
  });
});
