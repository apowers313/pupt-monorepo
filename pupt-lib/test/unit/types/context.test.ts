import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_ENVIRONMENT,
  createEnvironment,
  createRuntimeConfig,
  ensureRuntimeCacheReady,
  llmConfigSchema,
  outputConfigSchema,
  codeConfigSchema,
  userConfigSchema,
  environmentContextSchema,
} from '../../../src/types/context';

describe('DEFAULT_ENVIRONMENT', () => {
  it('should have llm config', () => {
    expect(DEFAULT_ENVIRONMENT.llm).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.llm.model).toBe('unspecified');
    expect(DEFAULT_ENVIRONMENT.llm.provider).toBe('unspecified');
  });

  it('should have output config', () => {
    expect(DEFAULT_ENVIRONMENT.output).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.output.format).toBe('unspecified');
    expect(DEFAULT_ENVIRONMENT.output.trim).toBe(true);
    expect(DEFAULT_ENVIRONMENT.output.indent).toBe('  ');
  });

  it('should have code config', () => {
    expect(DEFAULT_ENVIRONMENT.code).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.code.language).toBe('unspecified');
  });

  it('should have user config', () => {
    expect(DEFAULT_ENVIRONMENT.user).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.user.editor).toBe('unknown');
  });

  it('should have runtime config', () => {
    expect(DEFAULT_ENVIRONMENT.runtime).toBeDefined();
  });
});

describe('createEnvironment()', () => {
  it('should return default environment when no overrides', () => {
    const env = createEnvironment();
    expect(env).toEqual(DEFAULT_ENVIRONMENT);
  });

  it('should override llm config', () => {
    const env = createEnvironment({
      llm: { model: 'gpt-4', provider: 'openai' },
    });
    expect(env.llm.model).toBe('gpt-4');
    expect(env.llm.provider).toBe('openai');
    expect(env.output).toEqual(DEFAULT_ENVIRONMENT.output);
  });

  it('should override output config', () => {
    const env = createEnvironment({
      output: { format: 'markdown', trim: false, indent: '    ' },
    });
    expect(env.output.format).toBe('markdown');
    expect(env.output.trim).toBe(false);
    expect(env.output.indent).toBe('    ');
  });

  it('should preserve unmodified defaults', () => {
    const env = createEnvironment({
      code: { language: 'python' },
    });
    expect(env.code.language).toBe('python');
    expect(env.llm).toEqual(DEFAULT_ENVIRONMENT.llm);
  });
});

