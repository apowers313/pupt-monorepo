// Integration tests for module loading
import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleLoader } from '../../src/services/module-loader';
import { ScopeLoader } from '../../src/services/scope-loader';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import { createRegistry } from '../../src/services/component-registry';
import type { ComponentType } from '../../src/types';
import type { Scope } from '../../src/services/scope';

// Helper to convert Scope to a registry that render() can use
function scopeToRegistry(scope: Scope) {
  const registry = createRegistry();
  for (const name of scope.listAll()) {
    const component = scope.get(name);
    if (component) {
      registry.register(name, component);
    }
  }
  return registry;
}

describe('Module Loading Integration', () => {
  describe('ModuleLoader', () => {
    let loader: ModuleLoader;

    beforeEach(() => {
      loader = new ModuleLoader();
    });

    it('should load local module from relative path (regression: path resolution from CWD)', async () => {
      // This test ensures relative paths are resolved from CWD, not from module-loader.ts location
      const library = await loader.load('./test/fixtures/libraries/test-lib/index.ts');

      expect(library.components).toBeDefined();
      expect(Object.keys(library.components)).toContain('SimpleGreeting');
      expect(Object.keys(library.components)).toContain('SimpleTask');
    });

    it('should detect components correctly from loaded module', async () => {
      const library = await loader.load('./test/fixtures/libraries/test-lib/index.ts');

      // Should have 3 components (TestComponent, SimpleGreeting, and SimpleTask)
      expect(Object.keys(library.components)).toHaveLength(3);

      // Components should be constructor functions
      expect(typeof library.components['TestComponent']).toBe('function');
      expect(typeof library.components['SimpleGreeting']).toBe('function');
      expect(typeof library.components['SimpleTask']).toBe('function');
    });

    it('should report empty dependencies array', async () => {
      const library = await loader.load('./test/fixtures/libraries/test-lib/index.ts');

      expect(library.dependencies).toEqual([]);
    });
  });

  describe('ScopeLoader', () => {
    let scopeLoader: ScopeLoader;

    beforeEach(() => {
      scopeLoader = new ScopeLoader();
    });

    it('should create scope from loaded package', async () => {
      const scope = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib/index.ts');

      expect(scope.has('SimpleGreeting')).toBe(true);
      expect(scope.has('SimpleTask')).toBe(true);
    });

    it('should cache loaded packages', async () => {
      const scope1 = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib/index.ts');
      const scope2 = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib/index.ts');

      expect(scope1).toBe(scope2); // Same reference
    });
  });

  describe('End-to-end rendering', () => {
    it('should render component from dynamically loaded module', async () => {
      const scopeLoader = new ScopeLoader();
      const scope = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib/index.ts');
      const registry = scopeToRegistry(scope);

      // Get the component from the scope
      const SimpleGreeting = scope.get('SimpleGreeting') as ComponentType<{ name?: string }>;

      // Create element and render
      const element = jsx(SimpleGreeting, { name: 'Test User' });
      const result = render(element, { registry });

      expect(result.text).toBe('Hello, Test User!');
    });

    it('should render component with default props', async () => {
      const scopeLoader = new ScopeLoader();
      const scope = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib/index.ts');
      const registry = scopeToRegistry(scope);

      const SimpleGreeting = scope.get('SimpleGreeting') as ComponentType<{ name?: string }>;
      const element = jsx(SimpleGreeting, {});
      const result = render(element, { registry });

      expect(result.text).toBe('Hello, World!');
    });

    it('should render SimpleTask component', async () => {
      const scopeLoader = new ScopeLoader();
      const scope = await scopeLoader.loadPackage('./test/fixtures/libraries/test-lib/index.ts');
      const registry = scopeToRegistry(scope);

      const SimpleTask = scope.get('SimpleTask') as ComponentType<{ task: string }>;
      const element = jsx(SimpleTask, { task: 'Write documentation' });
      const result = render(element, { registry });

      expect(result.text).toBe('Please complete the following task: Write documentation');
    });
  });
});
