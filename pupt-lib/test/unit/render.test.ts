import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component } from '../../src/component';
import { Fragment,jsx } from '../../src/jsx-runtime';
import { render } from '../../src/render';

const emptySchema = z.object({}).loose();

describe('render()', () => {
  it('should render string nodes', async () => {
    const result = await render(jsx(Fragment, { children: 'Hello World' }));
    expect(result.text).toBe('Hello World');
  });

  it('should render nested elements', async () => {
    const element = jsx(Fragment, {
      children: [
        'Line 1',
        '\n',
        'Line 2',
      ],
    });

    const result = await render(element);
    expect(result.text).toBe('Line 1\nLine 2');
  });

  it('should render Component instances', async () => {
    const greetingSchema = z.object({ name: z.string() }).loose();
    class Greeting extends Component<{ name: string }> {
      static schema = greetingSchema;
      render({ name }: { name: string }) {
        return `Hello, ${name}!`;
      }
    }

    const element = jsx(Greeting, { name: 'World' });
    const result = await render(element);

    expect(result.text).toBe('Hello, World!');
  });

  it('should pass context to components', async () => {
    class EnvAware extends Component {
      static schema = emptySchema;
      render(_props: Record<string, unknown>, _resolvedValue: void, context: Parameters<typeof Component.prototype.render>[2]) {
        return `Model: ${context.env.llm.model}`;
      }
    }

    const element = jsx(EnvAware, {});
    const result = await render(element);

    expect(result.text).toContain('Model:');
  });

  it('should return empty postExecution by default', async () => {
    const result = await render(jsx(Fragment, { children: 'test' }));
    expect(result.postExecution).toEqual([]);
  });

  it('should render function components directly', async () => {
    const Greeting = ({ name }: { name: string }) => `Hello, ${name}!`;
    (Greeting as unknown as { schema: unknown }).schema = z.object({ name: z.string() }).loose();

    const element = jsx(Greeting, { name: 'World' });
    const result = await render(element);

    expect(result.text).toBe('Hello, World!');
  });

  it('should produce a render error for string-typed elements', async () => {
    const element = jsx('Unknown' as unknown as typeof Component, { children: 'test' });
    const result = await render(element);

    expect(result.ok).toBe(false);
    expect(result.text).toBe('test');
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('unknown_component');
      expect(result.errors[0].component).toBe('Unknown');
      expect(result.errors[0].message).toContain('Components should be imported, not referenced by string');
    }
  });

  it('should handle null, undefined, and false nodes', async () => {
    const element = jsx(Fragment, {
      children: [null, 'visible', undefined, false, 'also visible'],
    });

    const result = await render(element);
    expect(result.text).toBe('visiblealso visible');
  });

  it('should handle number nodes', async () => {
    const element = jsx(Fragment, { children: [1, 2, 3] });
    const result = await render(element);
    expect(result.text).toBe('123');
  });

  it('should pass inputs to context', async () => {
    class InputReader extends Component {
      static schema = emptySchema;
      render(_props: Record<string, unknown>, _resolvedValue: void, context: Parameters<typeof Component.prototype.render>[2]) {
        return `Value: ${context.inputs.get('key')}`;
      }
    }

    const inputs = new Map([['key', 'test-value']]);
    const element = jsx(InputReader, {});
    const result = await render(element, { inputs });

    expect(result.text).toBe('Value: test-value');
  });

  it('should accept object inputs and convert to Map', async () => {
    class InputReader extends Component {
      static schema = emptySchema;
      render(_props: Record<string, unknown>, _resolvedValue: void, context: Parameters<typeof Component.prototype.render>[2]) {
        return `Value: ${context.inputs.get('key')}`;
      }
    }

    const element = jsx(InputReader, {});
    const result = await render(element, { inputs: { key: 'test-value' } });

    expect(result.text).toBe('Value: test-value');
  });

  it('should support trim option', async () => {
    const result = await render(jsx(Fragment, { children: '  text  ' }), { trim: false });
    expect(result.text).toBe('  text  ');
  });

  it('should return empty string for invalid element types', async () => {
    // Create an element with an invalid type (not a function, class, or string)
    const invalidElement = {
      type: Symbol('invalid'),
      props: {},
      children: ['content'],
    };

    const result = await render(invalidElement as Parameters<typeof render>[0]);
    expect(result.text).toBe('');
  });

  describe('validation', () => {
    it('should return ok: true for valid component render', async () => {
      const result = await render(jsx(Fragment, { children: 'test' }));
      expect(result.ok).toBe(true);
    });

    it('should allow custom component without static schema', async () => {
      // Schema is optional - components work without it (like React PropTypes)
      class GitHubUser extends Component<{ username: string }> {
        // No schema defined - that's OK
        async render({ username }: { username: string }) {
          return `User: ${username}`;
        }
      }

      const element = jsx(GitHubUser, { username: 'octocat' });
      const result = await render(element);

      expect(result.ok).toBe(true);
      expect(result.text).toBe('User: octocat');
    });

    it('should allow component without schema', async () => {
      class NoSchema extends Component {
        render() { return 'hello'; }
      }

      const element = jsx(NoSchema, {});
      const result = await render(element);

      expect(result.ok).toBe(true);
      expect(result.text).toBe('hello');
    });

    it('should return ok: false with errors for invalid props', async () => {
      const testSchema = z.object({ name: z.string() }).loose();
      class Strict extends Component<{ name: string }> {
        static schema = testSchema;
        render({ name }: { name: string }) { return `Hello ${name}`; }
      }

      const element = jsx(Strict, {} as { name: string });
      const result = await render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].prop).toBe('name');
        expect(result.errors[0].component).toBe('Strict');
      }
    });

    it('should fall back to rendering children on validation failure', async () => {
      const testSchema = z.object({ name: z.string() }).loose();
      class Strict extends Component<{ name: string }> {
        static schema = testSchema;
        render({ name }: { name: string }) { return `Hello ${name}`; }
      }

      const element = jsx(Strict, { children: 'fallback content' } as unknown as { name: string });
      const result = await render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.text).toBe('fallback content');
      }
    });

    it('should render components without schema in nested tree', async () => {
      class NoSchema1 extends Component {
        render() { return 'a'; }
      }
      class NoSchema2 extends Component {
        render() { return 'b'; }
      }

      const element = jsx(Fragment, {
        children: [
          jsx(NoSchema1, {}),
          jsx(NoSchema2, {}),
        ],
      });

      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('ab');
    });

    it('should capture runtime errors as RenderError', async () => {
      class Throws extends Component {
        static schema = emptySchema;
        render() { throw new Error('boom'); }
      }

      const element = jsx(Throws, {});
      const result = await render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('runtime_error');
        expect(result.errors[0].message).toContain('boom');
      }
    });
  });

  describe('async rendering', () => {
    it('should handle async component render', async () => {
      class AsyncGreeting extends Component<{ name: string }> {
        static schema = z.object({ name: z.string() }).loose();
        async render({ name }: { name: string }) {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return `Hello, ${name}!`;
        }
      }

      const element = jsx(AsyncGreeting, { name: 'World' });
      const result = await render(element);

      expect(result.text).toBe('Hello, World!');
    });

    it('should handle mixed sync and async components', async () => {
      class SyncComponent extends Component {
        static schema = z.object({}).loose();
        render() {
          return 'Sync';
        }
      }

      class AsyncComponent extends Component {
        static schema = z.object({}).loose();
        async render() {
          await Promise.resolve();
          return 'Async';
        }
      }

      const element = jsx(Fragment, {
        children: [
          jsx(SyncComponent, {}),
          ' + ',
          jsx(AsyncComponent, {}),
        ],
      });

      const result = await render(element);
      expect(result.text).toBe('Sync + Async');
    });

    it('should handle nested async components', async () => {
      class Inner extends Component<{ value: string }> {
        static schema = z.object({ value: z.string() }).loose();
        async render({ value }: { value: string }) {
          await Promise.resolve();
          return `[${value}]`;
        }
      }

      class Outer extends Component {
        static schema = z.object({}).loose();
        async render() {
          await Promise.resolve();
          return jsx(Inner, { value: 'nested' });
        }
      }

      const result = await render(jsx(Outer, {}));
      expect(result.text).toBe('[nested]');
    });

    it('should handle async function components', async () => {
      const AsyncFn = async ({ name }: { name: string }) => {
        await Promise.resolve();
        return `Hello, ${name}!`;
      };
      (AsyncFn as unknown as { schema: unknown }).schema = z.object({ name: z.string() }).loose();

      const element = jsx(AsyncFn, { name: 'World' });
      const result = await render(element);

      expect(result.text).toBe('Hello, World!');
    });

    it('should capture errors from async component render', async () => {
      class AsyncThrows extends Component {
        static schema = z.object({}).loose();
        async render() {
          await Promise.resolve();
          throw new Error('async boom');
        }
      }

      const element = jsx(AsyncThrows, {});
      const result = await render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('runtime_error');
        expect(result.errors[0].message).toContain('async boom');
      }
    });

    it('should render async children in parallel', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      class TimedComponent extends Component<{ id: number }> {
        static schema = z.object({ id: z.number() }).loose();
        async render({ id }: { id: number }) {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 50));
          endTimes.push(Date.now());
          return `${id}`;
        }
      }

      const element = jsx(Fragment, {
        children: [
          jsx(TimedComponent, { id: 1 }),
          jsx(TimedComponent, { id: 2 }),
          jsx(TimedComponent, { id: 3 }),
        ],
      });

      const start = Date.now();
      const result = await render(element);
      const totalTime = Date.now() - start;

      expect(result.text).toBe('123');
      // If running in parallel, total time should be ~50ms, not ~150ms
      // Allow some margin for test execution overhead
      expect(totalTime).toBeLessThan(120);
    });
  });
});
