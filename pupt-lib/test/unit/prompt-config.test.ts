import { describe, it, expect } from 'vitest';
import { promptConfigSchema } from '../../src/types/context';

describe('promptConfigSchema', () => {
  it('should parse with all defaults', () => {
    const config = promptConfigSchema.parse({});
    expect(config.includeRole).toBe(true);
    expect(config.includeFormat).toBe(true);
    expect(config.includeConstraints).toBe(true);
    expect(config.includeSuccessCriteria).toBe(false);
  });

  it('should allow overriding individual flags', () => {
    const config = promptConfigSchema.parse({ includeRole: false });
    expect(config.includeRole).toBe(false);
    expect(config.includeFormat).toBe(true);
  });

  it('should have default role and expertise defaults', () => {
    const config = promptConfigSchema.parse({});
    expect(config.defaultRole).toBe('assistant');
    expect(config.defaultExpertise).toBe('general');
  });

  it('should allow overriding default role', () => {
    const config = promptConfigSchema.parse({ defaultRole: 'engineer' });
    expect(config.defaultRole).toBe('engineer');
  });

  it('should have xml as default delimiter', () => {
    const config = promptConfigSchema.parse({});
    expect(config.delimiter).toBe('xml');
  });

  it('should allow setting delimiter to markdown', () => {
    const config = promptConfigSchema.parse({ delimiter: 'markdown' });
    expect(config.delimiter).toBe('markdown');
  });

  it('should allow setting delimiter to none', () => {
    const config = promptConfigSchema.parse({ delimiter: 'none' });
    expect(config.delimiter).toBe('none');
  });

  it('should reject invalid delimiter values', () => {
    expect(() => promptConfigSchema.parse({ delimiter: 'invalid' })).toThrow();
  });

  it('should allow overriding all boolean flags', () => {
    const config = promptConfigSchema.parse({
      includeRole: false,
      includeFormat: false,
      includeConstraints: false,
      includeSuccessCriteria: true,
    });
    expect(config.includeRole).toBe(false);
    expect(config.includeFormat).toBe(false);
    expect(config.includeConstraints).toBe(false);
    expect(config.includeSuccessCriteria).toBe(true);
  });
});
