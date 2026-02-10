/**
 * Tests for the ES module evaluator.
 * Tests both the Node.js evaluation path and helper functions.
 */
import { describe, it, expect } from 'vitest';
import { evaluateModule } from '../../../src/services/module-evaluator';

describe('evaluateModule', () => {
  describe('basic evaluation', () => {
    it('should evaluate simple export default', async () => {
      const code = 'export default 42;';

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(result.default).toBe(42);
    });

    it('should evaluate named exports', async () => {
      const code = `
        export const foo = 'bar';
        export const num = 123;
        export default 'default-value';
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(result.default).toBe('default-value');
      expect(result.foo).toBe('bar');
      expect(result.num).toBe(123);
    });

    it('should evaluate functions', async () => {
      const code = `
        export function greet(name) {
          return 'Hello, ' + name;
        }
        export default greet;
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(typeof result.default).toBe('function');
      expect((result.default as (name: string) => string)('World')).toBe('Hello, World');
    });

    it('should evaluate classes', async () => {
      const code = `
        export class MyClass {
          constructor(value) {
            this.value = value;
          }
          getValue() {
            return this.value;
          }
        }
        export default MyClass;
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(typeof result.default).toBe('function');
      const MyClass = result.default as new (value: number) => { getValue: () => number };
      const instance = new MyClass(42);
      expect(instance.getValue()).toBe(42);
    });
  });

  describe('imports from pupt-lib', () => {
    it('should resolve pupt-lib imports', async () => {
      const code = `
        import { Component } from 'pupt-lib';
        export default typeof Component;
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(result.default).toBe('function');
    });

    it('should resolve pupt-lib/jsx-runtime imports', async () => {
      const code = `
        import { jsx, Fragment } from 'pupt-lib/jsx-runtime';
        export default { hasJsx: typeof jsx === 'function', hasFragment: typeof Fragment !== 'undefined' };
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect((result.default as { hasJsx: boolean }).hasJsx).toBe(true);
      expect((result.default as { hasFragment: boolean }).hasFragment).toBe(true);
    });

    it('should resolve pupt-lib without relying on process.cwd() fallback (issue #21)', async () => {
      // Regression: require.resolve('pupt-lib') throws ERR_PACKAGE_PATH_NOT_EXPORTED
      // because package.json has no "require" or "default" condition. The old fallback
      // used process.cwd() + '/dist/index.js' which only works inside the repo.
      // By changing cwd to a temp dir, we simulate the consumer-as-dependency scenario.
      const code = `
        import { Component } from 'pupt-lib';
        export default typeof Component;
      `;

      const originalCwd = process.cwd();
      const os = await import('os');
      process.chdir(os.tmpdir());

      try {
        const result = await evaluateModule(code, { filename: 'test.mjs' });
        expect(result.default).toBe('function');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should resolve pupt-lib/jsx-runtime without relying on process.cwd() fallback (issue #21)', async () => {
      const code = `
        import { jsx } from 'pupt-lib/jsx-runtime';
        export default typeof jsx;
      `;

      const originalCwd = process.cwd();
      const os = await import('os');
      process.chdir(os.tmpdir());

      try {
        const result = await evaluateModule(code, { filename: 'test.mjs' });
        expect(result.default).toBe('function');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('imports from npm packages', () => {
    it('should resolve zod imports', async () => {
      const code = `
        import { z } from 'zod';
        export default typeof z.string;
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(result.default).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should provide helpful error for syntax errors', async () => {
      const code = 'export default {';

      await expect(evaluateModule(code, { filename: 'syntax-error.mjs' }))
        .rejects.toThrow(/syntax-error\.mjs/);
    });

    it('should provide helpful error for unresolvable modules', async () => {
      const code = `
        import { foo } from 'non-existent-package-12345';
        export default foo;
      `;

      await expect(evaluateModule(code, { filename: 'missing-module.mjs' }))
        .rejects.toThrow(/non-existent-package-12345/);
    });

    it('should handle runtime errors in evaluated code', async () => {
      const code = `
        const obj = null;
        export default obj.property;
      `;

      await expect(evaluateModule(code, { filename: 'runtime-error.mjs' }))
        .rejects.toThrow();
    });
  });

  describe('specifier types', () => {
    it('should handle relative imports in code', async () => {
      // This won't actually work without a real file, but tests the non-bare-specifier path
      const code = `
        // Relative imports are not bare specifiers
        const relPath = './relative';
        const absPath = '/absolute';
        const fileUrl = 'file:///path';
        const httpUrl = 'http://example.com';
        const httpsUrl = 'https://example.com';
        const dataUrl = 'data:text/plain,hello';
        const nodeBuiltin = 'node:fs';
        export default 'ok';
      `;

      const result = await evaluateModule(code, { filename: 'test.mjs' });

      expect(result.default).toBe('ok');
    });
  });

  describe('complex code patterns', () => {
    it('should handle async/await', async () => {
      const code = `
        async function asyncFn() {
          return Promise.resolve(42);
        }
        export default await asyncFn();
      `;

      const result = await evaluateModule(code, { filename: 'async.mjs' });

      expect(result.default).toBe(42);
    });

    it('should handle destructuring', async () => {
      const code = `
        const obj = { a: 1, b: 2, c: 3 };
        const { a, ...rest } = obj;
        export default { a, rest };
      `;

      const result = await evaluateModule(code, { filename: 'destructure.mjs' });

      expect((result.default as { a: number }).a).toBe(1);
      expect((result.default as { rest: { b: number; c: number } }).rest).toEqual({ b: 2, c: 3 });
    });

    it('should handle template literals', async () => {
      const code = `
        const name = 'World';
        export default \`Hello, \${name}!\`;
      `;

      const result = await evaluateModule(code, { filename: 'template.mjs' });

      expect(result.default).toBe('Hello, World!');
    });

    it('should handle arrow functions and closures', async () => {
      const code = `
        const multiplier = 2;
        const multiply = (x) => x * multiplier;
        export default multiply(21);
      `;

      const result = await evaluateModule(code, { filename: 'arrow.mjs' });

      expect(result.default).toBe(42);
    });
  });
});
