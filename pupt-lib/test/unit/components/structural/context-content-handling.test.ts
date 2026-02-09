import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Context } from '../../../../components/structural/Context';

describe('Context content handling props', () => {
  it('should include preserveFormatting hint when true', async () => {
    const element = jsx(Context, {
      preserveFormatting: true,
      children: '  indented\n    content',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('indented');
    expect(result.text).toContain('preserve formatting');
  });

  it('should not include preserveFormatting hint when false or absent', async () => {
    const element = jsx(Context, {
      children: '  indented\n    content',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('indented');
    expect(result.text).not.toContain('preserve formatting');
  });

  it('should include maxTokens hint when provided', async () => {
    const element = jsx(Context, {
      maxTokens: 2000,
      label: 'Long Document',
      children: 'Some long content...',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Long Document');
    expect(result.text).toContain('2000');
  });

  it('should not include maxTokens hint when not provided', async () => {
    const element = jsx(Context, {
      label: 'Short Document',
      children: 'Short content',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('token');
  });

  it('should include truncation indicator when truncate=true', async () => {
    const element = jsx(Context, {
      truncate: true,
      children: 'Content that may be truncated',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('may be truncated');
  });

  it('should not include truncation indicator when truncate is absent', async () => {
    const element = jsx(Context, {
      children: 'Regular content',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Should not have the truncation indicator text beyond the content itself
    const text = result.text;
    expect(text).toContain('Regular content');
    // Count occurrences - only the content itself, no extra truncation indicator
    expect(text).not.toContain('[may be truncated]');
  });

  it('should combine all new props together', async () => {
    const element = jsx(Context, {
      truncate: true,
      maxTokens: 1000,
      preserveFormatting: true,
      label: 'Combined Test',
      children: 'Test content',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Combined Test');
    expect(result.text).toContain('Test content');
    expect(result.text).toContain('1000');
    expect(result.text).toContain('may be truncated');
    expect(result.text).toContain('preserve formatting');
  });

  it('should preserve existing props (label, source, relevance)', async () => {
    const element = jsx(Context, {
      label: 'My Label',
      source: 'Wikipedia',
      relevance: 'background info',
      truncate: true,
      children: 'Some content',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('My Label');
    expect(result.text).toContain('Wikipedia');
    expect(result.text).toContain('background info');
    expect(result.text).toContain('may be truncated');
  });
});
