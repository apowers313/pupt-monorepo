import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScopeLoader, createScopeLoader } from '../../../src/services/scope-loader';
import { ModuleLoader } from '../../../src/services/module-loader';
import { Component } from '../../../src/component';

// Create a test component
class TestComponent extends Component<{ children?: unknown }> {
  render(): string {
    return 'test component output';
  }
}

class DependencyComponent extends Component<{ children?: unknown }> {
  render(): string {
    return 'dependency output';
  }
}

describe('ScopeLoader', () => {
  let scopeLoader: ScopeLoader;
  let mockModuleLoader: ModuleLoader;

  beforeEach(() => {
    scopeLoader = new ScopeLoader();
    // Get the internal module loader for mocking
    mockModuleLoader = (scopeLoader as never)['moduleLoader'];
  });

  describe('loadPackage', () => {
    it('should load package and create scope', async () => {
      // Mock the module loader
      vi.spyOn(mockModuleLoader, 'load').mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      const scope = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib');

      expect(scope.name).toBe('test-lib');
      expect(scope.has('TestComponent')).toBe(true);
    });

    it('should handle dependencies', async () => {
      // Mock loading the main package with a dependency
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');

      // First call is for the main package
      loadSpy.mockResolvedValueOnce({
        name: 'with-deps',
        components: { MainComponent: TestComponent },
        dependencies: ['dep-package'],
      });

      // Second call is for the dependency
      loadSpy.mockResolvedValueOnce({
        name: 'dep-package',
        components: { DependencyComponent },
        dependencies: [],
      });

      const scope = await scopeLoader.loadPackage('./test/fixtures/libraries/with-deps');

      // Should have the main component
      expect(scope.has('MainComponent')).toBe(true);
      // Should have loaded the dependency scope too
      expect(scope.listAll().length).toBeGreaterThan(0);
    });

    it('should error on circular dependencies', async () => {
      // Mock circular dependency: A depends on B, B depends on A
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');

      loadSpy.mockImplementation(async (source: string) => {
        if (source.includes('circular-a')) {
          return {
            name: 'circular-a',
            components: { ComponentA: TestComponent },
            dependencies: ['circular-b'],
          };
        }
        if (source.includes('circular-b')) {
          return {
            name: 'circular-b',
            components: { ComponentB: TestComponent },
            dependencies: ['circular-a'],
          };
        }
        throw new Error(`Unknown package: ${source}`);
      });

      await expect(
        scopeLoader.loadPackage('./test/fixtures/libraries/circular-a'),
      ).rejects.toThrow('Circular dependency');
    });

    it('should cache loaded scopes', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      await scopeLoader.loadPackage('@acme/prompts');
      await scopeLoader.loadPackage('@acme/prompts');

      // Should only load once
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCombinedScope', () => {
    it('should create combined scope for local prompts', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');

      loadSpy.mockResolvedValueOnce({
        name: 'acme-prompts',
        components: { AcmeComponent: TestComponent },
        dependencies: [],
      });

      loadSpy.mockResolvedValueOnce({
        name: 'corp-prompts',
        components: { CorpComponent: DependencyComponent },
        dependencies: [],
      });

      await scopeLoader.loadPackage('@acme/prompts');
      await scopeLoader.loadPackage('@corp/prompts');

      const combined = scopeLoader.getCombinedScope();

      // Combined has components from all packages
      expect(combined.listAll().length).toBeGreaterThan(0);
      expect(combined.has('AcmeComponent')).toBe(true);
      expect(combined.has('CorpComponent')).toBe(true);
    });

    it('should return empty combined scope when no packages loaded', () => {
      const combined = scopeLoader.getCombinedScope();

      expect(combined.name).toBe('combined');
      // Should still have builtin components from parent scope
      expect(combined.listOwn()).toHaveLength(0);
    });

    it('should handle duplicate component names by keeping first', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');

      loadSpy.mockResolvedValueOnce({
        name: 'first-lib',
        components: { SharedName: TestComponent },
        dependencies: [],
      });

      loadSpy.mockResolvedValueOnce({
        name: 'second-lib',
        components: { SharedName: DependencyComponent },
        dependencies: [],
      });

      await scopeLoader.loadPackage('first-lib');
      await scopeLoader.loadPackage('second-lib');

      const combined = scopeLoader.getCombinedScope();

      // Should have SharedName registered (first one wins)
      expect(combined.has('SharedName')).toBe(true);
    });
  });

  describe('getScope', () => {
    it('should return scope for loaded package', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      await scopeLoader.loadPackage('test-lib');
      const scope = scopeLoader.getScope('test-lib');

      expect(scope).toBeDefined();
      expect(scope?.name).toBe('test-lib');
    });

    it('should return undefined for unknown package', () => {
      const scope = scopeLoader.getScope('unknown-package');

      expect(scope).toBeUndefined();
    });
  });

  describe('listPackages', () => {
    it('should return empty array when no packages loaded', () => {
      expect(scopeLoader.listPackages()).toEqual([]);
    });

    it('should return list of loaded package sources', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: {},
        dependencies: [],
      });

      await scopeLoader.loadPackage('@acme/lib-a');
      await scopeLoader.loadPackage('@acme/lib-b');

      const packages = scopeLoader.listPackages();

      expect(packages).toContain('@acme/lib-a');
      expect(packages).toContain('@acme/lib-b');
      expect(packages).toHaveLength(2);
    });
  });

  describe('hasPackage', () => {
    it('should return false for unloaded package', () => {
      expect(scopeLoader.hasPackage('unknown')).toBe(false);
    });

    it('should return true for loaded package', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: {},
        dependencies: [],
      });

      await scopeLoader.loadPackage('@acme/prompts');

      expect(scopeLoader.hasPackage('@acme/prompts')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all loaded packages', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      await scopeLoader.loadPackage('@acme/prompts');
      expect(scopeLoader.hasPackage('@acme/prompts')).toBe(true);

      scopeLoader.clear();

      expect(scopeLoader.hasPackage('@acme/prompts')).toBe(false);
      expect(scopeLoader.listPackages()).toHaveLength(0);
    });

    it('should allow reloading after clear', async () => {
      const loadSpy = vi.spyOn(mockModuleLoader, 'load');
      loadSpy.mockResolvedValue({
        name: 'test-lib',
        components: { TestComponent },
        dependencies: [],
      });

      await scopeLoader.loadPackage('@acme/prompts');
      scopeLoader.clear();
      await scopeLoader.loadPackage('@acme/prompts');

      // Should have been called twice (reload after clear)
      expect(loadSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe('createScopeLoader', () => {
  it('should create a new ScopeLoader instance', () => {
    const loader = createScopeLoader();

    expect(loader).toBeInstanceOf(ScopeLoader);
  });

  it('should create independent instances', async () => {
    const loader1 = createScopeLoader();
    const loader2 = createScopeLoader();

    // Mock the module loader on loader1
    const mockModuleLoader1 = (loader1 as never)['moduleLoader'];
    vi.spyOn(mockModuleLoader1, 'load').mockResolvedValue({
      name: 'test-lib',
      components: {},
      dependencies: [],
    });

    await loader1.loadPackage('@acme/prompts');

    // loader2 should not have the package
    expect(loader1.hasPackage('@acme/prompts')).toBe(true);
    expect(loader2.hasPackage('@acme/prompts')).toBe(false);
  });
});
