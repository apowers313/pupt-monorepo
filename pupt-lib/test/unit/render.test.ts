import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { render } from '../../src/render';
import { jsx, Fragment } from '../../src/jsx-runtime';
import { Component } from '../../src/component';

const emptySchema = z.object({}).passthrough();

describe('render()', () => {
  it('should render string nodes', () => {
    const result = render(jsx(Fragment, { children: 'Hello World' }));
    expect(result.text).toBe('Hello World');
  });

  it('should render nested elements', () => {
    const element = jsx(Fragment, {
      children: [
        'Line 1',
        '\n',
        'Line 2',
      ],
    });

    const result = render(element);
    expect(result.text).toBe('Line 1\nLine 2');
  });

  it('should render Component instances', () => {
    const greetingSchema = z.object({ name: z.string() }).passthrough();
    class Greeting extends Component<{ name: string }> {
      static schema = greetingSchema;
      render({ name }: { name: string }) {
        return `Hello, ${name}!`;
      }
    }

    const element = jsx(Greeting, { name: 'World' });
    const result = render(element);

    expect(result.text).toBe('Hello, World!');
  });

  it('should pass context to components', () => {
    class EnvAware extends Component {
      static schema = emptySchema;
      render(_props: Record<string, unknown>, context: Parameters<typeof Component.prototype.render>[1]) {
        return `Model: ${context.env.llm.model}`;
      }
    }

    const element = jsx(EnvAware, {});
    const result = render(element);

    expect(result.text).toContain('Model:');
  });

  it('should return empty postExecution by default', () => {
    const result = render(jsx(Fragment, { children: 'test' }));
    expect(result.postExecution).toEqual([]);
  });

  it('should render function components directly', () => {
    const Greeting = ({ name }: { name: string }) => `Hello, ${name}!`;
    (Greeting as unknown as { schema: unknown }).schema = z.object({ name: z.string() }).passthrough();

    const element = jsx(Greeting, { name: 'World' });
    const result = render(element);

    expect(result.text).toBe('Hello, World!');
  });

  it('should handle unknown string types gracefully', () => {
    const consoleWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);

    const element = jsx('Unknown' as unknown as typeof Component, { children: 'test' });
    const result = render(element);

    expect(result.text).toBe('test');
    expect(warnings).toContain('Unknown component type "Unknown". Components should be imported, not referenced by string.');

    console.warn = consoleWarn;
  });

  it('should handle null, undefined, and false nodes', () => {
    const element = jsx(Fragment, {
      children: [null, 'visible', undefined, false, 'also visible'],
    });

    const result = render(element);
    expect(result.text).toBe('visiblealso visible');
  });

  it('should handle number nodes', () => {
    const element = jsx(Fragment, { children: [1, 2, 3] });
    const result = render(element);
    expect(result.text).toBe('123');
  });

  it('should pass inputs to context', () => {
    class InputReader extends Component {
      static schema = emptySchema;
      render(_props: Record<string, unknown>, context: Parameters<typeof Component.prototype.render>[1]) {
        return `Value: ${context.inputs.get('key')}`;
      }
    }

    const inputs = new Map([['key', 'test-value']]);
    const element = jsx(InputReader, {});
    const result = render(element, { inputs });

    expect(result.text).toBe('Value: test-value');
  });

  it('should accept object inputs and convert to Map', () => {
    class InputReader extends Component {
      static schema = emptySchema;
      render(_props: Record<string, unknown>, context: Parameters<typeof Component.prototype.render>[1]) {
        return `Value: ${context.inputs.get('key')}`;
      }
    }

    const element = jsx(InputReader, {});
    const result = render(element, { inputs: { key: 'test-value' } });

    expect(result.text).toBe('Value: test-value');
  });

  it('should support trim option', () => {
    const result = render(jsx(Fragment, { children: '  text  ' }), { trim: false });
    expect(result.text).toBe('  text  ');
  });

  it('should return empty string for invalid element types', () => {
    // Create an element with an invalid type (not a function, class, or string)
    const invalidElement = {
      type: Symbol('invalid'),
      props: {},
      children: ['content'],
    };

    const result = render(invalidElement as Parameters<typeof render>[0]);
    expect(result.text).toBe('');
  });

  describe('validation', () => {
    it('should return ok: true for valid component render', () => {
      const result = render(jsx(Fragment, { children: 'test' }));
      expect(result.ok).toBe(true);
    });

    it('should return ok: false with errors for component without schema', () => {
      class NoSchema extends Component {
        render() { return 'hello'; }
      }

      const element = jsx(NoSchema, {});
      const result = render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('missing_schema');
        expect(result.errors[0].component).toBe('NoSchema');
      }
    });

    it('should return ok: false with errors for invalid props', () => {
      const testSchema = z.object({ name: z.string() }).passthrough();
      class Strict extends Component<{ name: string }> {
        static schema = testSchema;
        render({ name }: { name: string }) { return `Hello ${name}`; }
      }

      const element = jsx(Strict, {} as { name: string });
      const result = render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].prop).toBe('name');
        expect(result.errors[0].component).toBe('Strict');
      }
    });

    it('should fall back to rendering children on validation failure', () => {
      const testSchema = z.object({ name: z.string() }).passthrough();
      class Strict extends Component<{ name: string }> {
        static schema = testSchema;
        render({ name }: { name: string }) { return `Hello ${name}`; }
      }

      const element = jsx(Strict, { children: 'fallback content' } as unknown as { name: string });
      const result = render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.text).toBe('fallback content');
      }
    });

    it('should accumulate errors from nested components', () => {
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

      const result = render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].component).toBe('NoSchema1');
        expect(result.errors[1].component).toBe('NoSchema2');
      }
    });

    it('should capture runtime errors as RenderError', () => {
      class Throws extends Component {
        static schema = emptySchema;
        render() { throw new Error('boom'); }
      }

      const element = jsx(Throws, {});
      const result = render(element);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('runtime_error');
        expect(result.errors[0].message).toContain('boom');
      }
    });
  });
});
