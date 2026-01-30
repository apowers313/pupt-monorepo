/**
 * Bundle compatibility regression tests.
 * These tests verify that the built bundle is browser-compatible.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Bundle Browser Compatibility', () => {
  let bundleContent: string;
  const bundlePath = resolve(__dirname, '../../dist/index.js');

  beforeAll(() => {
    // Ensure bundle exists
    if (!existsSync(bundlePath)) {
      throw new Error('Bundle not found. Run `npm run build` first.');
    }
    bundleContent = readFileSync(bundlePath, 'utf-8');
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

  describe('Node.js modules are only required dynamically', () => {
    it('should only use dynamic require() for Node.js modules', () => {
      // Count static vs dynamic usages
      // Static: import X from 'os' (at top level, not in a function)
      // Dynamic: require('os') (inside a function, called at runtime)

      // Check that require() calls exist (for dynamic loading in Node.js)
      const requireOsCount = (bundleContent.match(/require\(['"]os['"]\)/g) || []).length;
      const requireFsCount = (bundleContent.match(/require\(['"]fs['"]\)/g) || []).length;
      const requirePathCount = (bundleContent.match(/require\(['"]path['"]\)/g) || []).length;

      // We should have some dynamic requires (for Node.js runtime)
      expect(requireOsCount).toBeGreaterThan(0);
      expect(requireFsCount).toBeGreaterThan(0);
      expect(requirePathCount).toBeGreaterThan(0);
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
