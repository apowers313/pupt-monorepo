import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Code, Data, Json } from '../../../../components/data';

describe('Code', () => {
  it('should render code block with language', async () => {
    const element = jsx(Code, {
      language: 'typescript',
      children: 'const x = 1;',
    });

    const result = await render(element);
    expect(result.text).toContain('```typescript');
    expect(result.text).toContain('const x = 1;');
    expect(result.text).toContain('```');
  });

  it('should include filename if provided', async () => {
    const element = jsx(Code, {
      language: 'typescript',
      filename: 'example.ts',
      children: 'const x = 1;',
    });

    const result = await render(element);
    expect(result.text).toContain('example.ts');
  });
});

describe('Data', () => {
  it('should render data with format', async () => {
    const element = jsx(Data, {
      name: 'users',
      format: 'json',
      children: JSON.stringify([{ name: 'Alice' }]),
    });

    const result = await render(element);
    expect(result.text).toContain('users');
    expect(result.text).toContain('Alice');
  });
});

describe('Json', () => {
  it('should format JSON data', async () => {
    const element = jsx(Json, {
      children: { key: 'value' },
    });

    const result = await render(element);
    expect(result.text).toContain('"key"');
    expect(result.text).toContain('"value"');
  });
});
