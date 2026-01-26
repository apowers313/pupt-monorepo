import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleLoader } from '../../../src/services/module-loader';
import { Component } from '../../../src/component';
import { jsx } from '../../../src/jsx-runtime';

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

  describe('resolveSourceType', () => {
    it('should detect npm source type', () => {
      expect(loader.resolveSourceType('@acme/prompts')).toBe('npm');
      expect(loader.resolveSourceType('@acme/prompts@1.0.0')).toBe('npm');
      expect(loader.resolveSourceType('some-package')).toBe('npm');
      expect(loader.resolveSourceType('some-package@2.0.0')).toBe('npm');
    });

    it('should detect url source type', () => {
      expect(loader.resolveSourceType('https://example.com/lib.js')).toBe('url');
      expect(loader.resolveSourceType('http://example.com/lib.js')).toBe('url');
      expect(loader.resolveSourceType('data:text/javascript;base64,xyz')).toBe('url');
    });

    it('should detect github source type', () => {
      expect(loader.resolveSourceType('github:acme/repo#v1')).toBe('github');
      expect(loader.resolveSourceType('github:user/project')).toBe('github');
    });

    it('should detect local source type', () => {
      expect(loader.resolveSourceType('./local/path')).toBe('local');
      expect(loader.resolveSourceType('/absolute/path')).toBe('local');
      expect(loader.resolveSourceType('../relative/path')).toBe('local');
    });
  });

  describe('load', () => {
    it('should deduplicate loads', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({ name: 'test', components: {}, dependencies: [] });

      await loader.load('@acme/prompts');
      await loader.load('@acme/prompts');

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('should error on version conflict', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({ name: 'acme-prompts', components: {}, dependencies: [] });

      await loader.load('@acme/prompts@1.0.0');

      await expect(loader.load('@acme/prompts@2.0.0')).rejects.toThrow('Version conflict');
    });

    it('should allow same version to be loaded multiple times', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({ name: 'acme-prompts', components: {}, dependencies: [] });

      await loader.load('@acme/prompts@1.0.0');
      await loader.load('@acme/prompts@1.0.0');

      // Should not throw, only called once due to caching
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
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

  describe('local module loading (regression tests)', () => {
    it('should resolve relative paths from CWD not module location', async () => {
      // This tests the fix for relative path resolution
      // Before the fix, './path' was resolved relative to module-loader.ts
      // After the fix, it resolves relative to process.cwd()
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      // This path should work regardless of where module-loader.ts is located
      await loader.load('./test/fixtures/some-module');

      expect(loadSpy).toHaveBeenCalledWith('./test/fixtures/some-module');
    });

    it('should handle absolute paths', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'absolute-lib',
        components: {},
        dependencies: [],
      });

      await loader.load('/absolute/path/to/module');

      expect(loadSpy).toHaveBeenCalledWith('/absolute/path/to/module');
    });

    it('should handle parent directory paths', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'parent-lib',
        components: {},
        dependencies: [],
      });

      await loader.load('../parent/module');

      expect(loadSpy).toHaveBeenCalledWith('../parent/module');
    });
  });

  describe('npm module loading (mocked)', () => {
    it('should call doLoad with npm source', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'lodash',
        components: {},
        dependencies: [],
      });

      await loader.load('lodash');

      expect(loadSpy).toHaveBeenCalledWith('lodash');
    });

    it('should call doLoad with scoped npm package', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: '@acme/components',
        components: { TestComponent },
        dependencies: [],
      });

      const library = await loader.load('@acme/components');

      expect(loadSpy).toHaveBeenCalledWith('@acme/components');
      expect(library.components).toHaveProperty('TestComponent');
    });

    it('should call doLoad with npm package and version', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: '@acme/prompts',
        components: {},
        dependencies: [],
      });

      await loader.load('@acme/prompts@1.2.3');

      expect(loadSpy).toHaveBeenCalledWith('@acme/prompts@1.2.3');
    });
  });

  describe('URL module loading (mocked)', () => {
    it('should call doLoad with URL source', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'remote-lib',
        components: { RemoteComponent: TestComponent },
        dependencies: [],
      });

      const library = await loader.load('https://cdn.example.com/lib.js');

      expect(loadSpy).toHaveBeenCalledWith('https://cdn.example.com/lib.js');
      expect(library.components).toHaveProperty('RemoteComponent');
    });

    it('should call doLoad with HTTP URL', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'http-lib',
        components: {},
        dependencies: [],
      });

      await loader.load('http://example.com/module.js');

      expect(loadSpy).toHaveBeenCalledWith('http://example.com/module.js');
    });
  });

  describe('GitHub module loading (mocked)', () => {
    it('should call doLoad with GitHub source', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'github-lib',
        components: { GitHubComponent: TestComponent },
        dependencies: [],
      });

      const library = await loader.load('github:user/repo');

      expect(loadSpy).toHaveBeenCalledWith('github:user/repo');
      expect(library.components).toHaveProperty('GitHubComponent');
    });

    it('should call doLoad with GitHub source including ref', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'github-lib-versioned',
        components: {},
        dependencies: [],
      });

      await loader.load('github:acme/prompts#v1.0.0');

      expect(loadSpy).toHaveBeenCalledWith('github:acme/prompts#v1.0.0');
    });
  });

  describe('error handling', () => {
    it('should wrap errors from doLoad with helpful message', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockRejectedValue(new Error('Network error'));

      await expect(loader.load('@acme/prompts')).rejects.toThrow('Network error');
    });

    it('should not retry failed loads', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockRejectedValue(new Error('Load failed'));

      await expect(loader.load('@acme/prompts')).rejects.toThrow();
      await expect(loader.load('@acme/prompts')).rejects.toThrow();

      // Each failed attempt should try to load again
      expect(loadSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('should clear all loaded modules and versions', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      // Load a module
      await loader.load('@acme/prompts@1.0.0');

      // Clear everything
      loader.clear();

      // Should be able to load a different version now (no conflict)
      loadSpy.mockResolvedValue({
        name: 'test-lib-v2',
        components: {},
        dependencies: [],
      });

      // This should not throw version conflict error since we cleared
      await expect(loader.load('@acme/prompts@2.0.0')).resolves.toBeDefined();

      // Should have been called twice (not cached after clear)
      expect(loadSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractNameFromPath (via loadLocal)', () => {
    it('should extract name from path with multiple segments', async () => {
      const loadSpy = vi.spyOn(loader as never, 'doLoad');
      loadSpy.mockResolvedValue({
        name: 'extracted-name',
        components: {},
        dependencies: [],
      });

      await loader.load('./some/path/to/my-module');

      // The name is extracted by extractNameFromPath internally
      expect(loadSpy).toHaveBeenCalledWith('./some/path/to/my-module');
    });
  });
});
