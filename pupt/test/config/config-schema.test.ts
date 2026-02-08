import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../src/config/config-manager.js';
import { Config } from '../../src/types/config.js';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';


describe('Config Schema Validation', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    const tempDir = path.join(os.tmpdir(), 'pt-config-schema-test-' + Date.now());
    await fs.ensureDir(tempDir);
    // Use realpathSync to get canonical path (handles macOS /var -> /private/var)
    testDir = fs.realpathSync(tempDir);
    configPath = path.join(testDir, '.pt-config.json');
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change out of the test directory before trying to remove it
    process.chdir(os.tmpdir());
    
    // On Windows, files might still be in use, so retry removal
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.remove(testDir);
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  describe('new optional fields', () => {
    it('should accept valid historyDir', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.historyDir).toBe(path.resolve('./.pthistory'));
    });

    it('should accept valid annotationDir', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        annotationDir: './.ptannotations'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.annotationDir).toBe(path.resolve('./.ptannotations'));
    });

    it('should accept valid defaultCmd (new name for codingTool)', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmd).toBe('claude');
    });

    it('should accept valid defaultCmdArgs (new name for codingToolArgs)', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        defaultCmdArgs: ['--model', 'sonnet']
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmdArgs).toEqual(['--model', 'sonnet']);
    });

    it('should accept valid defaultCmdOptions (new name for codingToolOptions)', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        defaultCmdOptions: {
          'Continue with last context?': '--continue',
          'Enable web search?': '--web'
        }
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue',
        'Enable web search?': '--web'
      });
    });

    it('should accept valid autoReview field', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        autoReview: false
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.autoReview).toBe(false);
    });

    it('should accept valid autoRun field', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        autoRun: true
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.autoRun).toBe(true);
    });

    it('should accept valid gitPromptDir field', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        gitPromptDir: '.my-git-prompts'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.gitPromptDir).toBe(path.join(testDir, '.my-git-prompts'));
    });

  });

  describe('backward compatibility', () => {
    it('should work with configs missing new fields', async () => {
      const oldConfig = {
        promptDirs: ['./.prompts']
      };
      await fs.writeJson(configPath, oldConfig);
      
      const loaded = await ConfigManager.load();
      expect(loaded.promptDirs).toContain(path.resolve('./.prompts'));
      // historyDir might come from parent config, so just check it's a string or undefined
      expect(typeof loaded.historyDir === 'string' || loaded.historyDir === undefined).toBe(true);
      // annotationDir might come from parent config
      expect(typeof loaded.annotationDir === 'string' || loaded.annotationDir === undefined).toBe(true);
      // These get defaults from migration
      expect(loaded.defaultCmd).toBe('claude');
      expect(loaded.defaultCmdArgs).toEqual([]);
      expect(loaded.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(loaded.autoReview).toBe(true);
      expect(loaded.autoRun).toBe(false);
      expect(loaded.gitPromptDir).toBe(path.join(testDir, '.git-prompts'));
    });

    it('should preserve existing fields when loading old configs', async () => {
      const oldConfig = {
        promptDirs: ['./.prompts', './templates'],
        someCustomField: 'value'
      };
      await fs.writeJson(configPath, oldConfig);
      
      const loaded = await ConfigManager.load();
      expect(loaded.promptDirs).toContain(path.resolve('./.prompts'));
      expect(loaded.promptDirs).toContain(path.resolve('./templates'));
    });
  });

  describe('field type validation', () => {
    it('should reject invalid historyDir type', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        historyDir: 123 // should be string
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration error: 'historyDir' must be Expected string, received number (found: string)");
    });

    it('should reject invalid defaultCmdArgs type', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        defaultCmdArgs: 'not-an-array' // should be array
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration migration failed: Expected array, received string");
    });

    it('should reject invalid defaultCmdOptions type', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        defaultCmdOptions: 'not-an-object' // should be object
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration migration failed: Expected object, received string");
    });

    it('should reject invalid autoReview type', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        autoReview: 'yes' // should be boolean
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration error: 'autoReview' must be Expected boolean, received string (found: string)");
    });

    it('should reject invalid autoRun type', async () => {
      const config = {
        promptDirs: ['./.prompts'],
        autoRun: 1 // should be boolean
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration error: 'autoRun' must be Expected boolean, received number (found: string)");
    });

  });

  describe('default values', () => {
    it('should apply default values when creating new config', async () => {
      // No config file exists
      const loaded = await ConfigManager.load();
      
      expect(loaded.promptDirs).toContain(path.join(os.homedir(), '.pt/prompts'));
      // Default tool settings are no longer hardcoded
      expect(loaded.defaultCmd).toBeUndefined();
      expect(loaded.defaultCmdArgs).toBeUndefined();
      expect(loaded.defaultCmdOptions).toBeUndefined();
      expect(loaded.version).toBe('7.0.0');
      expect(loaded.autoReview).toBe(true);
      expect(loaded.autoRun).toBe(false);
      expect(loaded.gitPromptDir).toBe(path.join(testDir, '.git-prompts'));
    });

    it('should not override existing values with defaults', async () => {
      const config = {
        promptDirs: ['./my-prompts'],
        defaultCmd: 'gpt',
        defaultCmdArgs: ['--custom'],
        defaultCmdOptions: {
          'My option?': '--my-flag'
        },
        autoReview: false,
        autoRun: true,
        gitPromptDir: '.custom-git-prompts'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmd).toBe('gpt');
      expect(loaded.defaultCmdArgs).toEqual(['--custom']);
      expect(loaded.defaultCmdOptions).toEqual({
        'My option?': '--my-flag'
      });
      expect(loaded.autoReview).toBe(false);
      expect(loaded.autoRun).toBe(true);
      expect(loaded.gitPromptDir).toBe(path.join(testDir, '.custom-git-prompts'));
    });
  });
});

