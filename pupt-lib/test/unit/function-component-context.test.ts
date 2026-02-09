import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import type { RenderContext } from '../../src/types';

describe('function component context access', () => {
  it('should pass RenderContext as second argument to function components', async () => {
    function MyComponent(_props: Record<string, unknown>, context: RenderContext) {
      return `provider: ${context.env.llm.provider}`;
    }
    const result = await render(jsx(MyComponent, {}), {
      env: { llm: { provider: 'anthropic' } },
    });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('provider: anthropic');
  });

  it('should still work with function components that only take props', async () => {
    function LegacyComponent(props: { greeting: string }) {
      return props.greeting;
    }
    const result = await render(jsx(LegacyComponent, { greeting: 'hello' }));
    expect(result.ok).toBe(true);
    expect(result.text).toContain('hello');
  });

  it('should allow function components to access metadata', async () => {
    function MetadataComponent(_props: Record<string, unknown>, context: RenderContext) {
      context.metadata.set('fn-key', 'fn-value');
      return `set: ${context.metadata.get('fn-key')}`;
    }
    const result = await render(jsx(MetadataComponent, {}));
    expect(result.ok).toBe(true);
    expect(result.text).toBe('set: fn-value');
  });

  it('should allow function components to access inputs', async () => {
    function InputComponent(_props: Record<string, unknown>, context: RenderContext) {
      return `input: ${context.inputs.get('name')}`;
    }
    const result = await render(jsx(InputComponent, {}), {
      inputs: new Map([['name', 'Alice']]),
    });
    expect(result.ok).toBe(true);
    expect(result.text).toBe('input: Alice');
  });
});
