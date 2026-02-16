import { describe, expect, it, vi } from 'vitest';

const mockDataDir = '/mock/data';
vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => '/mock/config',
  getDataDir: () => mockDataDir,
  getCacheDir: () => '/mock/cache',
  getConfigPath: () => '/mock/config/config.json',
}));

// Import after mock setup
const { migrateConfig, migrations } = await import('../../src/config/migration.js');

describe('Config Migration v5 → v6', () => {
  it('should migrate v5 config to v6', () => {
    const v5Config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      libraries: [],
    };
    const migrated = migrateConfig(v5Config);
    expect(migrated.version).toBe('8.0.0');
  });

  it('should migrate targetLlm to environment.llm.provider', () => {
    const v5Config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'anthropic',
      libraries: [],
    };
    const migrated = migrateConfig(v5Config);
    expect(migrated.version).toBe('8.0.0');
    expect(migrated.targetLlm).toBeUndefined();
    expect(migrated.environment?.llm?.provider).toBe('anthropic');
  });

  it('should preserve existing environment config when migrating targetLlm', () => {
    const v5Config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'anthropic',
      environment: {
        llm: { model: 'claude-3-opus' },
        code: { language: 'typescript' },
      },
      libraries: [],
    };
    const migrated = migrateConfig(v5Config);
    expect(migrated.version).toBe('8.0.0');
    expect(migrated.targetLlm).toBeUndefined();
    // provider should come from targetLlm since environment.llm.provider wasn't set
    expect(migrated.environment?.llm?.provider).toBe('anthropic');
    // model should be preserved
    expect(migrated.environment?.llm?.model).toBe('claude-3-opus');
    // code config should be preserved
    expect(migrated.environment?.code?.language).toBe('typescript');
  });

  it('should not overwrite environment.llm.provider if already set', () => {
    const v5Config = {
      version: '5.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'anthropic',
      environment: {
        llm: { provider: 'openai', model: 'gpt-4' },
      },
      libraries: [],
    };
    const migrated = migrateConfig(v5Config);
    expect(migrated.version).toBe('8.0.0');
    expect(migrated.targetLlm).toBeUndefined();
    // provider should not be overwritten since it was already set
    expect(migrated.environment?.llm?.provider).toBe('openai');
    expect(migrated.environment?.llm?.model).toBe('gpt-4');
  });

  it('should detect v5 config needs migration', () => {
    expect(migrateConfig.needsMigration({
      version: '5.0.0',
      promptDirs: ['./prompts'],
    })).toBe(true);
  });

  it('should detect targetLlm config needs migration', () => {
    expect(migrateConfig.needsMigration({
      version: '5.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'anthropic',
    })).toBe(true);
  });

  it('should detect v7 config needs migration to v8', () => {
    expect(migrateConfig.needsMigration({
      version: '7.0.0',
      promptDirs: ['./prompts'],
    })).toBe(true);
  });

  it('should not migrate v8 config', () => {
    expect(migrateConfig.needsMigration({
      version: '8.0.0',
      promptDirs: ['./prompts'],
    })).toBe(false);
  });

  it('should have v6 migration in migrations array', () => {
    const v6Migration = migrations.find(m => m.version === '6.0.0');
    expect(v6Migration).toBeDefined();
  });

  it('should preserve all existing config fields during migration', () => {
    const v5Config = {
      version: '5.0.0',
      promptDirs: ['./prompts', '~/my-prompts'],
      historyDir: '~/.pt-history',
      defaultCmd: 'claude',
      defaultCmdArgs: ['--print'],
      autoReview: true,
      autoRun: false,
      outputCapture: { enabled: false },
      libraries: ['@company/prompts'],
    };
    const migrated = migrateConfig(v5Config);
    // Custom multi-element promptDirs are preserved (not replaced with global default)
    expect(migrated.promptDirs).toEqual(['./prompts', '~/my-prompts']);
    expect(migrated.historyDir).toBe('~/.pt-history');
    expect(migrated.defaultCmd).toBe('claude');
    expect(migrated.defaultCmdArgs).toEqual(['--print']);
    expect(migrated.autoReview).toBe(true);
    expect(migrated.autoRun).toBe(false);
    // v8 migration sets outputCapture.enabled to true
    expect(migrated.outputCapture?.enabled).toBe(true);
    // v8 migration converts old string[] libraries to empty LibraryEntry[]
    expect(migrated.libraries).toEqual([]);
  });
});
