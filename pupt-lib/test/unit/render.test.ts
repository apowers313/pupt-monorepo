import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx, Fragment } from '../../src/jsx-runtime';
import { Component } from '../../src/component';
import { createRegistry } from '../../src/services/component-registry';

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
    class Greeting extends Component<{ name: string }> {
      render({ name }) {
        return `Hello, ${name}!`;
      }
    }

    const registry = createRegistry();
    registry.register('Greeting', Greeting);

    const element = jsx(Greeting, { name: 'World' });
    const result = render(element, { registry });

    expect(result.text).toBe('Hello, World!');
  });

  it('should pass context to components', () => {
    class EnvAware extends Component {
      render(props, context) {
        return `Model: ${context.env.llm.model}`;
      }
    }

    const registry = createRegistry();
    registry.register('EnvAware', EnvAware);

    const element = jsx(EnvAware, {});
    const result = render(element, { registry });

    expect(result.text).toContain('Model:');
  });

  it('should return empty postExecution by default', () => {
    const result = render(jsx(Fragment, { children: 'test' }));
    expect(result.postExecution).toEqual([]);
  });

  it('should render function components via registry', () => {
    const Greeting = ({ name }: { name: string }) => `Hello, ${name}!`;

    const registry = createRegistry();
    registry.register('Greeting', Greeting);

    // jsx converts function to string name, registry resolves at render time
    const element = jsx(Greeting, { name: 'World' });
    const result = render(element, { registry });

    expect(result.text).toBe('Hello, World!');
  });

  it('should look up string types in registry', () => {
    class Hello extends Component<{ children?: string }> {
      render({ children }) {
        return `Hello, ${children}!`;
      }
    }

    const registry = createRegistry();
    registry.register('Hello', Hello);

    const element = jsx('Hello' as unknown as typeof Hello, { children: 'World' });
    const result = render(element, { registry });

    expect(result.text).toBe('Hello, World!');
  });

  it('should look up function components in registry', () => {
    const FunctionGreeting = ({ name }: { name: string }) => `Hi, ${name}!`;

    const registry = createRegistry();
    registry.register('FunctionGreeting', FunctionGreeting);

    const element = jsx('FunctionGreeting' as unknown as typeof Component, { name: 'Alice' });
    const result = render(element, { registry });

    expect(result.text).toBe('Hi, Alice!');
  });

  it('should handle unknown string types gracefully', () => {
    const consoleWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);

    const element = jsx('Unknown' as unknown as typeof Component, { children: 'test' });
    const result = render(element);

    expect(result.text).toBe('test');
    expect(warnings).toContain('Unknown component: Unknown');

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
      render(_props, context) {
        return `Value: ${context.inputs.get('key')}`;
      }
    }

    const registry = createRegistry();
    registry.register('InputReader', InputReader);

    const inputs = new Map([['key', 'test-value']]);
    const element = jsx(InputReader, {});
    const result = render(element, { inputs, registry });

    expect(result.text).toBe('Value: test-value');
  });

  it('should accept object inputs and convert to Map', () => {
    class InputReader extends Component {
      render(_props, context) {
        return `Value: ${context.inputs.get('key')}`;
      }
    }

    const registry = createRegistry();
    registry.register('InputReader', InputReader);

    const element = jsx(InputReader, {});
    const result = render(element, { inputs: { key: 'test-value' }, registry });

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
});
