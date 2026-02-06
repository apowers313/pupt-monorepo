import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../../src/schemas/config-schema.js';

describe('Config Schema v5', () => {
  it('should accept config with libraries array', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: ['@company/prompts'],
    };
    expect(() => ConfigSchema.parse(config)).not.toThrow();
  });

  it('should accept config with targetLlm string', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'claude',
    };
    expect(() => ConfigSchema.parse(config)).not.toThrow();
  });

  it('should accept config with both libraries and targetLlm', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: ['@company/prompts', '@team/shared-prompts'],
      targetLlm: 'gpt-4',
    };
    const result = ConfigSchema.parse(config);
    expect(result.libraries).toEqual(['@company/prompts', '@team/shared-prompts']);
    expect(result.targetLlm).toBe('gpt-4');
  });

  it('should accept config without new fields (backward compat)', () => {
    const config = {
      version: '4.0.0',
      promptDirs: ['./prompts'],
    };
    expect(() => ConfigSchema.parse(config)).not.toThrow();
  });

  it('should accept empty libraries array', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: [],
    };
    const result = ConfigSchema.parse(config);
    expect(result.libraries).toEqual([]);
  });

  it('should reject libraries with non-string values', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: [123],
    };
    expect(() => ConfigSchema.parse(config)).toThrow();
  });
});
