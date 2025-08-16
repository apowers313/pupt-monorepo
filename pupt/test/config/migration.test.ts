import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { migrations, migrateConfig } from '../../src/config/migration';
import type { Config } from '../../src/types/config';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('Config Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Field Name Migration', () => {
    it('should migrate codingTool to defaultCmd', () => {
      const oldConfig = {
        codingTool: 'claude',
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.defaultCmd).toBe('claude');
      expect(migrated.codingTool).toBeUndefined();
    });

    it('should migrate codingToolArgs to defaultCmdArgs', () => {
      const oldConfig = {
        codingToolArgs: ['-p', '{{prompt}}'],
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.defaultCmdArgs).toEqual(['-p', '{{prompt}}']);
      expect(migrated.codingToolArgs).toBeUndefined();
    });

    it('should migrate codingToolOptions to defaultCmdOptions', () => {
      const oldConfig = {
        codingToolOptions: { 'Continue?': '--continue' },
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.defaultCmdOptions).toEqual({ 'Continue?': '--continue' });
      expect(migrated.codingToolOptions).toBeUndefined();
    });

    it('should migrate all fields at once', () => {
      const oldConfig = {
        codingTool: 'claude',
        codingToolArgs: ['-p', '{{prompt}}'],
        codingToolOptions: { 'Continue?': '--continue' },
        promptDirs: ['./prompts'],
        historyDir: '.history'
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.defaultCmd).toBe('claude');
      expect(migrated.defaultCmdArgs).toEqual(['-p', '{{prompt}}']);
      expect(migrated.defaultCmdOptions).toEqual({ 'Continue?': '--continue' });
      expect(migrated.promptDirs).toEqual(['./prompts']);
      expect(migrated.historyDir).toBe('.history');
      expect(migrated.codingTool).toBeUndefined();
      expect(migrated.codingToolArgs).toBeUndefined();
      expect(migrated.codingToolOptions).toBeUndefined();
    });
  });

  describe('New Fields Addition', () => {
    it('should add version field', () => {
      const oldConfig = {
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.version).toBe('3.0.0');
    });

    it('should add autoReview field with default true', () => {
      const oldConfig = {
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.autoReview).toBe(true);
    });

    it('should preserve existing autoReview if set', () => {
      const oldConfig = {
        promptDirs: ['./prompts'],
        autoReview: false
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.autoReview).toBe(false);
    });

    it('should add autoRun field with default false', () => {
      const oldConfig = {
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.autoRun).toBe(false);
    });

    it('should add gitPromptDir field with default .git-prompts', () => {
      const oldConfig = {
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.gitPromptDir).toBe('.git-prompts');
    });

    it('should add handlebarsExtensions field with empty default', () => {
      const oldConfig = {
        promptDirs: ['./prompts']
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.handlebarsExtensions).toEqual([]);
    });
  });

  describe('Backward Compatibility', () => {
    it('should preserve unrelated fields', () => {
      const oldConfig = {
        promptDirs: ['./prompts', './more-prompts'],
        historyDir: '.history',
        annotationDir: '.annotations',
        helpers: { custom: { type: 'inline', value: 'code' } }
      };
      
      const migrated = migrations[0].migrate(oldConfig);
      
      expect(migrated.promptDirs).toEqual(['./prompts', './more-prompts']);
      expect(migrated.historyDir).toBe('.history');
      expect(migrated.annotationDir).toBe('.annotations');
      expect(migrated.helpers).toEqual({ custom: { type: 'inline', value: 'code' } });
    });

    it('should not modify already migrated config', () => {
      const newConfig = {
        defaultCmd: 'claude',
        defaultCmdArgs: ['-p', '{{prompt}}'],
        defaultCmdOptions: { 'Continue?': '--continue' },
        promptDirs: ['./prompts'],
        version: '3.0.0',
        autoReview: true,
        autoRun: false,
        gitPromptDir: '.git-prompts',
        handlebarsExtensions: []
      };
      
      const migrated = migrations[0].migrate(newConfig);
      
      expect(migrated).toEqual(newConfig);
    });
  });

  describe('Migration Detection', () => {
    it('should detect old config format', () => {
      const oldConfig = {
        codingTool: 'claude',
        promptDirs: ['./prompts']
      };
      
      const needsMigration = migrateConfig.needsMigration(oldConfig);
      
      expect(needsMigration).toBe(true);
    });

    it('should detect new config format', () => {
      const newConfig = {
        defaultCmd: 'claude',
        promptDirs: ['./prompts'],
        version: '3.0.0'
      };
      
      const needsMigration = migrateConfig.needsMigration(newConfig);
      
      expect(needsMigration).toBe(false);
    });

    it('should detect missing version field', () => {
      const configWithoutVersion = {
        defaultCmd: 'claude',
        promptDirs: ['./prompts']
      };
      
      const needsMigration = migrateConfig.needsMigration(configWithoutVersion);
      
      expect(needsMigration).toBe(true);
    });
  });

  describe('Full Migration Process', () => {
    it('should perform complete migration', () => {
      const oldConfig = {
        codingTool: 'claude',
        codingToolArgs: ['-p', '{{prompt}}'],
        codingToolOptions: { 'Continue?': '--continue' },
        promptDirs: ['./prompts'],
        historyDir: '.history',
        helpers: {
          upper: { type: 'inline', value: 's => s.toUpperCase()' }
        }
      };
      
      const migrated = migrateConfig(oldConfig);
      
      expect(migrated).toEqual({
        defaultCmd: 'claude',
        defaultCmdArgs: ['-p', '{{prompt}}'],
        defaultCmdOptions: { 'Continue?': '--continue' },
        promptDirs: ['./prompts'],
        historyDir: '.history',
        helpers: {
          upper: { type: 'inline', value: 's => s.toUpperCase()' }
        },
        version: '3.0.0',
        autoReview: true,
        autoRun: false,
        gitPromptDir: '.git-prompts',
        handlebarsExtensions: []
      });
    });

    it('should handle partial old config', () => {
      const partialOldConfig = {
        promptDirs: ['./prompts'],
        codingTool: 'echo'
      };
      
      const migrated = migrateConfig(partialOldConfig);
      
      expect(migrated.defaultCmd).toBe('echo');
      expect(migrated.defaultCmdArgs).toEqual([]);
      expect(migrated.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(migrated.version).toBe('3.0.0');
    });
  });

  describe('Backup Creation', () => {
    it('should create backup of old config', async () => {
      const configPath = '/.ptrc.json';
      const oldConfig = {
        codingTool: 'claude',
        promptDirs: ['./prompts']
      };
      
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.copy).mockResolvedValue();
      
      await migrateConfig.createBackup(configPath);
      
      expect(fs.copy).toHaveBeenCalledWith(configPath, '/.ptrc.json.backup');
    });

    it('should create timestamped backup if backup already exists', async () => {
      const configPath = '/.ptrc.json';
      const oldConfig = {
        codingTool: 'claude',
        promptDirs: ['./prompts']
      };
      
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.copy).mockResolvedValue();
      
      const mockDate = new Date('2025-01-15T10:30:00Z');
      vi.setSystemTime(mockDate);
      
      await migrateConfig.createBackup(configPath);
      
      // The timestamp uses local time hours, so we need to check what was actually called
      const calls = vi.mocked(fs.copy).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe(configPath);
      expect(calls[0][1]).toMatch(/^\/\.ptrc\.json\.backup\.\d{14}$/);
    });
  });
});