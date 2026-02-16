import { describe, expect,it } from 'vitest';

import { Format } from '../../../../components/structural/Format';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Format', () => {
  it('should render json format with XML tags', async () => {
    const element = jsx(Format, { type: 'json' });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: json');
    expect(result.text).toContain('</format>');
  });

  it('should render markdown format with XML tags', async () => {
    const element = jsx(Format, { type: 'markdown' });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: markdown');
  });

  it('should render xml format with XML tags', async () => {
    const element = jsx(Format, { type: 'xml' });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: xml');
  });

  it('should render text format with XML tags', async () => {
    const element = jsx(Format, { type: 'text' });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: text');
  });

  it('should render code format with language', async () => {
    const element = jsx(Format, { type: 'code', language: 'typescript' });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: code (typescript)');
  });

  it('should render code format without children', async () => {
    const element = jsx(Format, { type: 'code' });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: code');
    expect(result.text).toContain('</format>');
  });

  it('should render with children', async () => {
    const element = jsx(Format, {
      type: 'json',
      children: 'Return a valid JSON object with "name" and "age" fields.',
    });
    const result = await render(element);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Output format: json');
    expect(result.text).toContain('Return a valid JSON object');
  });

  it('should render without type when type is not specified', async () => {
    const element = jsx(Format, {
      children: 'Custom format description',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('<format>');
    expect(result.text).toContain('Custom format description');
    expect(result.text).not.toContain('Output format:');
  });

  it('should render with markdown delimiter', async () => {
    const element = jsx(Format, {
      type: 'json',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## format');
    expect(result.text).toContain('Output format: json');
    expect(result.text).not.toContain('<format>');
  });

  it('should render without wrapper when delimiter is none', async () => {
    const element = jsx(Format, {
      type: 'json',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).toBe('Output format: json');
    expect(result.text).not.toContain('<format>');
  });
});