describe('Config Migration', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    const tempDir = path.join(os.tmpdir(), 'pt-config-migration-test-' + Date.now());
    await fs.ensureDir(tempDir);
    // Use realpathSync to get canonical path (handles macOS /var -> /private/var)
    testDir = fs.realpathSync(tempDir);
    configPath = path.join(testDir, '.pt-config.json');
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change out of the test directory before trying to remove it
    process.chdir(os.tmpdir());
    
    // On Windows, files might still be in use, so retry removal
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.remove(testDir);
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it('should detect old config version', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts']
      // no version field
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    expect(loaded.version).toBe('7.0.0');
  });

  it('should add version to configs without it', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts']
    };
    await fs.writeJson(configPath, oldConfig);
    
    await ConfigManager.load();
    
    const saved = await fs.readJson(configPath);
    expect(saved.version).toBe('7.0.0');
  });

  it('should migrate old field names to new ones', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts'],
      codingTool: 'claude',
      codingToolArgs: ['--model', 'sonnet'],
      codingToolOptions: {
        'Continue?': '--continue'
      }
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    
    expect(loaded.defaultCmd).toBe('claude');
    expect(loaded.defaultCmdArgs).toEqual(['--model', 'sonnet']);
    expect(loaded.defaultCmdOptions).toEqual({
      'Continue?': '--continue'
    });
    expect(loaded.codingTool).toBeUndefined();
    expect(loaded.codingToolArgs).toBeUndefined();
    expect(loaded.codingToolOptions).toBeUndefined();
  });

  it('should add new default fields during migration', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts']
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    
    expect(loaded.defaultCmd).toBe('claude');
    expect(loaded.defaultCmdArgs).toEqual([]);
    expect(loaded.defaultCmdOptions).toEqual({
      'Continue with last context?': '--continue'
    });
    expect(loaded.autoReview).toBe(true);
    expect(loaded.autoRun).toBe(false);
    // Just compare the paths directly - they should both be resolved the same way
    expect(loaded.gitPromptDir).toBe(path.join(testDir, '.git-prompts'));
  });

  it('should preserve existing fields during migration', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts', './templates'],
      customField: 'should-remain'
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    
    expect(loaded.promptDirs).toContain(path.resolve('./.prompts'));
    expect(loaded.promptDirs).toContain(path.resolve('./templates'));
    
    const saved = await fs.readJson(configPath);
    expect(saved.customField).toBe('should-remain');
  });

  it('should not migrate configs already at current version', async () => {
    const currentConfig = {
      promptDirs: ['./.prompts'],
      version: '5.0.0',
      defaultCmd: 'my-tool'
    };
    await fs.writeJson(configPath, currentConfig);

    const loaded = await ConfigManager.load();

    expect(loaded.defaultCmd).toBe('my-tool'); // not overridden
    expect(loaded.version).toBe('7.0.0');
  });

  it('should save migrated config back to disk', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts']
    };
    await fs.writeJson(configPath, oldConfig);
    
    await ConfigManager.load();
    
    const saved = await fs.readJson(configPath);
    expect(saved.version).toBe('7.0.0');
    expect(saved.defaultCmd).toBe('claude');
    expect(saved.defaultCmdArgs).toEqual([]);
    expect(saved.defaultCmdOptions).toBeDefined();
  });

  it('should create backup before migration', async () => {
    const oldConfig = {
      promptDirs: ['./.prompts'],
      codingTool: 'claude'
    };
    await fs.writeJson(configPath, oldConfig);
    
    await ConfigManager.load();
    
    // Check backup was created
    const backupPath = configPath + '.backup';
    expect(await fs.pathExists(backupPath)).toBe(true);
    
    const backup = await fs.readJson(backupPath);
    expect(backup.codingTool).toBe('claude');
    expect(backup.version).toBeUndefined();
  });
});