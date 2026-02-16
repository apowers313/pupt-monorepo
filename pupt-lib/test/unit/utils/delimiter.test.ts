import { describe, it, expect } from 'vitest';
import { wrapWithDelimiter } from '../../../src/utils/delimiter';

describe('wrapWithDelimiter', () => {
  it('should wrap content with XML tags', () => {
    const result = wrapWithDelimiter('Hello', 'role', 'xml');
    expect(result).toEqual(['<role>\n', 'Hello', '\n</role>\n']);
  });

  it('should wrap content with markdown header', () => {
    const result = wrapWithDelimiter('Hello', 'role', 'markdown');
    expect(result).toEqual(['## role\n\n', 'Hello']);
  });

  it('should return content as-is for none', () => {
    const result = wrapWithDelimiter('Hello', 'role', 'none');
    expect(result).toBe('Hello');
  });

  it('should handle array content', () => {
    const result = wrapWithDelimiter(['line1', 'line2'], 'task', 'xml');
    expect(result).toEqual(['<task>\n', ['line1', 'line2'], '\n</task>\n']);
  });

  it('should handle array content with markdown', () => {
    const result = wrapWithDelimiter(['line1', 'line2'], 'task', 'markdown');
    expect(result).toEqual(['## task\n\n', ['line1', 'line2']]);
  });

  it('should handle array content with none', () => {
    const result = wrapWithDelimiter(['line1', 'line2'], 'task', 'none');
    expect(result).toEqual(['line1', 'line2']);
  });

  it('should use custom tag name for XML', () => {
    const result = wrapWithDelimiter('content', 'success-criteria', 'xml');
    expect(result).toEqual(['<success-criteria>\n', 'content', '\n</success-criteria>\n']);
  });

  it('should use custom tag name for markdown', () => {
    const result = wrapWithDelimiter('content', 'success-criteria', 'markdown');
    expect(result).toEqual(['## success-criteria\n\n', 'content']);
  });
});
