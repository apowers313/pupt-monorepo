import fs from 'fs-extra';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigSchema } from '../../src/schemas/config-schema.js';

const mockDataDir = '/mock/data';
vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => '/mock/config',
  getDataDir: () => mockDataDir,
  getCacheDir: () => '/mock/cache',
  getConfigPath: () => '/mock/config/config.json',
}));

// Import after mock setup
const { migrateConfig, migrations } = await import('../../src/config/migration.js');

describe('Config Migration', () => {
  const tempDir = path.join(process.cwd(), '.test-temp-migration');
  const configPath = path.join(tempDir, '.pt-config.json');

  beforeEach(async () => {
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('migrateConfig', () => {
    it('should migrate v1 config with codingTool fields', () => {
      const v1Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.history',
        codingTool: 'mycli',
        codingToolArgs: ['--flag'],
        codingToolOptions: {
          'Some option': '--opt'
        }
      };

      const migrated = migrateConfig(v1Config);

      expect(migrated.defaultCmd).toBe('mycli');
      expect(migrated.defaultCmdArgs).toEqual(['--flag']);
      expect(migrated.defaultCmdOptions).toEqual({ 'Some option': '--opt' });
      expect(migrated.version).toBe('8.0.0');
      expect('codingTool' in migrated).toBe(false);
      expect('codingToolArgs' in migrated).toBe(false);
      expect('codingToolOptions' in migrated).toBe(false);
    });

    it('should add default values for new fields', () => {
      const oldConfig = {
        promptDirs: ['./.prompts']
      };

      const migrated = migrateConfig(oldConfig);

      expect(migrated.version).toBe('8.0.0');
      expect(migrated.autoReview).toBe(true);
      expect(migrated.autoRun).toBe(false);
      // gitPromptDir is removed in v8 migration
      expect('gitPromptDir' in migrated).toBe(false);
      expect(migrated.defaultCmd).toBe('claude');
      expect(migrated.defaultCmdArgs).toEqual([]);
      expect(migrated.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
    });

    it('should preserve existing values when migrating', () => {
      const config = {
        promptDirs: ['./custom-prompts', './more-prompts'],
        historyDir: './custom-history',
        annotationDir: './custom-annotations',
        autoReview: false,
        autoRun: true
      };

      const migrated = migrateConfig(config);

      expect(migrated.promptDirs).toEqual(['./custom-prompts', './more-prompts']);
      expect(migrated.historyDir).toBe('./custom-history');
      expect(migrated.annotationDir).toBe('./custom-annotations');
      expect(migrated.autoReview).toBe(false);
      expect(migrated.autoRun).toBe(true);
    });

    it('should ensure promptDirs exists even if missing', () => {
      const config = {};

      const migrated = migrateConfig(config);

      // v8 migration replaces default './.prompts' with global data dir path
      expect(migrated.promptDirs).toEqual([path.join(mockDataDir, 'prompts')]);
    });

    it('should validate migrated config with Zod schema', () => {
      const v1Config = {
        promptDirs: ['./.prompts'],
        codingTool: 'code',
        codingToolArgs: ['--wait']
      };

      const migrated = migrateConfig(v1Config);
      const result = ConfigSchema.safeParse(migrated);

      expect(result.success).toBe(true);
    });
  });

  describe('needsMigration', () => {
    it('should return true for configs with old field names', () => {
      expect(migrateConfig.needsMigration({ codingTool: 'cli' })).toBe(true);
      expect(migrateConfig.needsMigration({ codingToolArgs: [] })).toBe(true);
      expect(migrateConfig.needsMigration({ codingToolOptions: {} })).toBe(true);
    });

    it('should return true for configs without version', () => {
      expect(migrateConfig.needsMigration({ promptDirs: ['./.prompts'] })).toBe(true);
    });

    it('should return true for configs with old version', () => {
      expect(migrateConfig.needsMigration({ version: '2.0.0' })).toBe(true);
      expect(migrateConfig.needsMigration({ version: '1.0.0' })).toBe(true);
    });

    it('should return false for up-to-date configs', () => {
      const config = {
        version: '8.0.0',
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude',
        outputCapture: {
          enabled: true
        }
      };

      expect(migrateConfig.needsMigration(config)).toBe(false);
    });
  });

  describe('createBackup', () => {
    it('should create a backup file', async () => {
      const config = { promptDirs: ['./.prompts'], version: '2.0.0' };
      await fs.writeJson(configPath, config);

      await migrateConfig.createBackup(configPath);

      const backupPath = `${configPath  }.backup`;
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      const backup = await fs.readJson(backupPath);
      expect(backup).toEqual(config);
    });

    it('should create timestamped backup if backup already exists', async () => {
      const config1 = { promptDirs: ['./.prompts'], version: '1.0.0' };
      const config2 = { promptDirs: ['./.prompts'], version: '2.0.0' };
      
      // Create original and first backup
      await fs.writeJson(configPath, config1);
      await migrateConfig.createBackup(configPath);
      
      // Update config and create second backup
      await fs.writeJson(configPath, config2);
      await migrateConfig.createBackup(configPath);

      // Check that both backups exist
      const backupPath = `${configPath  }.backup`;
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      const files = await fs.readdir(tempDir);
      const timestampedBackups = files.filter(f => f.startsWith('.pt-config.json.backup.'));
      expect(timestampedBackups.length).toBe(1);
      
      // Verify content
      const firstBackup = await fs.readJson(backupPath);
      expect(firstBackup).toEqual(config1);
      
      const timestampedBackup = await fs.readJson(path.join(tempDir, timestampedBackups[0]));
      expect(timestampedBackup).toEqual(config2);
    });
  });

  describe('migration versioning', () => {
    it('should have at least one migration', () => {
      expect(migrations.length).toBeGreaterThan(0);
    });

    it('should apply the latest migration', () => {
      const config = { promptDirs: ['./.prompts'] };
      const migrated = migrateConfig(config);
      
      expect(migrated.version).toBe(migrations[migrations.length - 1].version);
    });

    it('should handle all legacy config formats', () => {
      // Test various legacy formats
      const legacyConfigs = [
        // V1 format with single promptDirectory
        {
          promptDirectory: './.prompts',
          historyDirectory: './.history'
        },
        // V1 format with array promptDirectory
        {
          promptDirectory: ['./.prompts', './more-prompts'],
          codingTool: 'vim'
        },
        // V2 format
        {
          promptDirs: ['./.prompts'],
          historyDir: './.history',
          codingTool: 'code',
          autoReview: false
        }
      ];

      legacyConfigs.forEach((legacy, index) => {
        const migrated = migrateConfig(legacy);

        // Should have required fields
        expect(migrated.promptDirs).toBeDefined();
        expect(Array.isArray(migrated.promptDirs)).toBe(true);
        expect(migrated.version).toBe('8.0.0');

        // Should not have legacy fields
        expect('promptDirectory' in migrated).toBe(false);
        expect('historyDirectory' in migrated).toBe(false);
        expect('codingTool' in migrated).toBe(false);

        // Should have new field names
        if ('historyDirectory' in legacy) {
          expect(migrated.historyDir).toBeDefined();
        }
        if ('codingTool' in legacy) {
          expect(migrated.defaultCmd).toBeDefined();
        }
      });
    });
  });

  describe('schema validation', () => {
    it('should migrate v1 config format correctly', () => {
      const v1Config = {
        promptDirectory: './.prompts',
        historyDirectory: './.history',
        codingTool: 'code',
        codingToolArgs: ['--wait']
      };

      const migrated = migrateConfig(v1Config);
      const result = ConfigSchema.safeParse(migrated);
      expect(result.success).toBe(true);
      expect(migrated.promptDirs).toBeDefined();
      expect(migrated.defaultCmd).toBe('code');
    });

    it('should migrate v2 config format correctly', () => {
      const v2Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.history',
        codingTool: 'code',
        autoReview: true,
        version: '2.0.0'
      };

      const migrated = migrateConfig(v2Config);
      const result = ConfigSchema.safeParse(migrated);
      expect(result.success).toBe(true);
      expect(migrated.defaultCmd).toBe('code');
    });

    it('should accept valid v3 configs', () => {
      const v3Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.history',
        defaultCmd: 'claude',
        defaultCmdArgs: [],
        defaultCmdOptions: {},
        autoReview: true,
        autoRun: false,
        gitPromptDir: '.git-prompts',
        version: '3.0.0',
        helpers: {
          myHelper: {
            type: 'inline' as const,
            value: 'return "hello";'
          }
        }
      };

      const result = ConfigSchema.safeParse(v3Config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid configs', () => {
      const invalidConfigs = [
        { promptDirs: [] }, // Empty array
        { promptDirs: ['./.prompts'], version: 'invalid' }, // Invalid version format
        { promptDirs: ['./.prompts'], helpers: { bad: { type: 'unknown' } } }, // Invalid helper type
        { promptDirs: ['./.prompts'], helpers: { bad: { type: 'inline' } } }, // Missing value for inline
        { promptDirs: ['./.prompts'], helpers: { bad: { type: 'file' } } } // Missing path for file
      ];

      invalidConfigs.forEach((config, index) => {
        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });
});