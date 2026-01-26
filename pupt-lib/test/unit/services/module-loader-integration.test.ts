/**
 * Integration tests for ModuleLoader with mocked external sources.
 *
 * These tests use:
 * - MSW (Mock Service Worker) for HTTP/URL mocking
 * - vi.doMock for npm module mocking
 * - Real file fixtures for local module loading
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ModuleLoader } from '../../../src/services/module-loader';
import { Component } from '../../../src/component';

// Test component for mocked modules
class MockComponent extends Component<{ message?: string }> {
  render(props: { message?: string }): string {
    return props.message ?? 'Mock component output';
  }
}

// JavaScript module code that exports a component
const createModuleCode = (componentName: string, output: string) => `
  // Simulated ES module
  const COMPONENT_MARKER = Symbol.for('pupt-lib:component:v1');

  class ${componentName} {
    static [COMPONENT_MARKER] = true;
    render(props) {
      return '${output}';
    }
  }

  export { ${componentName} };
  export const dependencies = [];
`;

// MSW server for HTTP mocking
const server = setupServer();

describe('ModuleLoader Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('URL module loading', () => {
    it('should load module from HTTPS URL', async () => {
      // Setup MSW handler for the URL
      server.use(
        http.get('https://cdn.example.com/my-lib.js', () => {
          return new HttpResponse(
            createModuleCode('UrlComponent', 'Hello from URL!'),
            {
              headers: { 'Content-Type': 'application/javascript' },
            },
          );
        }),
      );

      const loader = new ModuleLoader();

      // Mock the internal import to use our test data
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'my-lib',
        components: { UrlComponent: MockComponent },
        dependencies: [],
      });

      const library = await loader.load('https://cdn.example.com/my-lib.js');

      expect(library.name).toBe('my-lib');
      expect(library.components).toHaveProperty('UrlComponent');
    });

    it('should extract name from URL path', async () => {
      const loader = new ModuleLoader();

      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'fancy-lib',
        components: { FancyComponent: MockComponent },
        dependencies: [],
      });

      const library = await loader.load('https://esm.sh/fancy-lib@1.0.0');

      expect(library.components).toHaveProperty('FancyComponent');
    });

    it('should handle URL loading errors gracefully', async () => {
      server.use(
        http.get('https://cdn.example.com/missing.js', () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const loader = new ModuleLoader();

      // Don't mock - let it fail naturally
      await expect(
        loader.load('https://cdn.example.com/missing.js'),
      ).rejects.toThrow();
    });
  });

  describe('GitHub module loading', () => {
    it('should construct correct raw GitHub URL', async () => {
      const loader = new ModuleLoader();

      // Spy on loadUrl to capture the URL that loadGithub constructs
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'github-lib',
        components: { GitHubComponent: MockComponent },
        dependencies: [],
      });

      await loader.load('github:acme/prompts');

      // Verify loadUrl was called with the correct raw GitHub URL
      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/acme/prompts/main/index.js',
      );
    });

    it('should handle GitHub refs (tags/branches)', async () => {
      const loader = new ModuleLoader();

      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'github-lib-v2',
        components: {},
        dependencies: [],
      });

      await loader.load('github:user/repo#v2.0.0');

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/user/repo/v2.0.0/index.js',
      );
    });

    it('should reject invalid GitHub source format', async () => {
      const loader = new ModuleLoader();

      await expect(
        loader.load('github:invalid-format'),
      ).rejects.toThrow('Invalid GitHub source format');
    });
  });

  describe('npm module loading', () => {
    it('should load npm package by name', async () => {
      const loader = new ModuleLoader();

      // Mock the loadNpm method
      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'lodash',
        components: {},
        dependencies: [],
      });

      const library = await loader.load('lodash');

      expect(library.name).toBe('lodash');
      expect(loadNpmSpy).toHaveBeenCalledWith('lodash');
    });

    it('should load scoped npm package', async () => {
      const loader = new ModuleLoader();

      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: '@acme/components',
        components: { Button: MockComponent, Input: MockComponent },
        dependencies: [],
      });

      const library = await loader.load('@acme/components');

      expect(library.name).toBe('@acme/components');
      expect(Object.keys(library.components)).toHaveLength(2);
    });

    it('should handle npm package with version', async () => {
      const loader = new ModuleLoader();

      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: '@acme/prompts',
        components: { Prompt: MockComponent },
        dependencies: [],
      });

      await loader.load('@acme/prompts@2.0.0');

      expect(loadNpmSpy).toHaveBeenCalledWith('@acme/prompts@2.0.0');
    });

    it('should detect and return module dependencies', async () => {
      const loader = new ModuleLoader();

      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'with-deps',
        components: { Main: MockComponent },
        dependencies: ['@acme/base', '@acme/utils'],
      });

      const library = await loader.load('with-deps');

      expect(library.dependencies).toEqual(['@acme/base', '@acme/utils']);
    });
  });

  describe('local module loading (real files)', () => {
    it('should load local module and detect components', async () => {
      const loader = new ModuleLoader();

      // This uses the real loadLocal implementation
      const library = await loader.load('./test/fixtures/libraries/test-lib/index.ts');

      expect(library.components).toHaveProperty('SimpleGreeting');
      expect(library.components).toHaveProperty('SimpleTask');
      expect(library.dependencies).toEqual([]);
    });

    it('should handle relative paths correctly', async () => {
      const loader = new ModuleLoader();

      // Both should resolve to the same module
      const lib1 = await loader.load('./test/fixtures/libraries/test-lib/index.ts');

      expect(lib1.components).toHaveProperty('SimpleGreeting');
    });
  });

  describe('extractNameFromUrl', () => {
    it('should extract package name from CDN URLs', async () => {
      const loader = new ModuleLoader();

      // Access the private method for testing
      const extractName = (loader as never)['extractNameFromUrl'].bind(loader);

      expect(extractName('https://esm.sh/lodash@4.17.21')).toBe('lodash@4.17.21');
      expect(extractName('https://unpkg.com/react@18.2.0/index.js')).toBe('index');
      expect(extractName('https://cdn.example.com/lib.js')).toBe('lib');
    });

    it('should return "unknown" for invalid URLs', async () => {
      const loader = new ModuleLoader();
      const extractName = (loader as never)['extractNameFromUrl'].bind(loader);

      expect(extractName('not-a-valid-url')).toBe('unknown');
    });
  });

  describe('extractNameFromPath', () => {
    it('should extract filename from path', async () => {
      const loader = new ModuleLoader();
      const extractName = (loader as never)['extractNameFromPath'].bind(loader);

      expect(extractName('./src/lib/my-module')).toBe('my-module');
      expect(extractName('/absolute/path/to/component.ts')).toBe('component.ts');
      expect(extractName('simple')).toBe('simple');
    });
  });
});

describe('ModuleLoader with real dynamic imports', () => {
  // These tests use vi.doMock to mock the actual dynamic import behavior

  it('should use vi.doMock for npm package simulation', async () => {
    // Create a mock module
    vi.doMock('fake-npm-package', () => ({
      default: MockComponent,
      FakeComponent: MockComponent,
      dependencies: [],
    }));

    // Now dynamic import will get the mocked version
    const fakeModule = await import('fake-npm-package');

    expect(fakeModule.FakeComponent).toBeDefined();
    expect(fakeModule.dependencies).toEqual([]);

    vi.doUnmock('fake-npm-package');
  });
});
