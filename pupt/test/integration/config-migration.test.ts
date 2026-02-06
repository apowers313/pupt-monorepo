import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../src/config/config-manager.js';

describe('Config Migration Integration', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-migration-test-'));
    // Use realpathSync to get canonical path (handles macOS /var -> /private/var)
    testDir = fs.realpathSync(tempDir);
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('Full Migration Flow', () => {
    it('should migrate old config when running pt init', async () => {
      // Create old config file
      const oldConfig = {
        promptDirs: ['./.prompts', './templates'],
        historyDir: './.history',
        annotationDir: './.annotations',
        codingTool: 'claude',
        codingToolArgs: ['--model', 'sonnet-3.5'],
        codingToolOptions: {
          'Continue with last session?': '--continue',
          'Enable web search?': '--web'
        },
        helpers: {
          upper: { type: 'inline', value: 's => s.toUpperCase()' }
        }
      };
      
      await fs.writeJson('.pt-config.json', oldConfig);
      
      // Load config (triggers migration)
      const config = await ConfigManager.load();
      
      // Check that new fields exist
      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual(['--model', 'sonnet-3.5']);
      expect(config.defaultCmdOptions).toEqual({
        'Continue with last session?': '--continue',
        'Enable web search?': '--web'
      });
      expect(config.version).toBe('6.0.0');
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(false);
      expect(config.gitPromptDir).toBe(path.join(testDir, '.git-prompts'));

      // Check that old fields are removed from runtime config
      expect(config.codingTool).toBeUndefined();
      expect(config.codingToolArgs).toBeUndefined();
      expect(config.codingToolOptions).toBeUndefined();
      
      // Check that other fields are preserved
      expect(config.promptDirs).toContain(path.resolve('./.prompts'));
      expect(config.promptDirs).toContain(path.resolve('./templates'));
      expect(config.historyDir).toBe(path.resolve('./.history'));
      expect(config.annotationDir).toBe(path.resolve('./.annotations'));
      expect(config.helpers?.upper).toEqual({ type: 'inline', value: 's => s.toUpperCase()' });
      
      // Check that config file was updated
      const savedConfig = await fs.readJson('.pt-config.json');
      expect(savedConfig.defaultCmd).toBe('claude');
      expect(savedConfig.defaultCmdArgs).toEqual(['--model', 'sonnet-3.5']);
      expect(savedConfig.defaultCmdOptions).toBeDefined();
      expect(savedConfig.version).toBe('6.0.0');

      // Check that backup was created
      const backupPath = '.pt-config.json.backup';
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      const backup = await fs.readJson(backupPath);
      expect(backup.codingTool).toBe('claude');
      expect(backup.version).toBeUndefined();
    });

    it('should handle multiple migrations without data loss', async () => {
      // First migration
      const oldConfig = {
        promptDirs: ['./.prompts'],
        codingTool: 'gpt',
        codingToolArgs: ['--api-key', 'sk-123']
      };
      
      await fs.writeJson('.pt-config.json', oldConfig);
      
      // First load
      let config = await ConfigManager.load();
      expect(config.defaultCmd).toBe('gpt');
      expect(config.defaultCmdArgs).toEqual(['--api-key', 'sk-123']);
      
      // Second load (should not re-migrate)
      config = await ConfigManager.load();
      expect(config.defaultCmd).toBe('gpt');
      expect(config.version).toBe('6.0.0');
      
      // Verify only one backup exists
      const backupPath = '.pt-config.json.backup';
      expect(await fs.pathExists(backupPath)).toBe(true);
      expect(await fs.pathExists('.pt-config.json.backup.1')).toBe(false);
    });

    it('should create timestamped backup for subsequent migrations', async () => {
      // Create initial config and backup
      await fs.writeJson('.pt-config.json', { promptDirs: ['./.prompts'] });
      await fs.writeFile('.pt-config.json.backup', 'existing backup');
      
      // Create old config that needs migration
      const oldConfig = {
        promptDirs: ['./.prompts'],
        codingTool: 'claude'
      };
      await fs.writeJson('.pt-config.json', oldConfig);
      
      // Trigger migration
      await ConfigManager.load();
      
      // Check that timestamped backup was created
      const files = await fs.readdir('.');
      const timestampedBackup = files.find(f => f.match(/^\.pt-config\.json\.backup\.\d{14}$/));
      expect(timestampedBackup).toBeDefined();
    });

    it('should handle partial configs correctly', async () => {
      // Config with only some old fields
      const partialOldConfig = {
        promptDirs: ['./.prompts'],
        codingTool: 'echo'
        // No args or options
      };
      
      await fs.writeJson('.pt-config.json', partialOldConfig);
      
      const config = await ConfigManager.load();
      
      expect(config.defaultCmd).toBe('echo');
      expect(config.defaultCmdArgs).toEqual([]);
      expect(config.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(false);
    });

    it('should allow custom fields during migration with passthrough schema', async () => {
      const configWithCustomFields = {
        promptDirs: ['./.prompts'],
        codingTool: 'claude',
        // Custom fields
        customField1: 'value1',
        customNested: {
          field2: 'value2'
        }
      };
      
      await fs.writeJson('.pt-config.json', configWithCustomFields);
      
      // Should not throw - passthrough schema allows custom fields
      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmd).toBe('claude'); // migrated from codingTool
      
      // Check that custom fields are preserved in the file
      const savedConfig = await fs.readJson('.pt-config.json');
      expect(savedConfig.customField1).toBe('value1');
      expect(savedConfig.customNested.field2).toBe('value2');
    });

    it('should not migrate already-migrated configs', async () => {
      const newConfig = {
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude',
        defaultCmdArgs: ['--model', 'sonnet'],
        version: '6.0.0',
        libraries: [],
        outputCapture: {
          enabled: false
        },
      };

      await fs.writeJson('.pt-config.json', newConfig);

      const config = await ConfigManager.load();

      // Should not create backup for already migrated config
      expect(await fs.pathExists('.pt-config.json.backup')).toBe(false);

      // Config should remain unchanged
      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual(['--model', 'sonnet']);
    });

    it('should handle YAML configs during migration', async () => {
      const yamlContent = `
promptDirs:
  - ./prompts
codingTool: claude
codingToolArgs:
  - --model
  - sonnet
codingToolOptions:
  Continue?: --continue
`;
      
      await fs.writeFile('.pt-config.yaml', yamlContent);
      
      const config = await ConfigManager.load();
      
      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual(['--model', 'sonnet']);
      expect(config.defaultCmdOptions).toEqual({ 'Continue?': '--continue' });
      
      // YAML files should not be automatically updated
      // (cosmiconfig doesn't support writing YAML)
      const updatedYaml = await fs.readFile('.pt-config.yaml', 'utf8');
      expect(updatedYaml).toBe(yamlContent);
    });

    it('should apply defaults during migration', async () => {
      const minimalOldConfig = {
        promptDirs: ['./.prompts']
      };
      
      await fs.writeJson('.pt-config.json', minimalOldConfig);
      
      const config = await ConfigManager.load();
      
      // Should have all default values
      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual([]);
      expect(config.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(false);
      expect(config.gitPromptDir).toBe(path.join(testDir, '.git-prompts'));
      expect(config.version).toBe('6.0.0');
    });
  });

  describe('Backward Compatibility', () => {
    it('should support migration from mixed old and new fields', async () => {
      // This test ensures migration handles configs with both old and new fields
      const mixedConfig = {
        promptDirs: ['./.prompts'],
        // Old field names (will be migrated)
        codingTool: 'oldtool',
        // Without version, migration will be triggered
      };
      
      await fs.writeJson('.pt-config.json', mixedConfig);
      
      const config = await ConfigManager.load();
      
      // Old field should be migrated to new field
      expect(config.defaultCmd).toBe('oldtool');
      expect(config.codingTool).toBeUndefined();
    });
  });

  describe('V3 to V4 Migration', () => {
    it('should handle migration from v3 to v4 with output capture defaults', async () => {
      const v3Config = {
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude',
        defaultCmdArgs: [],
        version: '3.0.0',
        autoReview: true,
        autoRun: false,
        gitPromptDir: '.git-prompts'
      };
      
      await fs.writeJson('.pt-config.json', v3Config);
      
      const config = await ConfigManager.load();
      
      // Should update version to 5.0.0 (migrates through v4 to v5)
      expect(config.version).toBe('6.0.0');

      // Should have output capture defaults
      expect(config.outputCapture).toEqual({
        enabled: false,
        directory: path.join(testDir, '.pt-output'),
        maxSizeMB: 50,
        retentionDays: 30
      });
      
      // autoAnnotate should be removed during migration
      expect(config.autoAnnotate).toBeUndefined();

      // Existing fields should be preserved
      expect(config.promptDirs).toContain(path.resolve('./.prompts'));
      expect(config.defaultCmd).toBe('claude');
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(false);
    });

    it('should preserve existing output capture settings during v4 migration', async () => {
      const v3ConfigWithOutputCapture = {
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude',
        version: '3.0.0',
        outputCapture: {
          enabled: true,
          directory: '~/my-output',
          maxSizeMB: 100,
          retentionDays: 7
        }
      };
      
      await fs.writeJson('.pt-config.json', v3ConfigWithOutputCapture);
      
      const config = await ConfigManager.load();

      expect(config.version).toBe('6.0.0');

      // Should preserve user's output capture settings
      expect(config.outputCapture).toEqual({
        enabled: true,
        directory: path.resolve(path.join(os.homedir(), 'my-output')),
        maxSizeMB: 100,
        retentionDays: 7
      });
    });

    it('should create backup when migrating from v3 to v4', async () => {
      const v3Config = {
        promptDirs: ['./.prompts'],
        version: '3.0.0'
      };
      
      await fs.writeJson('.pt-config.json', v3Config);
      
      await ConfigManager.load();
      
      // Check that backup was created
      const backupPath = '.pt-config.json.backup';
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      const backup = await fs.readJson(backupPath);
      expect(backup.version).toBe('3.0.0');
    });

    it('should migrate v4 configs to v5', async () => {
      const v4Config = {
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude',
        version: '4.0.0',
        outputCapture: {
          enabled: true,
          directory: './.pt-output'
        },
        autoAnnotate: {
          enabled: true,
          triggers: ['claude'],
          analysisPrompt: 'analyze'
        }
      };

      await fs.writeJson('.pt-config.json', v4Config);

      const config = await ConfigManager.load();

      // Should migrate v4 to v5
      expect(config.version).toBe('6.0.0');
      expect(config.libraries).toEqual([]);

      // Existing fields should be preserved
      expect(config.outputCapture?.enabled).toBe(true);
      // autoAnnotate is removed during migration
      expect(config.autoAnnotate).toBeUndefined();
    });

    it('should handle partial v3 configs correctly', async () => {
      const partialV3Config = {
        promptDirs: ['./.prompts'],
        version: '3.0.0'
        // Missing many optional fields
      };

      await fs.writeJson('.pt-config.json', partialV3Config);

      const config = await ConfigManager.load();

      expect(config.version).toBe('6.0.0');
      expect(config.outputCapture).toBeDefined();
      // autoAnnotate is removed during migration
      expect(config.autoAnnotate).toBeUndefined();

      // V3 migration doesn't add defaultCmd if it's missing, only renames codingTool
      // So defaultCmd will be undefined for partial configs
      expect(config.defaultCmd).toBeUndefined();
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(false);
    });

    it('should migrate v4.0.0 configs that are missing required v4 fields', async () => {
      // Regression test: A config that claims to be v4.0.0 but is missing
      // the outputCapture and autoAnnotate fields that were added in v4.0.0
      // This can happen if a config was manually edited or created before
      // those fields were added to the v4 migration
      const incompleteV4Config = {
        promptDirs: ['/home/user/.pt/prompts', 'node_modules/pupt/prompts'],
        autoReview: true,
        autoRun: true,
        gitPromptDir: '/home/user/project/.git-prompts',
        version: '4.0.0'
        // Missing outputCapture
      };

      await fs.writeJson('.pt-config.json', incompleteV4Config);

      const config = await ConfigManager.load();

      // Should be migrated to v5.0.0
      expect(config.version).toBe('6.0.0');

      // Should add missing v4 fields with defaults
      expect(config.outputCapture).toBeDefined();
      expect(config.outputCapture).toEqual({
        enabled: false,
        directory: path.join(testDir, '.pt-output'),
        maxSizeMB: 50,
        retentionDays: 30
      });

      // autoAnnotate is removed during migration
      expect(config.autoAnnotate).toBeUndefined();

      // Existing fields should be preserved
      expect(config.autoReview).toBe(true);
      expect(config.autoRun).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted config gracefully', async () => {
      await fs.writeFile('.pt-config.json', '{ invalid json');
      
      // Should throw a meaningful error
      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it.skipIf(process.platform === 'win32' || process.env.CI)('should handle missing backup directory', async () => {
      // Create config in a read-only directory scenario
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      process.chdir(readOnlyDir);
      
      const oldConfig = {
        promptDirs: ['./.prompts'],
        codingTool: 'claude'
      };
      
      await fs.writeJson('.pt-config.json', oldConfig);
      
      // Make directory read-only
      await fs.chmod(readOnlyDir, 0o555);
      
      try {
        // Should still load config even if backup fails
        const config = await ConfigManager.load();
        expect(config.defaultCmd).toBe('claude');
      } finally {
        // Restore permissions
        process.chdir(testDir);
        await fs.chmod(readOnlyDir, 0o755);
      }
    });
  });
});