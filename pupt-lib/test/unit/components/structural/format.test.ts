import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Format } from '../../../../src/components/structural/Format';

describe('Format', () => {
  it('should render json format', async () => {
    const element = jsx(Format, { type: 'json' });
    const result = await render(element);
    expect(result.text).toContain('Output format: json');
  });

  it('should render markdown format', async () => {
    const element = jsx(Format, { type: 'markdown' });
    const result = await render(element);
    expect(result.text).toContain('Output format: markdown');
  });

  it('should render xml format', async () => {
    const element = jsx(Format, { type: 'xml' });
    const result = await render(element);
    expect(result.text).toContain('Output format: xml');
  });

  it('should render text format', async () => {
    const element = jsx(Format, { type: 'text' });
    const result = await render(element);
    expect(result.text).toContain('Output format: text');
  });

  it('should render code format with language', async () => {
    const element = jsx(Format, { type: 'code', language: 'typescript' });
    const result = await render(element);
    expect(result.text).toContain('Output format: code (typescript)');
  });

  it('should render code format without children', async () => {
    const element = jsx(Format, { type: 'code' });
    const result = await render(element);
    expect(result.text).toBe('Output format: code');
    expect(result.text).not.toContain('\n');
  });

  it('should render with children', async () => {
    const element = jsx(Format, {
      type: 'json',
      children: 'Return a valid JSON object with "name" and "age" fields.',
    });
    const result = await render(element);
    expect(result.text).toContain('Output format: json');
    expect(result.text).toContain('Return a valid JSON object');
  });
});
