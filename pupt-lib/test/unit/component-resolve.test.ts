import { describe, it, expect } from 'vitest';
import { Component } from '../../src/component';

describe('Component with resolve()', () => {
  it('should allow components with only resolve()', () => {
    class StringComponent extends Component<{ value: string }, string> {
      resolve(props: { value: string }) {
        return props.value.toUpperCase();
      }
    }
    const instance = new StringComponent();
    expect(instance.resolve!({ value: 'hello' }, {} as never)).toBe('HELLO');
  });

  it('should allow components with resolve() that returns complex types', () => {
    class DataComponent extends Component<{ id: number }, { name: string }> {
      resolve(props: { id: number }) {
        return { name: `User ${props.id}` };
      }
    }
    const instance = new DataComponent();
    const resolved = instance.resolve!({ id: 42 }, {} as never);
    expect(resolved).toEqual({ name: 'User 42' });
  });

  it('should allow async resolve()', async () => {
    class AsyncComponent extends Component<Record<string, unknown>, number> {
      async resolve() {
        return Promise.resolve(42);
      }
    }
    const instance = new AsyncComponent();
    expect(await instance.resolve!({}, {} as never)).toBe(42);
  });

  it('should support components with only render() (backward compatibility)', () => {
    class RenderOnlyComponent extends Component<{ name: string }> {
      render(props: { name: string }) {
        return `Hello, ${props.name}!`;
      }
    }
    const instance = new RenderOnlyComponent();
    expect(instance.render!({ name: 'World' }, {} as never)).toBe('Hello, World!');
  });

  it('should support ResolveType defaulting to void', () => {
    // Components without explicit ResolveType should default to void
    class SimpleComponent extends Component<{ text: string }> {
      render(props: { text: string }) {
        return props.text;
      }
    }
    const instance = new SimpleComponent();
    expect(instance.resolve).toBeUndefined();
    expect(instance.render!({ text: 'test' }, {} as never)).toBe('test');
  });

  it('should allow components with both resolve() and render()', () => {
    class DualComponent extends Component<{ id: number }, string> {
      resolve(props: { id: number }) {
        return `resolved-${props.id}`;
      }
      render(props: { id: number }) {
        return `Rendered: ${props.id}`;
      }
    }
    const instance = new DualComponent();
    expect(instance.resolve!({ id: 1 }, {} as never)).toBe('resolved-1');
    expect(instance.render!({ id: 1 }, {} as never)).toBe('Rendered: 1');
  });
});
