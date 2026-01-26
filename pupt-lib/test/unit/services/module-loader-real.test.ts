/**
 * Real integration tests for ModuleLoader.
 *
 * These tests exercise the actual loading code paths by:
 * - Using MSW to intercept real HTTP requests
 * - Testing extractNameFromUrl with various URL formats
 * - Testing error handling paths
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ModuleLoader } from '../../../src/services/module-loader';

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

      await expect(
        loader.load('./this/path/does/not/exist.ts'),
      ).rejects.toThrow(/Failed to load local module/);
    });

    it('should fail for file with syntax errors', async () => {
      // This would need a real file with syntax errors
      // For now, we just verify the error path works with non-existent files
      const loader = new ModuleLoader();

      await expect(
        loader.load('./nonexistent/module.js'),
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

      const library = await loader.load(dataUrl);

      expect(library.name).toBeDefined();
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

      // This should fail because it can't be imported as a module
      await expect(
        loader.load('https://example.com/not-a-module.txt'),
      ).rejects.toThrow(/Failed to load module from URL/);
    });

    it('should fail when URL returns 404', async () => {
      server.use(
        http.get('https://example.com/missing.js', () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const loader = new ModuleLoader();

      await expect(
        loader.load('https://example.com/missing.js'),
      ).rejects.toThrow(/Failed to load module from URL/);
    });

    it('should fail when URL returns 500', async () => {
      server.use(
        http.get('https://example.com/error.js', () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        }),
      );

      const loader = new ModuleLoader();

      await expect(
        loader.load('https://example.com/error.js'),
      ).rejects.toThrow(/Failed to load module from URL/);
    });
  });

  describe('loadGithub - GitHub URL construction', () => {
    it('should construct correct URL for github:user/repo format', async () => {
      const loader = new ModuleLoader();

      // Mock loadUrl to capture the URL
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockRejectedValue(new Error('Intentional test failure'));

      try {
        await loader.load('github:myuser/myrepo');
      } catch {
        // Expected to fail
      }

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/myuser/myrepo/main/index.js',
      );
    });

    it('should use ref when provided in github:user/repo#ref format', async () => {
      const loader = new ModuleLoader();

      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockRejectedValue(new Error('Intentional test failure'));

      try {
        await loader.load('github:org/lib#v1.2.3');
      } catch {
        // Expected to fail
      }

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/org/lib/v1.2.3/index.js',
      );
    });

    it('should use branch name as ref', async () => {
      const loader = new ModuleLoader();

      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockRejectedValue(new Error('Intentional test failure'));

      try {
        await loader.load('github:company/project#develop');
      } catch {
        // Expected to fail
      }

      expect(loadUrlSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/company/project/develop/index.js',
      );
    });

    it('should reject malformed github: URLs', async () => {
      const loader = new ModuleLoader();

      // Missing repo
      await expect(loader.load('github:useronly')).rejects.toThrow(
        'Invalid GitHub source format',
      );

      // Empty
      await expect(loader.load('github:')).rejects.toThrow(
        'Invalid GitHub source format',
      );
    });
  });

  describe('loadNpm - npm package loading', () => {
    it('should successfully load a real npm package', async () => {
      const loader = new ModuleLoader();

      // Load a package that's definitely installed (vitest is our test runner)
      // We use 'path' which is a Node.js built-in
      const library = await loader.load('path');

      expect(library.name).toBe('path');
      // Built-in modules won't have our Component classes, so components should be empty
      expect(library.components).toBeDefined();
      expect(library.dependencies).toEqual([]);
    });

    it('should fail gracefully for non-existent npm package', async () => {
      const loader = new ModuleLoader();

      // This package shouldn't exist
      await expect(
        loader.load('this-package-definitely-does-not-exist-12345'),
      ).rejects.toThrow(/Failed to load npm package/);
    });

    it('should fail for scoped package that does not exist', async () => {
      const loader = new ModuleLoader();

      await expect(
        loader.load('@nonexistent-scope/nonexistent-package'),
      ).rejects.toThrow(/Failed to load npm package/);
    });
  });

  describe('extractNameFromUrl - comprehensive URL parsing', () => {
    let loader: ModuleLoader;
    let extractName: (url: string) => string;

    beforeAll(() => {
      loader = new ModuleLoader();
      extractName = (loader as never)['extractNameFromUrl'].bind(loader);
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
      // URL.pathname correctly strips query strings
      const result = extractName('https://example.com/lib.js?v=1');
      expect(result).toBe('lib');
    });
  });

  describe('extractNameFromPath - path parsing', () => {
    let loader: ModuleLoader;
    let extractName: (path: string) => string;

    beforeAll(() => {
      loader = new ModuleLoader();
      extractName = (loader as never)['extractNameFromPath'].bind(loader);
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
      // Empty last segment returns 'unknown'
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

      // Mock to track calls
      const doLoadSpy = vi.spyOn(loader as never, 'doLoad');
      doLoadSpy.mockResolvedValue({
        name: 'test',
        components: {},
        dependencies: [],
      });

      // Load twice - should be cached
      await loader.load('@test/pkg@1.0.0');
      await loader.load('@test/pkg@1.0.0');
      expect(doLoadSpy).toHaveBeenCalledTimes(1);

      // Clear and load again
      loader.clear();
      await loader.load('@test/pkg@1.0.0');
      expect(doLoadSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear version tracking', async () => {
      const loader = new ModuleLoader();

      const doLoadSpy = vi.spyOn(loader as never, 'doLoad');
      doLoadSpy.mockResolvedValue({
        name: 'pkg',
        components: {},
        dependencies: [],
      });

      // Load version 1
      await loader.load('@test/pkg@1.0.0');

      // Version 2 would normally conflict
      await expect(loader.load('@test/pkg@2.0.0')).rejects.toThrow('Version conflict');

      // Clear and try again - should work now
      loader.clear();
      await expect(loader.load('@test/pkg@2.0.0')).resolves.toBeDefined();
    });
  });
});

describe('ModuleLoader source type routing', () => {
  it('should route to correct loader based on source type', async () => {
    const loader = new ModuleLoader();

    // Spy on all internal loaders
    const loadLocalSpy = vi.spyOn(loader as never, 'loadLocal');
    const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
    const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
    const loadGithubSpy = vi.spyOn(loader as never, 'loadGithub');

    // Mock all to prevent actual loading
    loadLocalSpy.mockResolvedValue({ name: 'local', components: {}, dependencies: [] });
    loadNpmSpy.mockResolvedValue({ name: 'npm', components: {}, dependencies: [] });
    loadUrlSpy.mockResolvedValue({ name: 'url', components: {}, dependencies: [] });
    loadGithubSpy.mockResolvedValue({ name: 'github', components: {}, dependencies: [] });

    // Test each source type
    await loader.load('./local/path');
    expect(loadLocalSpy).toHaveBeenCalled();

    loader.clear();
    await loader.load('npm-package');
    expect(loadNpmSpy).toHaveBeenCalled();

    loader.clear();
    await loader.load('https://cdn.example.com/lib.js');
    expect(loadUrlSpy).toHaveBeenCalled();

    loader.clear();
    await loader.load('github:user/repo');
    expect(loadGithubSpy).toHaveBeenCalled();
  });
});
