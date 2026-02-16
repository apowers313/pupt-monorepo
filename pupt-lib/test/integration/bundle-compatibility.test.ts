/**
 * Bundle compatibility regression tests.
 * These tests verify that the built bundle is browser-compatible.
 */
import { existsSync,readdirSync,readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll,describe, expect, it } from 'vitest';

describe('Bundle Browser Compatibility', () => {
  let bundleContent: string;
  const distDir = resolve(__dirname, '../../dist');
  const bundlePath = resolve(distDir, 'index.js');

  beforeAll(() => {
    // Ensure bundle exists
    if (!existsSync(bundlePath)) {
      throw new Error('Bundle not found. Run `npm run build` first.');
    }
    // Read all index*.js files in dist/ (the build uses code splitting / chunks).
    // Exclude non-index chunks (e.g., babel-*.js) which are third-party code
    // loaded lazily and contain string templates that look like require() calls.
    const jsFiles = readdirSync(distDir)
      .filter((f) => f.startsWith('index') && f.endsWith('.js'))
      .map((f) => resolve(distDir, f));
    bundleContent = jsFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');
  });

  describe('No static Node.js imports', () => {
    it('should not have static import from "os"', () => {
      // Check for static ES module imports
      const staticOsImport = /^import\s+.*\s+from\s+['"]os['"]/m;
      expect(bundleContent).not.toMatch(staticOsImport);
    });

    it('should not have static import from "fs"', () => {
      const staticFsImport = /^import\s+.*\s+from\s+['"]fs['"]/m;
      expect(bundleContent).not.toMatch(staticFsImport);
    });

    it('should not have static import from "path"', () => {
      const staticPathImport = /^import\s+.*\s+from\s+['"]path['"]/m;
      expect(bundleContent).not.toMatch(staticPathImport);
    });

    it('should not have static import from "fs/promises"', () => {
      const staticFsPromisesImport = /^import\s+.*\s+from\s+['"]fs\/promises['"]/m;
      expect(bundleContent).not.toMatch(staticFsPromisesImport);
    });
  });

  describe('Node.js modules are loaded via dynamic import() (ESM-compatible, issue #30)', () => {
    it('should not use require() for Node.js built-in modules', () => {
      // require() is not available in ESM - all Node.js builtins must use import()
      const requireOsCount = (bundleContent.match(/require\(['"]os['"]\)/g) || []).length;
      const requireFsCount = (bundleContent.match(/require\(['"]fs['"]\)/g) || []).length;
      const requirePathCount = (bundleContent.match(/require\(['"]path['"]\)/g) || []).length;

      expect(requireOsCount).toBe(0);
      expect(requireFsCount).toBe(0);
      expect(requirePathCount).toBe(0);
    });

    it('should use dynamic import() for Node.js built-in modules', () => {
      // Verify dynamic import() is used instead of require()
      const importOsCount = (bundleContent.match(/import\(\s*['"]os['"]\s*\)/g) || []).length;
      const importFsCount = (bundleContent.match(/import\(\s*['"]fs['"]\s*\)/g) || []).length;
      const importPathCount = (bundleContent.match(/import\(\s*['"]path['"]\s*\)/g) || []).length;

      expect(importOsCount).toBeGreaterThan(0);
      expect(importFsCount).toBeGreaterThan(0);
      expect(importPathCount).toBeGreaterThan(0);
    });
  });

  describe('Browser detection is present', () => {
    it('should include browser detection code', () => {
      // The bundle should have browser detection logic
      expect(bundleContent).toContain('typeof window');
      expect(bundleContent).toContain('window.document');
    });

    it('should have isBrowser check before Node.js specific code', () => {
      // Verify that isBrowser is defined and used
      expect(bundleContent).toMatch(/isBrowser\s*=/);
    });
  });

  describe('No Vite browser-external stubs for Node.js built-ins (issue #20)', () => {
    it('should not replace dynamic import("url") with a browser-external stub', () => {
      // Vite replaces `import('url')` with `import('./__vite-browser-external-*.js')`
      // which breaks pathToFileURL at runtime when consumed as an npm dependency
      const viteExternalStub = /import\(["'][^"']*__vite-browser-external[^"']*["']\)/;
      expect(bundleContent).not.toMatch(viteExternalStub);
    });

    it('should preserve dynamic import("url") for Node.js pathToFileURL', () => {
      // The bundle must use dynamic import('url') (or require) so pathToFileURL works
      const dynamicUrlImport = /import\(\s*['"]url['"]\s*\)|require\(['"]url['"]\)/;
      expect(bundleContent).toMatch(dynamicUrlImport);
    });
  });

  describe('Bundle structure', () => {
    it('should be a valid ES module', () => {
      // Should have exports
      expect(bundleContent).toContain('export {');
    });

    it('should export main functions', () => {
      // Check for key exports
      expect(bundleContent).toContain('render');
      expect(bundleContent).toContain('createPromptFromSource');
      expect(bundleContent).toContain('Component');
    });

    it('should not be excessively large', () => {
      // Bundle should be under 2MB (reasonable for a library)
      const sizeInMB = Buffer.byteLength(bundleContent) / (1024 * 1024);
      expect(sizeInMB).toBeLessThan(2);
    });
  });
});

describe('JSX Runtime Bundle', () => {
  let jsxBundleContent: string;
  const jsxBundlePath = resolve(__dirname, '../../dist/jsx-runtime/index.js');

  beforeAll(() => {
    if (!existsSync(jsxBundlePath)) {
      throw new Error('JSX runtime bundle not found. Run `npm run build` first.');
    }
    jsxBundleContent = readFileSync(jsxBundlePath, 'utf-8');
  });

  it('should not have any Node.js imports', () => {
    // JSX runtime should be completely browser-safe
    expect(jsxBundleContent).not.toMatch(/from\s+['"](?:os|fs|path)['"]/);
    expect(jsxBundleContent).not.toMatch(/require\(['"](?:os|fs|path)['"]\)/);
  });

  it('should export jsx and jsxs functions', () => {
    expect(jsxBundleContent).toContain('jsx');
    expect(jsxBundleContent).toContain('jsxs');
  });

  it('should export Fragment', () => {
    expect(jsxBundleContent).toContain('Fragment');
  });
});
