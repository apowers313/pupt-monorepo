import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ENVIRONMENT,
  createEnvironment,
  createRuntimeConfig,
} from '../../../src/types/context';

describe('DEFAULT_ENVIRONMENT', () => {
  it('should have llm config', () => {
    expect(DEFAULT_ENVIRONMENT.llm).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.llm.model).toBe('claude-3-sonnet');
    expect(DEFAULT_ENVIRONMENT.llm.provider).toBe('anthropic');
  });

  it('should have output config', () => {
    expect(DEFAULT_ENVIRONMENT.output).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.output.format).toBe('xml');
    expect(DEFAULT_ENVIRONMENT.output.trim).toBe(true);
    expect(DEFAULT_ENVIRONMENT.output.indent).toBe('  ');
  });

  it('should have code config', () => {
    expect(DEFAULT_ENVIRONMENT.code).toBeDefined();
    expect(DEFAULT_ENVIRONMENT.code.language).toBe('typescript');
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
});
