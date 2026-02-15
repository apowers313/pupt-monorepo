import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleLoader } from '../../../src/services/module-loader';
import { Pupt } from '../../../src/api';
import type { PromptSource } from '../../../src/types/prompt-source';

describe('prompt metadata', () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  it('should assign a unique ID to each discovered prompt', async () => {
    const library = await loader.load('./test/fixtures/prompt-packages/basic');
    const prompts = Object.values(library.prompts);
    const ids = prompts.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
  });

  it('should extract version from prompt metadata when present', async () => {
    const library = await loader.load('./test/fixtures/prompt-packages/versioned');
    expect(library.prompts['versioned-prompt'].version).toBe('1.2.0');
  });

  it('should set version to undefined when not specified in prompt', async () => {
    const library = await loader.load('./test/fixtures/prompt-packages/basic');
    const prompt = Object.values(library.prompts)[0];
    expect(prompt.version).toBeUndefined();
  });

  it('should allow multiple prompts with the same name across sources', async () => {
    const sourceA: PromptSource = {
      async getPrompts() {
        return [{ filename: 'a.prompt', content: '<Prompt name="review"><Task>Review A</Task></Prompt>' }];
      },
    };
    const sourceB: PromptSource = {
      async getPrompts() {
        return [{ filename: 'b.prompt', content: '<Prompt name="review"><Task>Review B</Task></Prompt>' }];
      },
    };
    const pupt = new Pupt({ modules: [sourceA, sourceB] });
    await pupt.init();
    const prompts = pupt.getPrompts();
    expect(prompts.filter(p => p.name === 'review')).toHaveLength(2);
    // Each should have a distinct ID
    const ids = prompts.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should expose id on discovered prompts via Pupt API', async () => {
    const pupt = new Pupt({
      modules: ['./test/fixtures/prompt-packages/basic'],
    });
    await pupt.init();
    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    for (const p of prompts) {
      expect(p.id).toBeDefined();
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it('should support getPromptById() for precise lookup', async () => {
    const pupt = new Pupt({
      modules: ['./test/fixtures/prompt-packages/basic'],
    });
    await pupt.init();
    const prompts = pupt.getPrompts();
    const firstPrompt = prompts[0];
    const found = pupt.getPromptById(firstPrompt.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe(firstPrompt.name);
    expect(found!.id).toBe(firstPrompt.id);
  });

  it('should return undefined from getPromptById() for non-existent ID', async () => {
    const pupt = new Pupt({
      modules: ['./test/fixtures/prompt-packages/basic'],
    });
    await pupt.init();
    expect(pupt.getPromptById('non-existent-id')).toBeUndefined();
  });

  it('should extract description and tags from prompt metadata', async () => {
    const library = await loader.load('./test/fixtures/prompt-packages/basic');
    const greeting = library.prompts['greeting'];
    expect(greeting.description).toBe('A simple greeting');
    expect(greeting.tags).toContain('test');
  });
});
