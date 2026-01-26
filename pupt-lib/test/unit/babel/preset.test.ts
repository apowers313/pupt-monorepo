import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import { puptBabelPreset } from '../../../src/babel/preset';

describe('puptBabelPreset', () => {
  it('should transform JSX to jsx() calls', () => {
    const code = 'const el = <div>Hello</div>;';

    const result = babel.transformSync(code, {
      presets: [puptBabelPreset],
      filename: 'test.tsx',
    });

    expect(result?.code).toContain('jsx(');
    expect(result?.code).toContain('"div"');
    expect(result?.code).toContain('"Hello"');
  });

  it('should use pupt-lib jsx-runtime', () => {
    const code = 'const el = <Prompt name="test">Content</Prompt>;';

    const result = babel.transformSync(code, {
      presets: [puptBabelPreset],
      filename: 'test.tsx',
    });

    expect(result?.code).toContain('pupt-lib/jsx-runtime');
  });

  it('should handle TypeScript', () => {
    const code = `
      interface Props { name: string }
      const el = <div>{(x: Props) => x.name}</div>;
    `;

    const result = babel.transformSync(code, {
      presets: [[puptBabelPreset, { typescript: true }]],
      filename: 'test.tsx',
    });

    expect(result?.code).not.toContain('interface');
    expect(result?.code).toContain('jsx(');
  });

  it('should handle JSX fragments', () => {
    const code = 'const el = <><div>A</div><div>B</div></>;';

    const result = babel.transformSync(code, {
      presets: [puptBabelPreset],
      filename: 'test.tsx',
    });

    expect(result?.code).toContain('jsxs(');
    expect(result?.code).toContain('Fragment');
  });

  it('should handle JSX with props', () => {
    const code = 'const el = <Section title="Test" priority={1}>Content</Section>;';

    const result = babel.transformSync(code, {
      presets: [puptBabelPreset],
      filename: 'test.tsx',
    });

    expect(result?.code).toContain('jsx(');
    expect(result?.code).toContain('Section');
    expect(result?.code).toContain('title');
    expect(result?.code).toContain('"Test"');
    expect(result?.code).toContain('priority');
  });

  it('should handle nested JSX elements', () => {
    const code = `
      const el = (
        <Prompt name="test">
          <Role>Assistant</Role>
          <Task>Help user</Task>
        </Prompt>
      );
    `;

    const result = babel.transformSync(code, {
      presets: [puptBabelPreset],
      filename: 'test.tsx',
    });

    expect(result?.code).toContain('Prompt');
    expect(result?.code).toContain('Role');
    expect(result?.code).toContain('Task');
  });

  it('should handle TypeScript type annotations', () => {
    const code = `
      type MyType = { name: string };
      const fn = (x: MyType): string => x.name;
      const el = <div>{fn({ name: "test" })}</div>;
    `;

    const result = babel.transformSync(code, {
      presets: [[puptBabelPreset, { typescript: true }]],
      filename: 'test.tsx',
    });

    expect(result?.code).not.toContain(': MyType');
    expect(result?.code).not.toContain(': string');
    expect(result?.code).toContain('jsx(');
  });
});
