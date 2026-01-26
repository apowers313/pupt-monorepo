import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Format } from '../../../../src/components/structural/Format';

describe('Format', () => {
  it('should render json format', () => {
    const element = jsx(Format, { type: 'json' });
    const result = render(element);
    expect(result.text).toContain('Output format: json');
  });

  it('should render markdown format', () => {
    const element = jsx(Format, { type: 'markdown' });
    const result = render(element);
    expect(result.text).toContain('Output format: markdown');
  });

  it('should render xml format', () => {
    const element = jsx(Format, { type: 'xml' });
    const result = render(element);
    expect(result.text).toContain('Output format: xml');
  });

  it('should render text format', () => {
    const element = jsx(Format, { type: 'text' });
    const result = render(element);
    expect(result.text).toContain('Output format: text');
  });

  it('should render code format with language', () => {
    const element = jsx(Format, { type: 'code', language: 'typescript' });
    const result = render(element);
    expect(result.text).toContain('Output format: code (typescript)');
  });

  it('should render code format without children', () => {
    const element = jsx(Format, { type: 'code' });
    const result = render(element);
    expect(result.text).toBe('Output format: code');
    expect(result.text).not.toContain('\n');
  });

  it('should render with children', () => {
    const element = jsx(Format, {
      type: 'json',
      children: 'Return a valid JSON object with "name" and "age" fields.',
    });
    const result = render(element);
    expect(result.text).toContain('Output format: json');
    expect(result.text).toContain('Return a valid JSON object');
  });
});