describe('createRuntimeConfig()', () => {
  it('should return RuntimeConfig object', () => {
    const config = createRuntimeConfig();

    expect(config).toHaveProperty('hostname');
    expect(config).toHaveProperty('username');
    expect(config).toHaveProperty('cwd');
    expect(config).toHaveProperty('platform');
    expect(config).toHaveProperty('os');
    expect(config).toHaveProperty('locale');
    expect(config).toHaveProperty('timestamp');
    expect(config).toHaveProperty('date');
    expect(config).toHaveProperty('time');
    expect(config).toHaveProperty('uuid');
  });

  it('should have valid timestamp', () => {
    const before = Date.now();
    const config = createRuntimeConfig();
    const after = Date.now();

    expect(config.timestamp).toBeGreaterThanOrEqual(before);
    expect(config.timestamp).toBeLessThanOrEqual(after);
  });

  it('should have valid date format (YYYY-MM-DD)', () => {
    const config = createRuntimeConfig();
    expect(config.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should have valid time format (HH:MM:SS)', () => {
    const config = createRuntimeConfig();
    expect(config.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('should have valid UUID format', () => {
    const config = createRuntimeConfig();
    expect(config.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should generate unique UUIDs', () => {
    const config1 = createRuntimeConfig();
    const config2 = createRuntimeConfig();

    expect(config1.uuid).not.toBe(config2.uuid);
  });

  it('should have string hostname', () => {
    const config = createRuntimeConfig();
    expect(typeof config.hostname).toBe('string');
    expect(config.hostname.length).toBeGreaterThan(0);
  });

  it('should have string username', () => {
    const config = createRuntimeConfig();
    expect(typeof config.username).toBe('string');
  });

  it('should have string cwd', () => {
    const config = createRuntimeConfig();
    expect(typeof config.cwd).toBe('string');
    expect(config.cwd.length).toBeGreaterThan(0);
  });

  it('should detect platform as node in test environment', () => {
    const config = createRuntimeConfig();
    expect(config.platform).toBe('node');
  });

  it('should detect os', () => {
    const config = createRuntimeConfig();
    expect(typeof config.os).toBe('string');
    expect(config.os.length).toBeGreaterThan(0);
    expect(config.os).not.toBe('unknown');
  });

  it('should detect locale', () => {
    const config = createRuntimeConfig();
    expect(typeof config.locale).toBe('string');
    expect(config.locale.length).toBeGreaterThan(0);
    // Should be a valid locale like "en-US", "en", "ja", etc. or "unknown"
    expect(config.locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$|^unknown$/);
  });
});

describe('Zod Schema Validation', () => {
  describe('llmConfigSchema', () => {
    it('should accept valid llm config', () => {
      const result = llmConfigSchema.parse({
        model: 'gpt-4',
        provider: 'openai',
      });
      expect(result.model).toBe('gpt-4');
      expect(result.provider).toBe('openai');
    });

    it('should apply defaults for missing fields', () => {
      const result = llmConfigSchema.parse({});
      expect(result.model).toBe('unspecified');
      expect(result.provider).toBe('unspecified');
    });

    it('should accept optional maxTokens and temperature', () => {
      const result = llmConfigSchema.parse({
        model: 'claude-sonnet',
        provider: 'anthropic',
        maxTokens: 4096,
        temperature: 0.7,
      });
      expect(result.maxTokens).toBe(4096);
      expect(result.temperature).toBe(0.7);
    });

    it('should reject invalid temperature (out of range)', () => {
      expect(() => llmConfigSchema.parse({
        model: 'test',
        provider: 'test',
        temperature: 3.0,
      })).toThrow();
    });

    it('should reject negative maxTokens', () => {
      expect(() => llmConfigSchema.parse({
        model: 'test',
        provider: 'test',
        maxTokens: -100,
      })).toThrow();
    });
  });

  describe('outputConfigSchema', () => {
    it('should accept valid output config', () => {
      const result = outputConfigSchema.parse({
        format: 'markdown',
        trim: false,
        indent: '    ',
      });
      expect(result.format).toBe('markdown');
      expect(result.trim).toBe(false);
      expect(result.indent).toBe('    ');
    });

    it('should apply defaults', () => {
      const result = outputConfigSchema.parse({});
      expect(result.format).toBe('unspecified');
      expect(result.trim).toBe(true);
      expect(result.indent).toBe('  ');
    });

    it('should reject invalid format', () => {
      expect(() => outputConfigSchema.parse({
        format: 'invalid-format',
      })).toThrow();
    });
  });

  describe('codeConfigSchema', () => {
    it('should accept valid code config', () => {
      const result = codeConfigSchema.parse({
        language: 'python',
        highlight: true,
      });
      expect(result.language).toBe('python');
      expect(result.highlight).toBe(true);
    });

    it('should apply defaults', () => {
      const result = codeConfigSchema.parse({});
      expect(result.language).toBe('unspecified');
    });
  });

  describe('userConfigSchema', () => {
    it('should accept valid user config', () => {
      const result = userConfigSchema.parse({
        editor: 'vscode',
      });
      expect(result.editor).toBe('vscode');
    });

    it('should apply defaults', () => {
      const result = userConfigSchema.parse({});
      expect(result.editor).toBe('unknown');
    });
  });

  describe('environmentContextSchema', () => {
    it('should accept full valid config', () => {
      const result = environmentContextSchema.parse({
        llm: { model: 'gpt-4o', provider: 'openai' },
        output: { format: 'json', trim: true, indent: '' },
        code: { language: 'typescript' },
        user: { editor: 'cursor' },
        runtime: { platform: 'node', os: 'linux' },
      });
      expect(result.llm.model).toBe('gpt-4o');
      expect(result.output.format).toBe('json');
      expect(result.code.language).toBe('typescript');
      expect(result.user.editor).toBe('cursor');
      expect(result.runtime.platform).toBe('node');
    });

    it('should apply all defaults for empty object', () => {
      const result = environmentContextSchema.parse({});
      expect(result.llm.model).toBe('unspecified');
      expect(result.llm.provider).toBe('unspecified');
      expect(result.output.format).toBe('unspecified');
      expect(result.code.language).toBe('unspecified');
      expect(result.user.editor).toBe('unknown');
      expect(result.runtime).toEqual({});
    });

    it('should allow partial overrides', () => {
      const result = environmentContextSchema.parse({
        llm: { model: 'claude-opus-4-5-20251101' },
      });
      expect(result.llm.model).toBe('claude-opus-4-5-20251101');
      expect(result.llm.provider).toBe('unspecified');
      expect(result.output.format).toBe('unspecified');
    });
  });

  describe('createEnvironment() validation', () => {
    it('should validate overrides through zod', () => {
      const env = createEnvironment({
        llm: { model: 'test-model', provider: 'test-provider' },
      });
      expect(env.llm.model).toBe('test-model');
    });

    it('should reject invalid format through validation', () => {
      expect(() => createEnvironment({
        // @ts-expect-error Testing invalid value
        output: { format: 'invalid', trim: true, indent: '' },
      })).toThrow();
    });

    it('should reject invalid temperature through validation', () => {
      expect(() => createEnvironment({
        llm: { model: 'test', provider: 'test', temperature: 5.0 },
      })).toThrow();
    });
  });
});

describe('ensureRuntimeCacheReady()', () => {
  it('should resolve without error', async () => {
    await expect(ensureRuntimeCacheReady()).resolves.toBeUndefined();
  });

  it('should populate runtime values after awaiting', async () => {
    await ensureRuntimeCacheReady();
    const config = createRuntimeConfig();

    // After cache is ready, we should have actual system values, not defaults
    // In Node.js environment, hostname should not be 'unknown' or 'browser'
    expect(config.hostname).not.toBe('browser');
    expect(config.platform).toBe('node');
    expect(config.os).not.toBe('unknown');
  });

  it('should be idempotent (safe to call multiple times)', async () => {
    await ensureRuntimeCacheReady();
    await ensureRuntimeCacheReady();
    await ensureRuntimeCacheReady();

    const config = createRuntimeConfig();
    expect(config.platform).toBe('node');
  });
});

describe('Browser compatibility (regression tests)', () => {
  it('should not use require() for Node.js modules in context.ts', () => {
    // This test ensures we don't regress to using require('os') which breaks browser bundles
    const contextSource = readFileSync(
      join(__dirname, '../../../src/types/context.ts'),
      'utf-8',
    );

    // Check for require('os'), require("os"), require('crypto'), etc.
    const requirePattern = /require\s*\(\s*['"](?:os|crypto|fs|path)['"]\s*\)/;
    expect(contextSource).not.toMatch(requirePattern);
  });

  it('should use dynamic import() for Node.js modules', () => {
    const contextSource = readFileSync(
      join(__dirname, '../../../src/types/context.ts'),
      'utf-8',
    );

    // Should use dynamic import for os module (may have comments like /* webpackIgnore: true */)
    expect(contextSource).toMatch(/await\s+import\s*\([^)]*['"]os['"]\s*\)/);
  });
});
