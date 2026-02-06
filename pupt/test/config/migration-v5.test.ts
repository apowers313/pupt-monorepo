import { describe, it, expect } from 'vitest';
import { migrateConfig, migrations } from '../../src/config/migration.js';

describe('Config Migration v4 → v5', () => {
  it('should migrate v4 config to v5', () => {
    const v4Config = {
      version: '4.0.0',
      promptDirs: ['./prompts'],
      outputCapture: { enabled: false },
    };
    const migrated = migrateConfig(v4Config);
    expect(migrated.version).toBe('6.0.0');
  });

  it('should preserve existing fields during migration', () => {
    const v4Config = {
      version: '4.0.0',
      promptDirs: ['./prompts', '~/my-prompts'],
      historyDir: '~/.pt-history',
      defaultCmd: 'claude',
      defaultCmdArgs: ['--print'],
      outputCapture: { enabled: true },
    };
    const migrated = migrateConfig(v4Config);
    expect(migrated.promptDirs).toEqual(['./prompts', '~/my-prompts']);
    expect(migrated.historyDir).toBe('~/.pt-history');
    expect(migrated.defaultCmd).toBe('claude');
    expect(migrated.defaultCmdArgs).toEqual(['--print']);
  });

  it('should add empty libraries array as default', () => {
    const migrated = migrateConfig({
      version: '4.0.0',
      promptDirs: ['./prompts'],
      outputCapture: { enabled: false },
    });
    expect(migrated.libraries).toEqual([]);
  });

  it('should preserve existing libraries if already set', () => {
    const migrated = migrateConfig({
      version: '4.0.0',
      promptDirs: ['./prompts'],
      libraries: ['@company/prompts'],
      outputCapture: { enabled: false },
    });
    expect(migrated.libraries).toEqual(['@company/prompts']);
  });

  it('should migrate targetLlm to environment.llm.provider', () => {
    const migrated = migrateConfig({
      version: '4.0.0',
      promptDirs: ['./prompts'],
      targetLlm: 'gpt-4',
      outputCapture: { enabled: false },
    });
    // targetLlm should be migrated to environment.llm.provider
    expect(migrated.targetLlm).toBeUndefined();
    expect(migrated.environment?.llm?.provider).toBe('gpt-4');
  });

  it('should detect v4 config needs migration', () => {
    expect(migrateConfig.needsMigration({
      version: '4.0.0',
      promptDirs: ['./prompts'],
    })).toBe(true);
  });

  it('should detect config without version needs migration', () => {
    expect(migrateConfig.needsMigration({
      promptDirs: ['./prompts'],
    })).toBe(true);
  });

  it('should migrate v5 config to v6', () => {
    // v5 configs need to be migrated to v6
    expect(migrateConfig.needsMigration({
      version: '5.0.0',
      promptDirs: ['./prompts'],
    })).toBe(true);
  });

  it('should not migrate v6 config', () => {
    expect(migrateConfig.needsMigration({
      version: '6.0.0',
      promptDirs: ['./prompts'],
    })).toBe(false);
  });

  it('should migrate from v3 through v4 to v5', () => {
    const v3Config = {
      version: '3.0.0',
      promptDirs: ['./prompts'],
      autoReview: true,
      autoRun: false,
    };
    const migrated = migrateConfig(v3Config);
    expect(migrated.version).toBe('6.0.0');
    expect(migrated.outputCapture).toBeDefined();
    expect(migrated.autoAnnotate).toBeUndefined();
    expect(migrated.libraries).toEqual([]);
  });

  it('should have v5 migration in migrations array', () => {
    const v5Migration = migrations.find(m => m.version === '5.0.0');
    expect(v5Migration).toBeDefined();
  });
});
