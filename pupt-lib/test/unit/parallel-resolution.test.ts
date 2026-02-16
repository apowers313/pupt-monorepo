import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component,render } from '../../src';
import { Fragment,jsx } from '../../src/jsx-runtime';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Parallel async resolution', () => {
  it('should resolve independent components in parallel', async () => {
    const timing: string[] = [];

    class SlowA extends Component<Record<string, never>, string> {
      static schema = z.object({});

      async resolve() {
        timing.push('A-start');
        await delay(50);
        timing.push('A-end');
        return 'A';
      }

      render(_props: Record<string, never>, value: string) {
        return value;
      }
    }

    class SlowB extends Component<Record<string, never>, string> {
      static schema = z.object({});

      async resolve() {
        timing.push('B-start');
        await delay(50);
        timing.push('B-end');
        return 'B';
      }

      render(_props: Record<string, never>, value: string) {
        return value;
      }
    }

    const start = Date.now();
    await render(
      jsx(Fragment, {
        children: [
          jsx(SlowA, {}),
          jsx(SlowB, {}),
        ],
      }),
    );
    const elapsed = Date.now() - start;

    // If parallel, should take ~50ms, not ~100ms
    // Allow some margin for test environment variability
    expect(elapsed).toBeLessThan(90);

    // Both should start before either finishes
    const aEndIndex = timing.indexOf('A-end');
    const bStartIndex = timing.indexOf('B-start');
    expect(bStartIndex).toBeLessThan(aEndIndex);
  });

  it('should wait for dependencies before resolving', async () => {
    const timing: string[] = [];

    class Source extends Component<Record<string, never>, string> {
      static schema = z.object({});

      async resolve() {
        timing.push('Source-start');
        await delay(30);
        timing.push('Source-end');
        return 'data';
      }
    }

    class Consumer extends Component<{ data: string }> {
      static schema = z.object({ data: z.unknown() });

      render({ data }: { data: string }) {
        timing.push('Consumer-render');
        return data;
      }
    }

    const source = jsx(Source, {});
    await render(jsx(Consumer, { data: source as unknown as string }));

    // Consumer should render after Source resolves
    expect(timing).toEqual(['Source-start', 'Source-end', 'Consumer-render']);
  });

  it('should resolve parallel sources before dependent consumer', async () => {
    const timing: string[] = [];

    class SourceA extends Component<Record<string, never>, string> {
      static schema = z.object({});

      async resolve() {
        timing.push('A-start');
        await delay(30);
        timing.push('A-end');
        return 'dataA';
      }
    }

    class SourceB extends Component<Record<string, never>, string> {
      static schema = z.object({});

      async resolve() {
        timing.push('B-start');
        await delay(30);
        timing.push('B-end');
        return 'dataB';
      }
    }

    class Consumer extends Component<{ a: string; b: string }> {
      static schema = z.object({ a: z.unknown(), b: z.unknown() });

      render({ a, b }: { a: string; b: string }) {
        timing.push('Consumer-render');
        return `${a}-${b}`;
      }
    }

    const sourceA = jsx(SourceA, {});
    const sourceB = jsx(SourceB, {});
    const consumer = jsx(Consumer, {
      a: sourceA as unknown as string,
      b: sourceB as unknown as string,
    });

    const start = Date.now();
    const result = await render(consumer);
    const elapsed = Date.now() - start;

    // Both sources should be resolved in parallel, so ~30ms not ~60ms
    expect(elapsed).toBeLessThan(60);

    // Consumer should render after both sources
    expect(timing.indexOf('Consumer-render')).toBeGreaterThan(timing.indexOf('A-end'));
    expect(timing.indexOf('Consumer-render')).toBeGreaterThan(timing.indexOf('B-end'));

    expect(result.text).toBe('dataA-dataB');
  });

  it('should handle mixed sync and async resolve methods', async () => {
    class SyncSource extends Component<Record<string, never>, string> {
      static schema = z.object({});

      resolve() {
        return 'sync';
      }
    }

    class AsyncSource extends Component<Record<string, never>, string> {
      static schema = z.object({});

      async resolve() {
        await delay(10);
        return 'async';
      }
    }

    class Consumer extends Component<{ sync: string; async: string }> {
      static schema = z.object({ sync: z.unknown(), async: z.unknown() });

      render({ sync, async }: { sync: string; async: string }) {
        return `${sync}-${async}`;
      }
    }

    const syncSource = jsx(SyncSource, {});
    const asyncSource = jsx(AsyncSource, {});
    const consumer = jsx(Consumer, {
      sync: syncSource as unknown as string,
      async: asyncSource as unknown as string,
    });

    const result = await render(consumer);
    expect(result.text).toBe('sync-async');
  });

  it('should handle deeply nested dependencies correctly', async () => {
    class A extends Component<Record<string, never>, string> {
      static schema = z.object({});

      resolve() {
        return 'a-value';
      }
    }

    class B extends Component<{ from: string }, string> {
      static schema = z.object({ from: z.unknown() });

      resolve({ from }: { from: string }) {
        return `${from}+b`;
      }
    }

    class C extends Component<{ from: string }> {
      static schema = z.object({ from: z.unknown() });

      render({ from }: { from: string }) {
        return `Final: ${from}`;
      }
    }

    const a = jsx(A, {});
    const b = jsx(B, { from: a as unknown as string });
    const result = await render(jsx(C, { from: b as unknown as string }));

    expect(result.text).toBe('Final: a-value+b');
  });

  it('should handle multiple consumers of the same source', async () => {
    let resolveCount = 0;

    class Source extends Component<Record<string, never>, number> {
      static schema = z.object({});

      resolve() {
        resolveCount++;
        return 42;
      }
    }

    class ConsumerA extends Component<{ value: number }> {
      static schema = z.object({ value: z.unknown() });

      render({ value }: { value: number }) {
        return `A: ${value}`;
      }
    }

    class ConsumerB extends Component<{ value: number }> {
      static schema = z.object({ value: z.unknown() });

      render({ value }: { value: number }) {
        return `B: ${value}`;
      }
    }

    const source = jsx(Source, {});
    const consumerA = jsx(ConsumerA, { value: source as unknown as number });
    const consumerB = jsx(ConsumerB, { value: source as unknown as number });

    const result = await render(jsx(Fragment, { children: [consumerA, consumerB] }));

    // Source should only be resolved once
    expect(resolveCount).toBe(1);
    expect(result.text).toContain('A: 42');
    expect(result.text).toContain('B: 42');
  });
});
