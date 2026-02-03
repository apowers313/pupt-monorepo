import { describe, it, expect } from 'vitest';
import { render, Component } from '../../src';
import { jsx } from '../../src/jsx-runtime';
import { z } from 'zod';

describe('Chained resolution', () => {
  it('should resolve dependency chain: A -> B -> C', async () => {
    class A extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return 'a-value';
      }
    }

    class B extends Component<{ from: string }, string> {
      static schema = z.object({ from: z.any() });

      resolve({ from }: { from: string }) {
        return `${from}+b`;
      }
    }

    class C extends Component<{ from: string }> {
      static schema = z.object({ from: z.any() });

      render({ from }: { from: string }) {
        return `Final: ${from}`;
      }
    }

    const a = jsx(A, {});
    const b = jsx(B, { from: a as unknown as string });
    const c = jsx(C, { from: b as unknown as string });
    const result = await render(c);
    expect(result.text).toBe('Final: a-value+b');
  });

  it('should resolve multiple dependencies in correct order', async () => {
    const resolveOrder: string[] = [];

    class First extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        resolveOrder.push('First');
        return 'first-value';
      }
    }

    class Second extends Component<{ first: string }, string> {
      static schema = z.object({ first: z.any() });

      resolve({ first }: { first: string }) {
        resolveOrder.push('Second');
        return `${first}+second`;
      }
    }

    class Third extends Component<{ second: string }> {
      static schema = z.object({ second: z.any() });

      render({ second }: { second: string }) {
        resolveOrder.push('Third');
        return second;
      }
    }

    const first = jsx(First, {});
    const second = jsx(Second, { first: first as unknown as string });
    const third = jsx(Third, { second: second as unknown as string });
    const result = await render(third);

    expect(resolveOrder).toEqual(['First', 'Second', 'Third']);
    expect(result.text).toBe('first-value+second');
  });

  it('should handle diamond dependency pattern', async () => {
    // A is used by both B and C, which are both used by D
    class A extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return 'a';
      }
    }

    class B extends Component<{ a: string }, string> {
      static schema = z.object({ a: z.any() });

      resolve({ a }: { a: string }) {
        return `b(${a})`;
      }
    }

    class C extends Component<{ a: string }, string> {
      static schema = z.object({ a: z.any() });

      resolve({ a }: { a: string }) {
        return `c(${a})`;
      }
    }

    class D extends Component<{ b: string; c: string }> {
      static schema = z.object({ b: z.any(), c: z.any() });

      render({ b, c }: { b: string; c: string }) {
        return `D: ${b}, ${c}`;
      }
    }

    const a = jsx(A, {});
    const b = jsx(B, { a: a as unknown as string });
    const c = jsx(C, { a: a as unknown as string });
    const d = jsx(D, { b: b as unknown as string, c: c as unknown as string });
    const result = await render(d);

    expect(result.text).toBe('D: b(a), c(a)');
  });

  it('should handle async resolution chain', async () => {
    class AsyncA extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      async resolve() {
        await new Promise(r => setTimeout(r, 10));
        return 'async-a';
      }
    }

    class AsyncB extends Component<{ from: string }, string> {
      static schema = z.object({ from: z.any() });

      async resolve({ from }: { from: string }) {
        await new Promise(r => setTimeout(r, 10));
        return `${from}+async-b`;
      }
    }

    class Display extends Component<{ value: string }> {
      static schema = z.object({ value: z.any() });

      render({ value }: { value: string }) {
        return `Result: ${value}`;
      }
    }

    const a = jsx(AsyncA, {});
    const b = jsx(AsyncB, { from: a as unknown as string });
    const display = jsx(Display, { value: b as unknown as string });
    const result = await render(display);

    expect(result.text).toBe('Result: async-a+async-b');
  });

  it('should handle mixed sync and async resolution', async () => {
    class SyncSource extends Component<Record<string, unknown>, number> {
      static schema = z.object({});

      resolve() {
        return 42;
      }
    }

    class AsyncProcessor extends Component<{ input: number }, number> {
      static schema = z.object({ input: z.any() });

      async resolve({ input }: { input: number }) {
        await new Promise(r => setTimeout(r, 5));
        return input * 2;
      }
    }

    class Display extends Component<{ value: number }> {
      static schema = z.object({ value: z.any() });

      render({ value }: { value: number }) {
        return `Value: ${value}`;
      }
    }

    const sync = jsx(SyncSource, {});
    const async_ = jsx(AsyncProcessor, { input: sync as unknown as number });
    const display = jsx(Display, { value: async_ as unknown as number });
    const result = await render(display);

    expect(result.text).toBe('Value: 84');
  });

  it('should handle multiple independent branches', async () => {
    class LeftBranch extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return 'left';
      }
    }

    class RightBranch extends Component<Record<string, unknown>, string> {
      static schema = z.object({});

      resolve() {
        return 'right';
      }
    }

    class Combiner extends Component<{ left: string; right: string }> {
      static schema = z.object({ left: z.any(), right: z.any() });

      render({ left, right }: { left: string; right: string }) {
        return `Combined: ${left} + ${right}`;
      }
    }

    const left = jsx(LeftBranch, {});
    const right = jsx(RightBranch, {});
    const combiner = jsx(Combiner, {
      left: left as unknown as string,
      right: right as unknown as string,
    });
    const result = await render(combiner);

    expect(result.text).toBe('Combined: left + right');
  });
});
