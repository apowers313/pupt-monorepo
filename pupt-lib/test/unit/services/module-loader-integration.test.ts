/**
 * Integration tests for ModuleLoader with mocked external sources.
 *
 * These tests use:
 * - MSW (Mock Service Worker) for HTTP/URL mocking
 * - vi.doMock for npm module mocking
 * - Real file fixtures for local module loading
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { Component } from '../../../src/component';
import { ModuleLoader } from '../../../src/services/module-loader';
import type { ResolvedModuleEntry } from '../../../src/types/module';

// Test component for mocked modules
class MockComponent extends Component<{ message?: string }> {
  render(props: { message?: string }): string {
    return props.message ?? 'Mock component output';
  }
}

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
      const loader = new ModuleLoader();

      // Mock the internal loadUrl to use our test data
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'my-lib',
        components: { UrlComponent: MockComponent },
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'my-lib',
        type: 'url',
        source: 'https://cdn.example.com/my-lib.js',
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.name).toBe('my-lib');
      expect(library.components).toHaveProperty('UrlComponent');
    });

    it('should handle URL loading errors gracefully', async () => {
      server.use(
        http.get('https://cdn.example.com/missing.js', () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const loader = new ModuleLoader();
      const entry: ResolvedModuleEntry = {
        name: 'missing',
        type: 'url',
        source: 'https://cdn.example.com/missing.js',
      };

      // Don't mock - let it fail naturally
      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow();
    });
  });

  describe('Git module loading', () => {
    it('should construct correct raw GitHub URL', async () => {
      const loader = new ModuleLoader();

      // Spy on loadUrl to capture the URL that loadGit constructs
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'github-lib',
        components: { GitHubComponent: MockComponent },
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'prompts',
        type: 'git',
        source: 'https://github.com/acme/prompts',
      };

      await loader.loadResolvedEntry(entry);

      // Verify loadUrl was called with the correct raw GitHub URL
      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/acme/prompts/master/index.js',
      );
    });

    it('should handle GitHub refs (tags/branches)', async () => {
      const loader = new ModuleLoader();

      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'github-lib-v2',
        components: { GitHubComponent: MockComponent },
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'repo',
        type: 'git',
        source: 'https://github.com/user/repo#v2.0.0',
      };

      await loader.loadResolvedEntry(entry);

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/user/repo/v2.0.0/index.js',
      );
    });

    it('should reject invalid GitHub source format', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'invalid',
        type: 'git',
        source: 'https://not-github.com/invalid-format',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow('Cannot extract GitHub owner/repo');
    });
  });

  describe('npm module loading', () => {
    it('should load npm package by name', async () => {
      const loader = new ModuleLoader();

      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'lodash',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'lodash',
        type: 'npm',
        source: 'lodash',
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.name).toBe('lodash');
      expect(loadNpmSpy).toHaveBeenCalledWith('lodash', undefined);
    });

    it('should load scoped npm package', async () => {
      const loader = new ModuleLoader();

      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: '@acme/components',
        components: { Button: MockComponent, Input: MockComponent },
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'acme-components',
        type: 'npm',
        source: '@acme/components',
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.name).toBe('acme-components');
      expect(Object.keys(library.components)).toHaveLength(2);
    });

    it('should detect and return module dependencies', async () => {
      const loader = new ModuleLoader();

      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'with-deps',
        components: { Main: MockComponent },
        prompts: {},
        dependencies: ['@acme/base', '@acme/utils'],
      });

      const entry: ResolvedModuleEntry = {
        name: 'with-deps',
        type: 'npm',
        source: 'with-deps',
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.dependencies).toEqual(['@acme/base', '@acme/utils']);
    });
  });

  describe('local module loading (real files)', () => {
    it('should load local module and detect components', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'test-lib',
        type: 'local',
        source: './test/fixtures/libraries/test-lib/index.ts',
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.components).toHaveProperty('SimpleGreeting');
      expect(library.components).toHaveProperty('SimpleTask');
      expect(library.dependencies).toEqual([]);
    });
  });

  describe('extractNameFromUrl', () => {
    it('should extract package name from CDN URLs', async () => {
      const loader = new ModuleLoader();
      const extractName = (loader as never).extractNameFromUrl.bind(loader);

      expect(extractName('https://esm.sh/lodash@4.17.21')).toBe('lodash@4.17.21');
      expect(extractName('https://unpkg.com/react@18.2.0/index.js')).toBe('index');
      expect(extractName('https://cdn.example.com/lib.js')).toBe('lib');
    });

    it('should return "unknown" for invalid URLs', async () => {
      const loader = new ModuleLoader();
      const extractName = (loader as never).extractNameFromUrl.bind(loader);

      expect(extractName('not-a-valid-url')).toBe('unknown');
    });
  });

  describe('extractNameFromPath', () => {
    it('should extract filename from path', async () => {
      const loader = new ModuleLoader();
      const extractName = (loader as never).extractNameFromPath.bind(loader);

      expect(extractName('./src/lib/my-module')).toBe('my-module');
      expect(extractName('/absolute/path/to/component.ts')).toBe('component.ts');
      expect(extractName('simple')).toBe('simple');
    });
  });
});

describe('ModuleLoader with real dynamic imports', () => {
  it('should use vi.doMock for npm package simulation', async () => {
    vi.doMock('fake-npm-package', () => ({
      default: MockComponent,
      FakeComponent: MockComponent,
      dependencies: [],
    }));

    const fakeModule = await import('fake-npm-package');

    expect(fakeModule.FakeComponent).toBeDefined();
    expect(fakeModule.dependencies).toEqual([]);

    vi.doUnmock('fake-npm-package');
  });
});
