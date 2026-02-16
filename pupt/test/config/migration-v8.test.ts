import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { migrateConfig, migrations } from '../../src/config/migration.js';

describe('Config Migration v7 → v8', () => {
  const testDataDir = path.join(os.tmpdir(), 'pupt-test-migration-v8');
  let originalPuptDataDir: string | undefined;

  beforeEach(() => {
    originalPuptDataDir = process.env.PUPT_DATA_DIR;
    process.env.PUPT_DATA_DIR = testDataDir;
  });

  afterEach(() => {
    if (originalPuptDataDir === undefined) {
      delete process.env.PUPT_DATA_DIR;
    } else {
      process.env.PUPT_DATA_DIR = originalPuptDataDir;
    }
  });

  it('should have v8 migration at migrations[5]', () => {
    expect(migrations[5]).toBeDefined();
    expect(migrations[5].version).toBe('8.0.0');
  });

  it('should set version to 8.0.0', () => {
    const v7Config = {
      version: '7.0.0',
      promptDirs: ['./.prompts'],
      libraries: [],
    };
    const migrated = migrateConfig(v7Config);
    expect(migrated.version).toBe('8.0.0');
  });

  describe('removing deprecated fields', () => {
    it('should remove gitPromptDir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect((migrated as Record<string, unknown>).gitPromptDir).toBeUndefined();
    });

    it('should remove codingTool', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        codingTool: 'claude',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect((migrated as Record<string, unknown>).codingTool).toBeUndefined();
    });

    it('should remove codingToolArgs', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        codingToolArgs: ['--print'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect((migrated as Record<string, unknown>).codingToolArgs).toBeUndefined();
    });

    it('should remove codingToolOptions', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        codingToolOptions: { 'Continue?': '--continue' },
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect((migrated as Record<string, unknown>).codingToolOptions).toBeUndefined();
    });

    it('should remove targetLlm', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        targetLlm: 'anthropic',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect((migrated as Record<string, unknown>).targetLlm).toBeUndefined();
    });

    it('should remove all deprecated fields at once', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        codingTool: 'claude',
        codingToolArgs: ['--verbose'],
        codingToolOptions: { 'Continue?': '--continue' },
        targetLlm: 'openai',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config) as Record<string, unknown>;
      expect(migrated.gitPromptDir).toBeUndefined();
      expect(migrated.codingTool).toBeUndefined();
      expect(migrated.codingToolArgs).toBeUndefined();
      expect(migrated.codingToolOptions).toBeUndefined();
      expect(migrated.targetLlm).toBeUndefined();
    });
  });

  describe('updating default promptDirs', () => {
    it('should update promptDirs from "./.prompts" to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.promptDirs).toEqual([path.join(testDataDir, 'prompts')]);
    });

    it('should update promptDirs from ".prompts" to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['.prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.promptDirs).toEqual([path.join(testDataDir, 'prompts')]);
    });

    it('should update empty promptDirs to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: [],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.promptDirs).toEqual([path.join(testDataDir, 'prompts')]);
    });

    it('should update undefined promptDirs to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.promptDirs).toEqual([path.join(testDataDir, 'prompts')]);
    });

    it('should preserve custom promptDirs', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/my-prompts', '/opt/shared-prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.promptDirs).toEqual(['~/my-prompts', '/opt/shared-prompts']);
    });
  });

  describe('updating default historyDir', () => {
    it('should update historyDir from "./.pthistory" to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        historyDir: './.pthistory',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.historyDir).toBe(path.join(testDataDir, 'history'));
    });

    it('should update historyDir from ".pthistory" to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        historyDir: '.pthistory',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.historyDir).toBe(path.join(testDataDir, 'history'));
    });

    it('should update undefined historyDir to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.historyDir).toBe(path.join(testDataDir, 'history'));
    });

    it('should preserve custom historyDir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        historyDir: '~/.my-history',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.historyDir).toBe('~/.my-history');
    });
  });

  describe('updating default annotationDir', () => {
    it('should update annotationDir from "./.pthistory" to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        annotationDir: './.pthistory',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.annotationDir).toBe(path.join(testDataDir, 'history'));
    });

    it('should update annotationDir from ".pthistory" to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        annotationDir: '.pthistory',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.annotationDir).toBe(path.join(testDataDir, 'history'));
    });

    it('should update undefined annotationDir to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.annotationDir).toBe(path.join(testDataDir, 'history'));
    });

    it('should preserve custom annotationDir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        annotationDir: '~/my-annotations',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.annotationDir).toBe('~/my-annotations');
    });
  });

  describe('updating outputCapture', () => {
    it('should enable outputCapture and update default directory', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        outputCapture: {
          enabled: false,
          directory: '.pt-output',
          maxSizeMB: 50,
          retentionDays: 30,
        },
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.outputCapture?.enabled).toBe(true);
      expect(migrated.outputCapture?.directory).toBe(path.join(testDataDir, 'output'));
    });

    it('should update "./.pt-output" directory to global data dir', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        outputCapture: {
          enabled: false,
          directory: './.pt-output',
          maxSizeMB: 50,
          retentionDays: 30,
        },
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.outputCapture?.directory).toBe(path.join(testDataDir, 'output'));
    });

    it('should preserve custom outputCapture directory', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        outputCapture: {
          enabled: false,
          directory: '/var/log/pt-output',
          maxSizeMB: 100,
          retentionDays: 60,
        },
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.outputCapture?.enabled).toBe(true);
      expect(migrated.outputCapture?.directory).toBe('/var/log/pt-output');
    });

    it('should create outputCapture with defaults if not present', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.outputCapture).toEqual({
        enabled: true,
        directory: path.join(testDataDir, 'output'),
        maxSizeMB: 50,
        retentionDays: 30,
      });
    });
  });

  describe('converting libraries', () => {
    it('should convert old string[] libraries to empty LibraryEntry[]', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        libraries: ['@company/prompts', 'shared-lib'],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.libraries).toEqual([]);
    });

    it('should preserve empty libraries array', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.libraries).toEqual([]);
    });

    it('should preserve LibraryEntry[] libraries (non-string array)', () => {
      const libraryEntries = [{ name: 'my-lib', path: '/some/path' }];
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        libraries: libraryEntries,
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.libraries).toEqual(libraryEntries);
    });
  });

  describe('preserving user-configured values', () => {
    it('should preserve defaultCmd', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        defaultCmd: 'kiro-cli',
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.defaultCmd).toBe('kiro-cli');
    });

    it('should preserve defaultCmdArgs', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        defaultCmdArgs: ['--print', '--verbose'],
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.defaultCmdArgs).toEqual(['--print', '--verbose']);
    });

    it('should preserve environment config', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        environment: {
          llm: { provider: 'anthropic', model: 'claude-3-opus' },
          code: { language: 'typescript' },
        },
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.environment?.llm?.provider).toBe('anthropic');
      expect(migrated.environment?.llm?.model).toBe('claude-3-opus');
      expect(migrated.environment?.code?.language).toBe('typescript');
    });

    it('should preserve autoReview and autoRun', () => {
      const v7Config = {
        version: '7.0.0',
        promptDirs: ['~/prompts'],
        autoReview: false,
        autoRun: true,
        libraries: [],
      };
      const migrated = migrateConfig(v7Config);
      expect(migrated.autoReview).toBe(false);
      expect(migrated.autoRun).toBe(true);
    });
  });

  describe('needsMigration', () => {
    it('should detect v7 config needs migration', () => {
      expect(migrateConfig.needsMigration({
        version: '7.0.0',
        promptDirs: ['./prompts'],
      })).toBe(true);
    });

    it('should detect config with gitPromptDir needs migration', () => {
      expect(migrateConfig.needsMigration({
        version: '8.0.0',
        gitPromptDir: '.git-prompts',
      })).toBe(true);
    });

    it('should detect config with codingTool needs migration', () => {
      expect(migrateConfig.needsMigration({
        version: '8.0.0',
        codingTool: 'claude',
      })).toBe(true);
    });

    it('should not flag v8 config as needing migration', () => {
      expect(migrateConfig.needsMigration({
        version: '8.0.0',
        promptDirs: ['~/prompts'],
      })).toBe(false);
    });
  });

  describe('direct v8 migration function', () => {
    it('should work when called directly via migrations[5]', () => {
      const v7Config: Record<string, unknown> = {
        version: '7.0.0',
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        libraries: [],
      };
      const migrated = migrations[5].migrate(v7Config);
      expect(migrated.version).toBe('8.0.0');
      expect(migrated.gitPromptDir).toBeUndefined();
      expect(migrated.promptDirs).toEqual([path.join(testDataDir, 'prompts')]);
    });
  });

  describe('full migration from older versions', () => {
    it('should migrate from v5 through v8', () => {
      const v5Config = {
        version: '5.0.0',
        promptDirs: ['./.prompts'],
        libraries: [],
      };
      const migrated = migrateConfig(v5Config);
      expect(migrated.version).toBe('8.0.0');
      expect(migrated.promptDirs).toEqual([path.join(testDataDir, 'prompts')]);
    });

    it('should migrate from v3 through v8', () => {
      const v3Config = {
        version: '3.0.0',
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        codingTool: 'claude',
      };
      const migrated = migrateConfig(v3Config);
      expect(migrated.version).toBe('8.0.0');
      expect((migrated as Record<string, unknown>).gitPromptDir).toBeUndefined();
      expect((migrated as Record<string, unknown>).codingTool).toBeUndefined();
    });
  });
});
