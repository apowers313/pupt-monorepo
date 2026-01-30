import { describe, it, expect } from 'vitest';
import { Component, isComponentClass, COMPONENT_MARKER } from '../../src/component';
import type { RenderContext } from '../../src/types';

class TestComponent extends Component<{ name: string }> {
  render(props: { name: string }): string {
    return `Hello, ${props.name}!`;
  }
}

class ContextAwareComponent extends Component<{ value: number }> {
  render(props: { value: number }, context: RenderContext): string {
    return `Value: ${props.value}, Model: ${context.env.llm.model}`;
  }
}

describe('Component', () => {
  it('should have COMPONENT_MARKER', () => {
    expect(TestComponent[COMPONENT_MARKER]).toBe(true);
  });

  it('should render with props', () => {
    const instance = new TestComponent();
    const mockContext: RenderContext = {
      env: {
        llm: { model: 'test-model', provider: 'test' },
        output: { format: 'xml', trim: true, indent: '  ' },
        code: { language: 'typescript' },
        user: { editor: 'unknown' },
        runtime: {},
      },
      inputs: {},
      depth: 0,
    };
    const result = instance.render({ name: 'World' }, mockContext);
    expect(result).toBe('Hello, World!');
  });

  it('should have access to context', () => {
    const instance = new ContextAwareComponent();
    const mockContext: RenderContext = {
      env: {
        llm: { model: 'unspecified', provider: 'unspecified' },
        output: { format: 'xml', trim: true, indent: '  ' },
        code: { language: 'typescript' },
        user: { editor: 'unknown' },
        runtime: {},
      },
      inputs: {},
      depth: 0,
    };
    const result = instance.render({ value: 42 }, mockContext);
    expect(result).toBe('Value: 42, Model: unspecified');
  });
});

describe('isComponentClass()', () => {
  it('should return true for Component subclass', () => {
    expect(isComponentClass(TestComponent)).toBe(true);
  });

  it('should return true for ContextAwareComponent', () => {
    expect(isComponentClass(ContextAwareComponent)).toBe(true);
  });

  it('should return false for plain function', () => {
    const fn = () => 'test';
    expect(isComponentClass(fn)).toBe(false);
  });

  it('should return false for arrow function component', () => {
    const ArrowComponent = (props: { name: string }) => `Hello ${props.name}`;
    expect(isComponentClass(ArrowComponent)).toBe(false);
  });

  it('should return false for string', () => {
    expect(isComponentClass('string')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isComponentClass(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isComponentClass(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(isComponentClass({})).toBe(false);
  });

  it('should return false for number', () => {
    expect(isComponentClass(42)).toBe(false);
  });

  it('should return false for class without marker', () => {
    class PlainClass {
      render() {
        return 'test';
      }
    }
    expect(isComponentClass(PlainClass)).toBe(false);
  });
});

describe('COMPONENT_MARKER', () => {
  it('should be a symbol', () => {
    expect(typeof COMPONENT_MARKER).toBe('symbol');
  });

  it('should have consistent value', () => {
    expect(COMPONENT_MARKER).toBe(Symbol.for('pupt-lib:component:v1'));
  });
});
