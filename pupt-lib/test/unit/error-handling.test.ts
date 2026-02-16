import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component,render } from '../../src';
import { jsx } from '../../src/jsx-runtime';

describe('Error handling', () => {
  describe('resolve() errors', () => {
    it('should capture error when resolve() throws', async () => {
      class Failing extends Component<Record<string, never>, string> {
        static schema = z.object({});

        resolve(): string {
          throw new Error('Intentional failure');
        }
      }

      const result = await render(jsx(Failing, {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Intentional failure');
      }
    });

    it('should capture error when async resolve() rejects', async () => {
      class AsyncFailing extends Component<Record<string, never>, string> {
        static schema = z.object({});

        async resolve(): Promise<string> {
          throw new Error('Async failure');
        }
      }

      const result = await render(jsx(AsyncFailing, {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Async failure');
      }
    });
  });

  describe('undefined property access', () => {
    it('should handle undefined property access gracefully', async () => {
      class Source extends Component<Record<string, never>, { name: string }> {
        static schema = z.object({});

        resolve() {
          return { name: 'test' };
        }
      }

      class Consumer extends Component<{ value: string }> {
        static schema = z.object({ value: z.unknown() });

        render({ value }: { value: string }) {
          return `Value: ${value === undefined ? 'undefined' : value}`;
        }
      }

      const source = jsx(Source, {});
      const sourceTyped = source as unknown as Record<string, unknown>;
      // Access a property that doesn't exist
      const nonexistentRef = sourceTyped.nonexistent;

      const result = await render(jsx(Consumer, { value: nonexistentRef }));
      expect(result.text).toBe('Value: undefined');
    });

    it('should handle deep undefined property access gracefully', async () => {
      class Source extends Component<Record<string, never>, { user: { name: string } }> {
        static schema = z.object({});

        resolve() {
          return { user: { name: 'test' } };
        }
      }

      class Consumer extends Component<{ value: unknown }> {
        static schema = z.object({ value: z.unknown() });

        render({ value }: { value: unknown }) {
          return `Value: ${value === undefined ? 'undefined' : value}`;
        }
      }

      const source = jsx(Source, {});
      const sourceTyped = source as unknown as Record<string, unknown>;
      // Access a path that doesn't exist
      const userRef = sourceTyped.user as Record<string, unknown>;
      const missingRef = userRef.missing;

      const result = await render(jsx(Consumer, { value: missingRef }));
      expect(result.text).toBe('Value: undefined');
    });
  });

  describe('render() errors', () => {
    it('should capture error when render() throws', async () => {
      class FailingRender extends Component<Record<string, never>> {
        static schema = z.object({});

        render(): string {
          throw new Error('Render failure');
        }
      }

      const result = await render(jsx(FailingRender, {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Render failure');
      }
    });

    it('should capture error when async render() rejects', async () => {
      class AsyncFailingRender extends Component<Record<string, never>> {
        static schema = z.object({});

        async render(): Promise<string> {
          throw new Error('Async render failure');
        }
      }

      const result = await render(jsx(AsyncFailingRender, {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Async render failure');
      }
    });
  });

  describe('component name in error messages', () => {
    it('should include component name in error messages', async () => {
      class MySpecialComponent extends Component<Record<string, never>> {
        static schema = z.object({});

        render(): string {
          throw new Error('Something went wrong');
        }
      }

      const result = await render(jsx(MySpecialComponent, {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].component).toBe('MySpecialComponent');
      }
    });
  });

  describe('error recovery', () => {
    it('should continue rendering siblings after component error', async () => {
      class Failing extends Component<Record<string, never>> {
        static schema = z.object({});

        render(): string {
          throw new Error('I failed');
        }
      }

      class Working extends Component<Record<string, never>> {
        static schema = z.object({});

        render() {
          return 'I work';
        }
      }

      const result = await render(jsx('Fragment' as unknown as typeof Component, {
        children: [
          jsx(Failing, {}),
          jsx(Working, {}),
        ],
      }));

      // Should have errors
      expect(result.ok).toBe(false);
      // But Working component should still render
      expect(result.text).toContain('I work');
    });
  });

  describe('dependency errors', () => {
    it('should handle errors in dependency resolution', async () => {
      class FailingSource extends Component<Record<string, never>, string> {
        static schema = z.object({});

        resolve(): string {
          throw new Error('Source failed');
        }
      }

      class Consumer extends Component<{ value: string }> {
        static schema = z.object({ value: z.unknown() });

        render({ value }: { value: string }) {
          return `Got: ${value}`;
        }
      }

      const source = jsx(FailingSource, {});
      const consumer = jsx(Consumer, { value: source as unknown as string });

      const result = await render(consumer);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some(e => e.message.includes('Source failed'))).toBe(true);
      }
    });
  });
});
