import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component,render } from '../../src';
import { jsx } from '../../src/jsx-runtime';

describe('Optional schema for components', () => {
  describe('components with resolve() only', () => {
    it('should allow components without schema when they only have resolve()', async () => {
      // Component that exports a value but has no schema defined
      class ValueExporter extends Component<Record<string, never>, string> {
        resolve(): string {
          return 'exported-value';
        }
      }

      const result = await render(jsx(ValueExporter, {}));
      expect(result.ok).toBe(true);
      expect(result.text).toBe('exported-value');
    });

    it('should allow async resolve() components without schema', async () => {
      class AsyncValueExporter extends Component<Record<string, never>, number> {
        async resolve(): Promise<number> {
          return 42;
        }
      }

      const result = await render(jsx(AsyncValueExporter, {}));
      expect(result.ok).toBe(true);
      expect(result.text).toBe('42');
    });

    it('should allow components with props but no schema when they only have resolve()', async () => {
      class PropsValueExporter extends Component<{ multiplier: number }, number> {
        resolve({ multiplier }: { multiplier: number }): number {
          return 10 * multiplier;
        }
      }

      const result = await render(jsx(PropsValueExporter, { multiplier: 5 }));
      expect(result.ok).toBe(true);
      expect(result.text).toBe('50');
    });
  });

  describe('components with both resolve() and render()', () => {
    it('should allow components without schema when they have both resolve() and render()', async () => {
      class DualExporter extends Component<{ prefix: string }, string> {
        resolve({ prefix }: { prefix: string }): string {
          return `${prefix}-data`;
        }

        render(_props: { prefix: string }, resolvedValue: string): string {
          return `Rendered: ${resolvedValue}`;
        }
      }

      const result = await render(jsx(DualExporter, { prefix: 'test' }));
      expect(result.ok).toBe(true);
      expect(result.text).toBe('Rendered: test-data');
    });
  });

  describe('components with render() only', () => {
    it('should allow components without schema when they only have render()', async () => {
      class RenderOnly extends Component<{ name: string }> {
        render({ name }: { name: string }): string {
          return `Hello, ${name}!`;
        }
      }

      const result = await render(jsx(RenderOnly, { name: 'World' }));
      expect(result.ok).toBe(true);
      expect(result.text).toBe('Hello, World!');
    });

    it('should work when render-only component has schema', async () => {
      class RenderOnlyWithSchema extends Component<{ name: string }> {
        static schema = z.object({ name: z.string() });

        render({ name }: { name: string }): string {
          return `Hello, ${name}!`;
        }
      }

      const result = await render(jsx(RenderOnlyWithSchema, { name: 'World' }));
      expect(result.ok).toBe(true);
      expect(result.text).toBe('Hello, World!');
    });
  });

  describe('schema validation still works when provided', () => {
    it('should validate props when schema is provided for resolve-only component', async () => {
      class ValidatedExporter extends Component<{ value: string }, string> {
        static schema = z.object({ value: z.string().min(3) });

        resolve({ value }: { value: string }): string {
          return value.toUpperCase();
        }
      }

      // Valid props
      const goodResult = await render(jsx(ValidatedExporter, { value: 'hello' }));
      expect(goodResult.ok).toBe(true);
      expect(goodResult.text).toBe('HELLO');

      // Invalid props - string too short
      const badResult = await render(jsx(ValidatedExporter, { value: 'ab' }));
      expect(badResult.ok).toBe(false);
    });
  });
});
