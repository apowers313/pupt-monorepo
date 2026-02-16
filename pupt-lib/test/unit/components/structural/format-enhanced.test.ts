import { describe, expect,it } from 'vitest';

import { Format } from '../../../../components/structural/Format';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Format provider adaptation', () => {
  it('should prefer XML for anthropic when type not specified', async () => {
    const element = jsx(Format, {});
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('xml');
  });

  it('should prefer markdown for openai when type not specified', async () => {
    const element = jsx(Format, {});
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).toContain('markdown');
  });

  it('should use explicit type regardless of provider', async () => {
    const element = jsx(Format, { type: 'json' });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('json');
  });

  it('should render schema when provided', async () => {
    const element = jsx(Format, {
      type: 'json',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
    });
    const result = await render(element);
    expect(result.text).toContain('Schema:');
    expect(result.text).toContain('"name"');
  });

  it('should render template when provided', async () => {
    const element = jsx(Format, {
      type: 'markdown',
      template: '## Summary\n[Brief summary]',
    });
    const result = await render(element);
    expect(result.text).toContain('Follow this structure');
    expect(result.text).toContain('Summary');
  });

  it('should render example when provided', async () => {
    const element = jsx(Format, {
      type: 'json',
      example: '{ "name": "test" }',
    });
    const result = await render(element);
    expect(result.text).toContain('Example output');
    expect(result.text).toContain('"name"');
  });

  it('should render strict mode instruction', async () => {
    const element = jsx(Format, { type: 'json', strict: true });
    const result = await render(element);
    expect(result.text).toContain('ONLY the formatted output');
  });

  it('should render validate instruction', async () => {
    const element = jsx(Format, { type: 'json', validate: true });
    const result = await render(element);
    expect(result.text).toContain('Validate');
  });

  it('should render length constraints', async () => {
    const element = jsx(Format, { type: 'text', maxLength: 500, minLength: 100 });
    const result = await render(element);
    expect(result.text).toContain('Maximum length: 500');
    expect(result.text).toContain('Minimum length: 100');
  });

  it('should render language for code type', async () => {
    const element = jsx(Format, { type: 'code', language: 'typescript' });
    const result = await render(element);
    expect(result.text).toContain('code (typescript)');
  });
});
