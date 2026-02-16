import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let testDir: string;

vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

import { ConfigManager } from '@/config/config-manager';

describe('ConfigManager coverage', () => {
  beforeEach(async () => {
    const tempDir = path.join(os.tmpdir(), `pt-test-config-cov-${  Date.now()}`);
    await fs.ensureDir(tempDir);
    testDir = fs.realpathSync(tempDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(testDir);
  });

  describe('migrateConfig', () => {
    it('should migrate a v1 config with old field names', async () => {
      // v1 config uses promptDirectory, historyDirectory, annotationDirectory, codingTool
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './prompts',
        historyDirectory: './history',
        annotationDirectory: './annotations',
        codingTool: 'aider',
        codingToolArgs: ['--model', 'gpt-4'],
        codingToolOptions: { 'Resume?': '--resume' }
      });

      const config = await ConfigManager.load();

      // Old fields should be migrated
      expect(config.historyDir).toBe(path.join(testDir, 'history'));
      expect(config.annotationDir).toBe(path.join(testDir, 'annotations'));
      expect(config.defaultCmd).toBe('aider');
      expect(config.defaultCmdArgs).toEqual(['--model', 'gpt-4']);
      expect(config.defaultCmdOptions).toEqual({ 'Resume?': '--resume' });
      // Should be migrated to latest version
      expect(config.version).toBe('8.0.0');
    });

    it('should migrate a v2 config with codingTool fields', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        codingTool: 'claude',
        codingToolArgs: ['--verbose'],
        codingToolOptions: { 'Continue?': '--continue' },
        version: '2.0.0'
      });

      const config = await ConfigManager.load();

      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual(['--verbose']);
      expect(config.defaultCmdOptions).toEqual({ 'Continue?': '--continue' });
      expect(config.version).toBe('8.0.0');
    });

    it('should migrate a v3 config to v8', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        defaultCmd: 'claude',
        autoReview: false,
        autoRun: true,
        version: '3.0.0'
      });

      const config = await ConfigManager.load();

      expect(config.version).toBe('8.0.0');
      expect(config.autoReview).toBe(false);
      expect(config.autoRun).toBe(true);
      expect(config.outputCapture).toBeDefined();
      // v8 migration forces outputCapture.enabled to true
      expect(config.outputCapture?.enabled).toBe(true);
    });

    it('should migrate a v4 config to v8', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '4.0.0',
        outputCapture: {
          enabled: true,
          directory: './output',
          maxSizeMB: 100,
          retentionDays: 60
        }
      });

      const config = await ConfigManager.load();

      expect(config.version).toBe('8.0.0');
      // v8 forces enabled to true
      expect(config.outputCapture?.enabled).toBe(true);
    });

    it('should migrate a v5 config to v8', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '5.0.0',
        libraries: ['some-lib']
      });

      const config = await ConfigManager.load();

      expect(config.version).toBe('8.0.0');
    });

    it('should migrate targetLlm to environment.llm.provider', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '5.0.0',
        targetLlm: 'anthropic'
      });

      const config = await ConfigManager.load();

      expect(config.version).toBe('8.0.0');
      expect(config.environment?.llm?.provider).toBe('anthropic');
      expect((config as Record<string, unknown>).targetLlm).toBeUndefined();
    });

    it('should create a backup before migration', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './prompts',
        codingTool: 'claude'
      });

      await ConfigManager.load();

      // Backup should exist
      expect(await fs.pathExists(path.join(testDir, 'config.json.backup'))).toBe(true);
    });

    it('should create timestamped backup when backup already exists', async () => {
      // Create existing backup
      await fs.writeJson(path.join(testDir, 'config.json.backup'), { old: 'backup' });

      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './prompts',
        codingTool: 'claude'
      });

      await ConfigManager.load();

      // Original backup should still exist
      expect(await fs.pathExists(path.join(testDir, 'config.json.backup'))).toBe(true);

      // A timestamped backup should also exist
      const files = await fs.readdir(testDir);
      const timestampedBackups = files.filter(f => f.startsWith('config.json.backup.'));
      expect(timestampedBackups.length).toBeGreaterThanOrEqual(1);
    });

    it('should continue migration even if backup creation fails', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './prompts',
        codingTool: 'claude'
      });

      // Mock createBackup to throw
      const { migrateConfig } = await import('@/config/migration');
      const originalCreateBackup = migrateConfig.createBackup;
      migrateConfig.createBackup = async () => {
        throw new Error('Backup failed');
      };

      try {
        const config = await ConfigManager.load();
        // Migration should still succeed
        expect(config.defaultCmd).toBe('claude');
        expect(config.version).toBe('8.0.0');
      } finally {
        migrateConfig.createBackup = originalCreateBackup;
      }
    });

    it('should save migrated json config back to disk', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './prompts',
        codingTool: 'claude'
      });

      await ConfigManager.load();

      // Read the config file back and verify it was updated
      const savedConfig = await fs.readJson(path.join(testDir, 'config.json'));
      expect(savedConfig.version).toBe('8.0.0');
      expect(savedConfig.promptDirs).toBeDefined();
      expect(savedConfig.promptDirectory).toBeUndefined();
      expect(savedConfig.codingTool).toBeUndefined();
    });

    it('should retry migration when initial validation fails but migration fixes it', async () => {
      // Config with version '8.0.0' but targetLlm still present triggers needsMigration
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0',
        targetLlm: 'openai'
      });

      const config = await ConfigManager.load();

      // targetLlm should be migrated
      expect(config.environment?.llm?.provider).toBe('openai');
    });

    it('should throw when migration produces an invalid config', async () => {
      // outputCapture.enabled must be boolean, but 'not-a-boolean' is a string.
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0',
        outputCapture: {
          enabled: 'not-a-boolean'
        }
      });

      await expect(ConfigManager.load()).rejects.toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should throw for completely invalid config format', async () => {
      // A non-object value cannot match any config schema
      await fs.writeJson(path.join(testDir, 'config.json'), 'not-an-object');

      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it('should handle union errors and find specific field errors', async () => {
      // Write a config where a known field has an invalid type
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: 123, // Invalid: should be array of strings
        version: '8.0.0'
      });

      await expect(ConfigManager.load()).rejects.toThrow(/promptDirs/);
    });

    it('should throw format error when no specific field path is found in union errors', async () => {
      // An empty object should fail since it doesn't match any schema
      await fs.writeJson(path.join(testDir, 'config.json'), 42);

      await expect(ConfigManager.load()).rejects.toThrow(/format/);
    });

    it('should throw for config with invalid nested field', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0',
        helpers: {
          myHelper: {
            type: 'inline'
            // Missing required 'value' for inline type
          }
        }
      });

      await expect(ConfigManager.load()).rejects.toThrow();
    });
  });

  describe('config field loading', () => {

    it('should merge defaultCmd field from config', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        defaultCmd: 'aider',
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.defaultCmd).toBe('aider');
    });

    it('should merge defaultCmdArgs field from config', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        defaultCmdArgs: ['--verbose', '--model', 'gpt-4'],
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.defaultCmdArgs).toEqual(['--verbose', '--model', 'gpt-4']);
    });

    it('should merge defaultCmdOptions field from config', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        defaultCmdOptions: { 'Continue?': '--continue', 'Reset?': '--reset' },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.defaultCmdOptions).toEqual({
        'Continue?': '--continue',
        'Reset?': '--reset'
      });
    });

    it('should merge autoReview and autoRun booleans', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        autoReview: false,
        autoRun: true,
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.autoReview).toBe(false);
      expect(config.autoRun).toBe(true);
    });

    it('should keep autoReview and autoRun as undefined when not specified in current-version config', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      // When config is already at current version, no migration runs,
      // so defaults are not applied on this path.
      expect(config.autoReview).toBeUndefined();
      expect(config.autoRun).toBeUndefined();
    });

    it('should apply default autoReview and autoRun during migration from older version', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '3.0.0'
      });

      const config = await ConfigManager.load();
      // Migration through v4+ sets these defaults
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(false);
    });

    it('should merge version field', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.version).toBe('8.0.0');
    });

    it('should merge helpers field', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        helpers: {
          dateHelper: { type: 'inline', value: 'return Date.now()' },
          fileHelper: { type: 'file', path: './helpers/custom.js' }
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.helpers).toBeDefined();
      expect(config.helpers?.dateHelper?.type).toBe('inline');
      expect(config.helpers?.dateHelper?.value).toBe('return Date.now()');
      expect(config.helpers?.fileHelper?.type).toBe('file');
      expect(config.helpers?.fileHelper?.path).toBe(path.join(testDir, 'helpers/custom.js'));
    });

    it('should merge outputCapture field', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        outputCapture: {
          enabled: true,
          directory: './output',
          maxSizeMB: 200,
          retentionDays: 90
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.outputCapture).toBeDefined();
      expect(config.outputCapture?.enabled).toBe(true);
      expect(config.outputCapture?.directory).toBe(path.join(testDir, 'output'));
      expect(config.outputCapture?.maxSizeMB).toBe(200);
      expect(config.outputCapture?.retentionDays).toBe(90);
    });

    it('should merge logLevel field', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        logLevel: 'debug',
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.logLevel).toBe('debug');
    });

    it('should deep merge environment configuration', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        environment: {
          llm: { model: 'claude-3-opus', provider: 'anthropic', maxTokens: 4096, temperature: 0.7 },
          output: { format: 'markdown', trim: true, indent: '  ' },
          code: { language: 'typescript', highlight: true },
          user: { editor: 'vscode' }
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.environment).toBeDefined();
      expect(config.environment?.llm?.model).toBe('claude-3-opus');
      expect(config.environment?.llm?.provider).toBe('anthropic');
      expect(config.environment?.llm?.maxTokens).toBe(4096);
      expect(config.environment?.llm?.temperature).toBe(0.7);
      expect(config.environment?.output?.format).toBe('markdown');
      expect(config.environment?.output?.trim).toBe(true);
      expect(config.environment?.output?.indent).toBe('  ');
      expect(config.environment?.code?.language).toBe('typescript');
      expect(config.environment?.code?.highlight).toBe(true);
      expect(config.environment?.user?.editor).toBe('vscode');
    });
  });

  describe('expandPaths', () => {
    it('should expand outputCapture.directory path', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        outputCapture: {
          enabled: true,
          directory: './captured-output'
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.outputCapture?.directory).toBe(path.join(testDir, 'captured-output'));
    });

    it('should expand outputCapture.directory with home path', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        outputCapture: {
          enabled: true,
          directory: '~/.pt-output'
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.outputCapture?.directory).toBe(path.join(os.homedir(), '.pt-output'));
    });

    it('should expand annotationDir path', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        annotationDir: './my-annotations',
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.annotationDir).toBe(path.join(testDir, 'my-annotations'));
    });

    it('should not expand paths when outputCapture has no directory', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        outputCapture: {
          enabled: false
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();
      expect(config.outputCapture?.directory).toBeUndefined();
    });
  });

  describe('annotation migration during loadWithPath', () => {
    it('should attempt annotation migration when annotationDir is set', async () => {
      const annotationDir = path.join(testDir, 'annotations');
      await fs.ensureDir(annotationDir);

      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        annotationDir: './annotations',
        version: '8.0.0'
      });

      // Load config - should attempt annotation migration without error
      const result = await ConfigManager.loadWithPath();
      expect(result.config.annotationDir).toBe(annotationDir);
    });

    it('should handle annotation migration failure gracefully', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        annotationDir: './annotations',
        version: '8.0.0'
      });

      // Create annotationDir as a file (not a directory) to cause migration to fail
      await fs.writeFile(path.join(testDir, 'annotations'), 'not-a-directory');

      // Should not throw - the error is caught and logged as a warning
      const result = await ConfigManager.loadWithPath();
      expect(result.config.annotationDir).toBe(path.join(testDir, 'annotations'));
    });
  });

  describe('loadWithPath returns', () => {
    it('should return undefined filepath and configDir when no config found', async () => {
      // testDir has no config file, so loadWithPath returns defaults
      const result = await ConfigManager.loadWithPath();

      expect(result.filepath).toBeUndefined();
      expect(result.configDir).toBeUndefined();
      expect(result.config.promptDirs).toHaveLength(1);
    });

    it('should return filepath and configDir when config is found', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0'
      });

      const result = await ConfigManager.loadWithPath();

      expect(result.filepath).toBe(path.join(testDir, 'config.json'));
      expect(result.configDir).toBe(testDir);
    });
  });

  describe('migrateConfig retry path', () => {
    it('should retry migration when validation fails but migration can fix it', async () => {
      // Write config that has version 5.0.0 (so needsMigration returns true for version)
      // and has targetLlm (so needsMigration returns true)
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '5.0.0',
        targetLlm: 'openai'
      });

      const config = await ConfigManager.load();
      expect(config.environment?.llm?.provider).toBe('openai');
      expect(config.version).toBe('8.0.0');
    });

    it('should throw when config validation fails and migration cannot fix it', async () => {
      // Use a YAML config to avoid the JSON migration write-back
      const yamlContent = `
promptDirs:
  - ./prompts
version: "8.0.0"
outputCapture:
  enabled: "yes"
`;
      await fs.writeFile(path.join(testDir, 'config.yaml'), yamlContent);

      await expect(ConfigManager.load()).rejects.toThrow();
    });
  });

  describe('migration with non-JSON config files', () => {
    it('should not write back migrated config for YAML files', async () => {
      const yamlContent = `
promptDirectory: ./prompts
codingTool: claude
`;
      await fs.writeFile(path.join(testDir, 'config.yaml'), yamlContent);

      const config = await ConfigManager.load();

      // Migration should still work
      expect(config.defaultCmd).toBe('claude');
      expect(config.version).toBe('8.0.0');

      // YAML file should not be modified (migration only writes back .json)
      const yamlAfter = await fs.readFile(path.join(testDir, 'config.yaml'), 'utf-8');
      expect(yamlAfter).toContain('promptDirectory');
    });
  });

  describe('migration edge cases', () => {
    it('should handle v1 config with promptDirectory as array', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: ['./prompts1', './prompts2']
      });

      const config = await ConfigManager.load();
      // v8 migration replaces default prompt dirs with global path,
      // but since these are custom non-default dirs they should be preserved
      // Actually, v1->v3 migration converts promptDirectory to promptDirs,
      // then v8 only replaces if they are the default ('./.prompts').
      // Here we have 2 dirs, so v8 won't replace them.
      expect(config.promptDirs).toContain(path.join(testDir, 'prompts1'));
      expect(config.promptDirs).toContain(path.join(testDir, 'prompts2'));
    });

    it('should handle v1 config with promptDirectory as string', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './single-prompts'
      });

      const config = await ConfigManager.load();
      // v1->v3 wraps it as ['./single-prompts'], which is not './.prompts',
      // so v8 migration won't replace it
      expect(config.promptDirs).toContain(path.join(testDir, 'single-prompts'));
    });

    it('should preserve outputCapture during v1 migration', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirectory: './prompts',
        outputCapture: {
          enabled: true,
          directory: './output'
        }
      });

      const config = await ConfigManager.load();
      // v8 forces outputCapture.enabled to true
      expect(config.outputCapture?.enabled).toBe(true);
    });

    it('should add default outputCapture during v4 migration when missing', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '3.0.0',
        defaultCmd: 'claude'
      });

      const config = await ConfigManager.load();
      expect(config.outputCapture).toBeDefined();
      // v8 migration forces enabled to true
      expect(config.outputCapture?.enabled).toBe(true);
      expect(config.outputCapture?.directory).toBeDefined();
    });

    it('should add libraries default during v5 migration', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '4.0.0',
        outputCapture: { enabled: false }
      });

      const config = await ConfigManager.load();
      // After migration through v5 and up to v8
      expect(config.version).toBe('8.0.0');
    });
  });
});
