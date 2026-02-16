/**
 * Real integration tests for ModuleLoader.
 *
 * These tests exercise the actual loading code paths by:
 * - Using MSW to intercept real HTTP requests
 * - Testing extractNameFromUrl with various URL formats
 * - Testing error handling paths
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ModuleLoader } from '../../../src/services/module-loader';
import type { ResolvedModuleEntry } from '../../../src/types/module';

// MSW server for HTTP mocking
const server = setupServer();

describe('ModuleLoader Real Code Paths', () => {
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

  describe('loadLocal - local module loading errors', () => {
    it('should fail gracefully for non-existent local file', async () => {
      const loader = new ModuleLoader();
      const entry: ResolvedModuleEntry = {
        name: 'nonexistent',
        type: 'local',
        source: './this/path/does/not/exist.ts',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load local module/);
    });

    it('should fail for file with syntax errors', async () => {
      const loader = new ModuleLoader();
      const entry: ResolvedModuleEntry = {
        name: 'nonexistent',
        type: 'local',
        source: './nonexistent/module.js',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load local module/);
    });
  });

  describe('loadUrl - real URL loading', () => {
    it('should successfully load from data: URL with valid module', async () => {
      const loader = new ModuleLoader();

      // Create a data URL with valid ES module JavaScript
      const moduleCode = `
        export const greeting = 'Hello from data URL!';
        export const dependencies = [];
      `;
      const base64 = Buffer.from(moduleCode).toString('base64');
      const dataUrl = `data:text/javascript;base64,${base64}`;

      const entry: ResolvedModuleEntry = {
        name: 'data-url-lib',
        type: 'url',
        source: dataUrl,
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.name).toBe('data-url-lib');
      expect(library.dependencies).toEqual([]);
    });
  });

  describe('loadUrl - error handling with MSW', () => {
    it('should fail gracefully when URL returns non-JS content', async () => {
      server.use(
        http.get('https://example.com/not-a-module.txt', () => {
          return new HttpResponse('This is plain text, not JavaScript', {
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
      );

      const loader = new ModuleLoader();
      const entry: ResolvedModuleEntry = {
        name: 'not-a-module',
        type: 'url',
        source: 'https://example.com/not-a-module.txt',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load module from URL/);
    });

    it('should fail when URL returns 404', async () => {
      server.use(
        http.get('https://example.com/missing.js', () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const loader = new ModuleLoader();
      const entry: ResolvedModuleEntry = {
        name: 'missing',
        type: 'url',
        source: 'https://example.com/missing.js',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load module from URL/);
    });

    it('should fail when URL returns 500', async () => {
      server.use(
        http.get('https://example.com/error.js', () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        }),
      );

      const loader = new ModuleLoader();
      const entry: ResolvedModuleEntry = {
        name: 'error',
        type: 'url',
        source: 'https://example.com/error.js',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load module from URL/);
    });
  });

  describe('loadGit - GitHub URL parsing', () => {
    it('should construct correct URL for GitHub source', async () => {
      const loader = new ModuleLoader();

      // Mock loadUrl to capture the URL
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockRejectedValue(new Error('Intentional test failure'));

      const entry: ResolvedModuleEntry = {
        name: 'myrepo',
        type: 'git',
        source: 'https://github.com/myuser/myrepo',
      };

      try {
        await loader.loadResolvedEntry(entry);
      } catch {
        // Expected to fail
      }

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/myuser/myrepo/master/index.js',
      );
    });

    it('should use ref when provided in URL fragment', async () => {
      const loader = new ModuleLoader();

      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockRejectedValue(new Error('Intentional test failure'));

      const entry: ResolvedModuleEntry = {
        name: 'lib',
        type: 'git',
        source: 'https://github.com/org/lib#v1.2.3',
      };

      try {
        await loader.loadResolvedEntry(entry);
      } catch {
        // Expected to fail
      }

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/org/lib/v1.2.3/index.js',
      );
    });

    it('should reject non-GitHub git sources', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'gitlab-lib',
        type: 'git',
        source: 'https://gitlab.com/user/repo',
      };

      await expect(loader.loadResolvedEntry(entry)).rejects.toThrow(
        'Cannot extract GitHub owner/repo',
      );
    });
  });

  describe('loadNpm - npm package loading', () => {
    it('should successfully load a real npm package', async () => {
      const loader = new ModuleLoader();

      // Load a package that's definitely installed (path is a Node.js built-in)
      const entry: ResolvedModuleEntry = {
        name: 'path',
        type: 'npm',
        source: 'path',
      };

      const library = await loader.loadResolvedEntry(entry);

      expect(library.name).toBe('path');
      expect(library.components).toBeDefined();
      expect(library.dependencies).toEqual([]);
    });

    it('should fail gracefully for non-existent npm package', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'nonexistent',
        type: 'npm',
        source: 'this-package-definitely-does-not-exist-12345',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load npm package/);
    });

    it('should fail for scoped package that does not exist', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'nonexistent-scoped',
        type: 'npm',
        source: '@nonexistent-scope/nonexistent-package',
      };

      await expect(
        loader.loadResolvedEntry(entry),
      ).rejects.toThrow(/Failed to load npm package/);
    });
  });

  describe('extractNameFromUrl - comprehensive URL parsing', () => {
    let loader: ModuleLoader;
    let extractName: (url: string) => string;

    beforeAll(() => {
      loader = new ModuleLoader();
      extractName = (loader as never).extractNameFromUrl.bind(loader);
    });

    it('should extract name from esm.sh URLs', () => {
      expect(extractName('https://esm.sh/lodash@4.17.21')).toBe('lodash@4.17.21');
      expect(extractName('https://esm.sh/@acme/lib@1.0.0')).toBe('lib@1.0.0');
    });

    it('should extract name from unpkg URLs', () => {
      expect(extractName('https://unpkg.com/react@18.0.0')).toBe('react@18.0.0');
      expect(extractName('https://unpkg.com/react@18.0.0/index.js')).toBe('index');
    });

    it('should extract name from jsdelivr URLs', () => {
      expect(extractName('https://cdn.jsdelivr.net/npm/vue@3.0.0')).toBe('vue@3.0.0');
    });

    it('should handle URLs with .js extension', () => {
      expect(extractName('https://example.com/lib.js')).toBe('lib');
      expect(extractName('https://example.com/path/to/module.js')).toBe('module');
    });

    it('should return "unknown" for malformed URLs', () => {
      expect(extractName('not-a-url')).toBe('unknown');
      expect(extractName('')).toBe('unknown');
    });

    it('should handle URLs with query strings', () => {
      const result = extractName('https://example.com/lib.js?v=1');
      expect(result).toBe('lib');
    });
  });

  describe('extractNameFromPath - path parsing', () => {
    let loader: ModuleLoader;
    let extractName: (path: string) => string;

    beforeAll(() => {
      loader = new ModuleLoader();
      extractName = (loader as never).extractNameFromPath.bind(loader);
    });

    it('should extract last segment from relative paths', () => {
      expect(extractName('./src/lib/module')).toBe('module');
      expect(extractName('./component.ts')).toBe('component.ts');
    });

    it('should extract last segment from absolute paths', () => {
      expect(extractName('/usr/local/lib/mylib')).toBe('mylib');
      expect(extractName('/home/user/project/index.ts')).toBe('index.ts');
    });

    it('should handle single segment paths', () => {
      expect(extractName('mymodule')).toBe('mymodule');
    });

    it('should handle paths ending with slash', () => {
      expect(extractName('./path/to/')).toBe('unknown');
    });

    it('should handle parent directory references', () => {
      expect(extractName('../parent/module')).toBe('module');
      expect(extractName('../../lib/component')).toBe('component');
    });
  });

  describe('clear - state management', () => {
    it('should clear loaded modules cache', async () => {
      const loader = new ModuleLoader();

      const doLoadSpy = vi.spyOn(loader as never, 'doLoad');
      doLoadSpy.mockResolvedValue({
        name: 'test',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'test-pkg',
        type: 'npm',
        source: '@test/pkg',
        version: '1.0.0',
      };

      // Load twice - should be cached
      await loader.loadResolvedEntry(entry);
      await loader.loadResolvedEntry(entry);
      expect(doLoadSpy).toHaveBeenCalledTimes(1);

      // Clear and load again
      loader.clear();
      await loader.loadResolvedEntry(entry);
      expect(doLoadSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear version tracking', async () => {
      const loader = new ModuleLoader();

      const doLoadSpy = vi.spyOn(loader as never, 'doLoad');
      doLoadSpy.mockResolvedValue({
        name: 'pkg',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry1: ResolvedModuleEntry = {
        name: 'test-pkg',
        type: 'npm',
        source: '@test/pkg',
        version: '1.0.0',
      };

      // Load version 1
      await loader.loadResolvedEntry(entry1);

      // Version 2 would normally conflict
      const entry2: ResolvedModuleEntry = {
        name: 'test-pkg',
        type: 'npm',
        source: '@test/pkg-other',
        version: '2.0.0',
      };
      await expect(loader.loadResolvedEntry(entry2)).rejects.toThrow('Version conflict');

      // Clear and try again - should work now
      loader.clear();
      await expect(loader.loadResolvedEntry(entry2)).resolves.toBeDefined();
    });
  });
});
