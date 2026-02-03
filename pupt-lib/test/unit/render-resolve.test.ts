import { describe, it, expect } from 'vitest';
import { render, Component } from '../../src';
import { jsx } from '../../src/jsx-runtime';
import { z } from 'zod';
import type { RenderContext } from '../../src/types';

describe('Renderer value resolution', () => {
  it('should call resolve() before render()', async () => {
    const callOrder: string[] = [];

    class TrackedComponent extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        callOrder.push('resolve');
        return 'resolved-value';
      }

      render(_props: Record<string, unknown>, _context: RenderContext) {
        callOrder.push('render');
        // Access the resolved value from the context
        return 'Value rendered';
      }
    }

    const element = jsx(TrackedComponent, {});
    const result = await render(element);
    expect(callOrder).toEqual(['resolve', 'render']);
    expect(result.text).toBe('Value rendered');
  });

  it('should pass resolved value to render()', async () => {
    class ValuePassingComponent extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return 'my-resolved-value';
      }

      render(_props: Record<string, unknown>, resolvedValue: string) {
        return `Got: ${resolvedValue}`;
      }
    }

    const element = jsx(ValuePassingComponent, {});
    const result = await render(element);
    expect(result.text).toBe('Got: my-resolved-value');
  });

  it('should pass resolved element values as props', async () => {
    class Inner extends Component<{ prefix: string }, string> {
      static schema = z.object({ prefix: z.string() });

      resolve({ prefix }: { prefix: string }) {
        return `${prefix}-inner`;
      }
    }

    class Outer extends Component<{ value: string }> {
      static schema = z.object({ value: z.string() });

      render({ value }: { value: string }) {
        return `Got: ${value}`;
      }
    }

    const inner = jsx(Inner, { prefix: 'test' });
    const outer = jsx(Outer, { value: inner as unknown as string });
    const result = await render(outer);
    expect(result.text).toBe('Got: test-inner');
  });

  it('should handle components with only resolve()', async () => {
    class ValueOnly extends Component<Record<string, unknown>, number> {
      static schema = z.object({});

      resolve() {
        return 42;
      }
    }

    const element = jsx(ValueOnly, {});
    const result = await render(element);
    expect(result.text).toBe('42');
  });

  it('should handle async resolve()', async () => {
    class AsyncFetch extends Component<Record<string, unknown>, { data: string }> {
      static schema = z.object({});

      async resolve() {
        return { data: 'fetched' };
      }

      render(_props: Record<string, unknown>, value: { data: string }) {
        return value.data;
      }
    }

    const element = jsx(AsyncFetch, {});
    const result = await render(element);
    expect(result.text).toBe('fetched');
  });

  it('should handle components with only render() (backward compatibility)', async () => {
    class RenderOnly extends Component<{ name: string }> {
      static schema = z.object({ name: z.string() });

      render({ name }: { name: string }) {
        return `Hello, ${name}!`;
      }
    }

    const element = jsx(RenderOnly, { name: 'World' });
    const result = await render(element);
    expect(result.text).toBe('Hello, World!');
  });

  it('should resolve nested element references in props', async () => {
    class Source extends Component<Record<string, unknown>, { nested: { value: string } }> {
      static schema = z.object({});

      resolve() {
        return { nested: { value: 'deep-value' } };
      }
    }

    class Consumer extends Component<{ data: { nested: { value: string } } }> {
      static schema = z.object({ data: z.any() });

      render({ data }: { data: { nested: { value: string } } }) {
        return `Got: ${data.nested.value}`;
      }
    }

    const source = jsx(Source, {});
    const consumer = jsx(Consumer, { data: source as unknown as { nested: { value: string } } });
    const result = await render(consumer);
    expect(result.text).toBe('Got: deep-value');
  });

  it('should handle resolve() returning undefined', async () => {
    class UndefinedResolve extends Component<Record<string, unknown>, undefined> {
      static schema = z.object({});

      resolve(): undefined {
        return undefined;
      }

      render() {
        return 'fallback';
      }
    }

    const element = jsx(UndefinedResolve, {});
    const result = await render(element);
    expect(result.text).toBe('fallback');
  });

  it('should handle resolve() returning null', async () => {
    class NullResolve extends Component<Record<string, unknown>, null> {
      static schema = z.object({});

      resolve(): null {
        return null;
      }
    }

    const element = jsx(NullResolve, {});
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should handle resolve() returning empty string', async () => {
    class EmptyStringResolve extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return '';
      }
    }

    const element = jsx(EmptyStringResolve, {});
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should handle resolve() returning false', async () => {
    class FalseResolve extends Component<Record<string, unknown>, boolean> {
      static schema = z.object({});

      resolve() {
        return false;
      }
    }

    const element = jsx(FalseResolve, {});
    const result = await render(element);
    expect(result.text).toBe('false');
  });

  it('should handle resolve() returning 0', async () => {
    class ZeroResolve extends Component<Record<string, unknown>, number> {
      static schema = z.object({});

      resolve() {
        return 0;
      }
    }

    const element = jsx(ZeroResolve, {});
    const result = await render(element);
    expect(result.text).toBe('0');
  });

  it('should resolve element props in arrays', async () => {
    class Source extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return 'array-value';
      }
    }

    class ArrayConsumer extends Component<{ items: string[] }> {
      static schema = z.object({ items: z.array(z.any()) });

      render({ items }: { items: string[] }) {
        return `Items: ${items.join(', ')}`;
      }
    }

    const source = jsx(Source, {});
    const consumer = jsx(ArrayConsumer, { items: [source as unknown as string, 'literal'] });
    const result = await render(consumer);
    expect(result.text).toBe('Items: array-value, literal');
  });
});
