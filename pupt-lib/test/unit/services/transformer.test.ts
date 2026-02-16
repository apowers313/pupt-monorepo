import { describe, it, expect } from 'vitest';
import { Transformer } from '../../../src/services/transformer';

describe('Transformer', () => {
  it('should transform source string', async () => {
    const transformer = new Transformer();
    const source = 'const el = <div>Hello</div>;';

    const result = await transformer.transformSourceAsync(source, 'test.tsx');

    expect(result).toContain('jsx(');
  });

  it('should include pupt-lib jsx-runtime import', async () => {
    const transformer = new Transformer();
    const source = 'const el = <div>Hello</div>;';

    const result = await transformer.transformSourceAsync(source, 'test.tsx');

    expect(result).toContain('pupt-lib/jsx-runtime');
  });

  it('should handle TypeScript interfaces', async () => {
    const transformer = new Transformer();
    const source = `
      interface Props { name: string }
      const el = <div>Hello</div>;
    `;

    const result = await transformer.transformSourceAsync(source, 'test.tsx');

    expect(result).not.toContain('interface Props');
    expect(result).toContain('jsx(');
  });

  it('should throw error for invalid JSX', async () => {
    const transformer = new Transformer();
    const source = 'const el = <div>unclosed';

    await expect(transformer.transformSourceAsync(source, 'test.tsx')).rejects.toThrow();
  });

  it('should handle complex nested elements', async () => {
    const transformer = new Transformer();
    const source = `
      const el = (
        <Prompt name="test">
          <Role>Assistant</Role>
          <Task>Help</Task>
        </Prompt>
      );
    `;

    const result = await transformer.transformSourceAsync(source, 'test.tsx');

    expect(result).toContain('Prompt');
    expect(result).toContain('Role');
    expect(result).toContain('Task');
  });
});
