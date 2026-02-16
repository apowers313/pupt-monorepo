import { describe, expect,it } from 'vitest';

import { ConfigFileSchema,ConfigSchema } from '../../src/schemas/config-schema.js';

describe('Config Schema v5', () => {
  it('should accept config with libraries array via ConfigFileSchema (pre-v8 format)', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: ['@company/prompts'],
    };
    // String arrays for libraries are only valid in pre-v8 format (ConfigPreV8Schema),
    // not in the current ConfigSchema which expects LibraryEntry objects
    expect(() => ConfigFileSchema.parse(config)).not.toThrow();
  });

  it('should accept config with targetLlm string', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'claude',
    };
    // targetLlm is accepted by ConfigSchema via .passthrough() and also by ConfigPreV8Schema
    expect(() => ConfigSchema.parse(config)).not.toThrow();
  });

  it('should accept config with both libraries and targetLlm via ConfigFileSchema', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: ['@company/prompts', '@team/shared-prompts'],
      targetLlm: 'gpt-4',
    };
    // ConfigFileSchema is a union - old-format configs with string libraries and targetLlm
    // are valid and should parse without error. The matched union member may strip
    // unrecognized fields, so we just verify the parse succeeds.
    expect(() => ConfigFileSchema.parse(config)).not.toThrow();
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

  it('should reject libraries with non-string and non-object values', () => {
    const config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: [123],
    };
    // Both ConfigSchema (expects LibraryEntry objects) and ConfigFileSchema reject numbers
    expect(() => ConfigSchema.parse(config)).toThrow();
  });

  it('should accept libraries with LibraryEntry objects in ConfigSchema', () => {
    const config = {
      version: '8.0.0',
      promptDirs: ['./prompts'],
      libraries: [
        {
          name: '@company/prompts',
          type: 'git',
          source: 'https://github.com/company/prompts.git',
          promptDirs: ['./prompts'],
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    };
    const result = ConfigSchema.parse(config);
    expect(result.libraries).toHaveLength(1);
    expect(result.libraries![0].name).toBe('@company/prompts');
  });

  it('should reject string libraries in ConfigSchema (v8 format)', () => {
    const config = {
      version: '8.0.0',
      promptDirs: ['./prompts'],
      libraries: ['@company/prompts'],
    };
    // ConfigSchema now requires LibraryEntry objects, not strings
    expect(() => ConfigSchema.parse(config)).toThrow();
  });
});
