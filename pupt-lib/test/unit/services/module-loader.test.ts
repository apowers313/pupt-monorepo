import { beforeEach,describe, expect, it, vi } from 'vitest';

import { Component } from '../../../src/component';
import { jsx } from '../../../src/jsx-runtime';
import { ModuleLoader } from '../../../src/services/module-loader';
import type { ResolvedModuleEntry } from '../../../src/types/module';
import type { PromptSource } from '../../../src/types/prompt-source';

// Create test components extending Component
class TestComponent extends Component<{ children?: unknown }> {
  render(): string {
    return 'test';
  }
}

class AnotherComponent extends Component<{ children?: unknown }> {
  render(): string {
    return 'test2';
  }
}

describe('ModuleLoader', () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  describe('detectComponents', () => {
    it('should detect components in module exports', () => {
      const mockExports = {
        MyComponent: TestComponent,
        notAComponent: 'string',
        AnotherComponent: AnotherComponent,
        alsoNotAComponent: 42,
        functionNotComponent: () => 'test',
      };

      const components = loader.detectComponents(mockExports);

      expect(Object.keys(components)).toHaveLength(2);
      expect(Object.keys(components)).toContain('MyComponent');
      expect(Object.keys(components)).toContain('AnotherComponent');
    });

    it('should return empty object for exports with no components', () => {
      const mockExports = {
        notAComponent: 'string',
        alsoNot: 42,
      };

      const components = loader.detectComponents(mockExports);

      expect(Object.keys(components)).toHaveLength(0);
    });
  });

  describe('detectPrompts', () => {
    it('should detect prompts in module exports', () => {
      const mockExports = {
        myPrompt: jsx('Prompt', { name: 'my-prompt', children: 'test' }),
        notAPrompt: 'string',
        anotherPrompt: jsx('Prompt', { name: 'another', children: 'content' }),
      };

      const prompts = loader.detectPrompts(mockExports);

      expect(Object.keys(prompts)).toHaveLength(2);
      expect(Object.keys(prompts)).toContain('myPrompt');
      expect(Object.keys(prompts)).toContain('anotherPrompt');
    });

    it('should return empty object for exports with no prompts', () => {
      const mockExports = {
        notAPrompt: 'string',
        alsoNot: { type: 'something', props: {} },
      };

      const prompts = loader.detectPrompts(mockExports);

      expect(Object.keys(prompts)).toHaveLength(0);
    });
  });

  describe('parsePackageSource', () => {
    it('should parse npm package without version', () => {
      const result = loader.parsePackageSource('@acme/prompts');

      expect(result.name).toBe('@acme/prompts');
      expect(result.version).toBeUndefined();
    });

    it('should parse npm package with version', () => {
      const result = loader.parsePackageSource('@acme/prompts@1.0.0');

      expect(result.name).toBe('@acme/prompts');
      expect(result.version).toBe('1.0.0');
    });

    it('should parse simple package without version', () => {
      const result = loader.parsePackageSource('lodash');

      expect(result.name).toBe('lodash');
      expect(result.version).toBeUndefined();
    });

    it('should parse simple package with version', () => {
      const result = loader.parsePackageSource('lodash@4.17.0');

      expect(result.name).toBe('lodash');
      expect(result.version).toBe('4.17.0');
    });
  });

  describe('clear', () => {
    it('should clear all loaded modules and versions', async () => {
      const doLoadSpy = vi.spyOn(loader as never, 'doLoad');
      doLoadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'acme-prompts',
        type: 'npm',
        source: '@acme/prompts',
        version: '1.0.0',
      };

      // Load a module
      await loader.loadResolvedEntry(entry);

      // Clear everything
      loader.clear();

      // Should be able to load a different version now (no conflict)
      doLoadSpy.mockResolvedValue({
        name: 'test-lib-v2',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry2: ResolvedModuleEntry = {
        name: 'acme-prompts',
        type: 'npm',
        source: '@acme/prompts',
        version: '2.0.0',
      };

      // This should not throw version conflict error since we cleared
      await expect(loader.loadResolvedEntry(entry2)).resolves.toBeDefined();

      // Should have been called twice (not cached after clear)
      expect(doLoadSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('ModuleEntry polymorphism', () => {
    it('should accept a PromptSource instance via loadEntry', async () => {
      const mockSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'test.prompt', content: '<Prompt name="test"><Task>Do stuff</Task></Prompt>' }];
        },
      };
      const library = await loader.loadEntry(mockSource);
      expect(Object.keys(library.prompts)).toContain('test');
      expect(library.prompts.test.name).toBe('test');
    });

    it('should accept a ResolvedModuleEntry via loadEntry', async () => {
      const doLoadSpy = vi.spyOn(loader as never, 'doLoad');
      doLoadSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'my-lib',
        type: 'npm',
        source: 'my-lib',
      };

      const library = await loader.loadEntry(entry);
      expect(library.name).toBe('my-lib');
    });

    it('should accept { source, config } package references via loadEntry', async () => {
      const library = await loader.loadPackageReference({
        source: './test/fixtures/prompt-sources/mock-source',
        config: { path: 'test/fixtures/prompt-packages/basic' },
      });
      expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
      expect(library.prompts.greeting).toBeDefined();
      expect(library.prompts['code-review']).toBeDefined();
    });

    it('should throw for invalid module entry', async () => {
      await expect(
        loader.loadEntry(42 as never),
      ).rejects.toThrow('Invalid module entry');
    });
  });

  describe('loadPromptSource', () => {
    it('should compile discovered .prompt files into CompiledPrompts', async () => {
      const mockSource: PromptSource = {
        async getPrompts() {
          return [
            { filename: 'one.prompt', content: '<Prompt name="one"><Task>First task</Task></Prompt>' },
            { filename: 'two.prompt', content: '<Prompt name="two"><Task>Second task</Task></Prompt>' },
          ];
        },
      };
      const library = await loader.loadPromptSource(mockSource);
      expect(Object.keys(library.prompts)).toHaveLength(2);
      expect(library.prompts.one.name).toBe('one');
      expect(library.prompts.one.id).toMatch(/^[0-9a-f-]+$/);
      expect(library.prompts.two.name).toBe('two');
      expect(library.prompts.two.id).toMatch(/^[0-9a-f-]+$/);
      // IDs should be unique
      expect(library.prompts.one.id).not.toBe(library.prompts.two.id);
      expect(library.components).toEqual({});
    });

    it('should accept optional name parameter', async () => {
      const mockSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'test.prompt', content: '<Prompt name="test"><Task>Do stuff</Task></Prompt>' }];
        },
      };
      const library = await loader.loadPromptSource(mockSource, 'custom-source');
      expect(library.name).toBe('custom-source');
    });

    it('should use filename as name when prompt has no name prop', async () => {
      const mockSource: PromptSource = {
        async getPrompts() {
          return [
            { filename: 'unnamed.prompt', content: '<Prompt><Task>A task</Task></Prompt>' },
          ];
        },
      };
      const library = await loader.loadPromptSource(mockSource);
      expect(library.prompts.unnamed).toBeDefined();
      expect(library.prompts.unnamed.name).toBe('unnamed');
    });
  });

  describe('prompt discovery from local module', () => {
    it('should include both components and prompts from same source', async () => {
      const entry: ResolvedModuleEntry = {
        name: 'with-components',
        type: 'local',
        source: './test/fixtures/prompt-packages/with-components',
      };
      const library = await loader.loadResolvedEntry(entry);
      expect(Object.keys(library.components).length).toBeGreaterThan(0);
      expect(library.components).toHaveProperty('Greeting');
      expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
      expect(library.prompts.helper).toBeDefined();
      expect(library.prompts.helper.name).toBe('helper');
    });
  });
});
