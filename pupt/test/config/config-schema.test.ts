import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { ConfigManager } from '../../src/config/config-manager.js';
import { Config } from '../../src/types/config.js';


describe('Config Schema Validation', () => {
  let testDir: string;
  let dataDir: string;
  let configPath: string;
  let savedEnv: { PUPT_CONFIG_DIR?: string; PUPT_DATA_DIR?: string };

  beforeEach(async () => {
    const tempDir = path.join(os.tmpdir(), `pt-config-schema-test-${  Date.now()}`);
    await fs.ensureDir(tempDir);
    // Use realpathSync to get canonical path (handles macOS /var -> /private/var)
    testDir = fs.realpathSync(tempDir);

    const tempDataDir = path.join(os.tmpdir(), `pt-data-schema-test-${  Date.now()}`);
    await fs.ensureDir(tempDataDir);
    dataDir = fs.realpathSync(tempDataDir);

    configPath = path.join(testDir, 'config.json');

    // Save and set env vars so ConfigManager uses our test directories
    savedEnv = {
      PUPT_CONFIG_DIR: process.env.PUPT_CONFIG_DIR,
      PUPT_DATA_DIR: process.env.PUPT_DATA_DIR,
    };
    process.env.PUPT_CONFIG_DIR = testDir;
    process.env.PUPT_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    // Restore env vars
    if (savedEnv.PUPT_CONFIG_DIR === undefined) {
      delete process.env.PUPT_CONFIG_DIR;
    } else {
      process.env.PUPT_CONFIG_DIR = savedEnv.PUPT_CONFIG_DIR;
    }
    if (savedEnv.PUPT_DATA_DIR === undefined) {
      delete process.env.PUPT_DATA_DIR;
    } else {
      process.env.PUPT_DATA_DIR = savedEnv.PUPT_DATA_DIR;
    }

    // On Windows, files might still be in use, so retry removal
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.remove(testDir);
        await fs.remove(dataDir);
        break;
      } catch (error) {
        if (i === maxRetries - 1) {throw error;}
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  describe('new optional fields', () => {
    it('should accept valid historyDir', async () => {
      const config = {
        promptDirs: ['./prompts'],
        historyDir: './custom-history',
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.historyDir).toBe(path.join(testDir, 'custom-history'));
    });

    it('should accept valid annotationDir', async () => {
      const config = {
        promptDirs: ['./prompts'],
        annotationDir: './custom-annotations',
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.annotationDir).toBe(path.join(testDir, 'custom-annotations'));
    });

    it('should accept valid defaultCmd', async () => {
      const config = {
        promptDirs: ['./prompts'],
        defaultCmd: 'claude',
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmd).toBe('claude');
    });

    it('should accept valid defaultCmdArgs', async () => {
      const config = {
        promptDirs: ['./prompts'],
        defaultCmdArgs: ['--model', 'sonnet'],
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.defaultCmdArgs).toEqual(['--model', 'sonnet']);
    });

    it('should accept valid defaultCmdOptions', async () => {
      const config = {
        promptDirs: ['./prompts'],
        defaultCmdOptions: {
          'Continue with last context?': '--continue',
          'Enable web search?': '--web'
        },
        version: '8.0.0'
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
        promptDirs: ['./prompts'],
        autoReview: false,
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.autoReview).toBe(false);
    });

    it('should accept valid autoRun field', async () => {
      const config = {
        promptDirs: ['./prompts'],
        autoRun: true,
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.autoRun).toBe(true);
    });

    it('should accept valid environment field', async () => {
      const config = {
        promptDirs: ['./prompts'],
        environment: {
          llm: { model: 'claude-3-opus', provider: 'anthropic' },
          output: { format: 'markdown' },
          code: { language: 'typescript' },
          user: { editor: 'vscode' },
        },
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      const loaded = await ConfigManager.load();
      expect(loaded.environment?.llm?.model).toBe('claude-3-opus');
      expect(loaded.environment?.output?.format).toBe('markdown');
      expect(loaded.environment?.code?.language).toBe('typescript');
      expect(loaded.environment?.user?.editor).toBe('vscode');
    });

  });

  describe('backward compatibility', () => {
    it('should work with configs missing new fields', async () => {
      const oldConfig = {
        promptDirs: ['./prompts']
        // No version - will trigger migration to v8
      };
      await fs.writeJson(configPath, oldConfig);

      const loaded = await ConfigManager.load();
      // After v8 migration, promptDirs with only './prompts' gets replaced by global default
      expect(loaded.promptDirs.length).toBeGreaterThan(0);
      // historyDir gets migrated to global data dir
      expect(typeof loaded.historyDir === 'string' || loaded.historyDir === undefined).toBe(true);
      // annotationDir might be set from migration
      expect(typeof loaded.annotationDir === 'string' || loaded.annotationDir === undefined).toBe(true);
      // After v8 migration, deprecated fields are removed but defaultCmd may be set from v3 migration
      // v8 migration doesn't remove defaultCmd (only codingTool), so it may carry from v3 migration
      expect(loaded.autoReview).toBe(true);
      expect(loaded.autoRun).toBe(false);
      // Version should be 8.0.0 after full migration
      expect(loaded.version).toBe('8.0.0');
    });

    it('should preserve existing fields when loading old configs', async () => {
      const oldConfig = {
        promptDirs: ['/absolute/prompts', '/absolute/templates'],
        version: '8.0.0'
      };
      await fs.writeJson(configPath, oldConfig);

      const loaded = await ConfigManager.load();
      expect(loaded.promptDirs).toContain('/absolute/prompts');
      expect(loaded.promptDirs).toContain('/absolute/templates');
    });
  });

  describe('field type validation', () => {
    it('should reject invalid historyDir type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        historyDir: 123, // should be string
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it('should reject invalid defaultCmdArgs type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        defaultCmdArgs: 'not-an-array', // should be array
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it('should reject invalid defaultCmdOptions type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        defaultCmdOptions: 'not-an-object', // should be object
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it('should reject invalid autoReview type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        autoReview: 'yes', // should be boolean
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it('should reject invalid autoRun type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        autoRun: 1, // should be boolean
        version: '8.0.0'
      };
      await fs.writeJson(configPath, config);

      await expect(ConfigManager.load()).rejects.toThrow();
    });

  });

  describe('default values', () => {
    it('should apply default values when creating new config', async () => {
      // No config file exists - ConfigManager returns defaults
      const loaded = await ConfigManager.load();

      // Default prompt dir uses PUPT_DATA_DIR + /prompts
      expect(loaded.promptDirs).toContain(path.join(dataDir, 'prompts'));
      // Default tool settings are no longer hardcoded
      expect(loaded.defaultCmd).toBeUndefined();
      expect(loaded.defaultCmdArgs).toBeUndefined();
      expect(loaded.defaultCmdOptions).toBeUndefined();
      expect(loaded.version).toBe('8.0.0');
      expect(loaded.autoReview).toBe(true);
      expect(loaded.autoRun).toBe(false);
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
        version: '8.0.0'
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
    });
  });
});

describe('Config Migration', () => {
  let testDir: string;
  let dataDir: string;
  let configPath: string;
  let savedEnv: { PUPT_CONFIG_DIR?: string; PUPT_DATA_DIR?: string };

  beforeEach(async () => {
    const tempDir = path.join(os.tmpdir(), `pt-config-migration-test-${  Date.now()}`);
    await fs.ensureDir(tempDir);
    // Use realpathSync to get canonical path (handles macOS /var -> /private/var)
    testDir = fs.realpathSync(tempDir);

    const tempDataDir = path.join(os.tmpdir(), `pt-data-migration-test-${  Date.now()}`);
    await fs.ensureDir(tempDataDir);
    dataDir = fs.realpathSync(tempDataDir);

    configPath = path.join(testDir, 'config.json');

    // Save and set env vars so ConfigManager uses our test directories
    savedEnv = {
      PUPT_CONFIG_DIR: process.env.PUPT_CONFIG_DIR,
      PUPT_DATA_DIR: process.env.PUPT_DATA_DIR,
    };
    process.env.PUPT_CONFIG_DIR = testDir;
    process.env.PUPT_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    // Restore env vars
    if (savedEnv.PUPT_CONFIG_DIR === undefined) {
      delete process.env.PUPT_CONFIG_DIR;
    } else {
      process.env.PUPT_CONFIG_DIR = savedEnv.PUPT_CONFIG_DIR;
    }
    if (savedEnv.PUPT_DATA_DIR === undefined) {
      delete process.env.PUPT_DATA_DIR;
    } else {
      process.env.PUPT_DATA_DIR = savedEnv.PUPT_DATA_DIR;
    }

    // On Windows, files might still be in use, so retry removal
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.remove(testDir);
        await fs.remove(dataDir);
        break;
      } catch (error) {
        if (i === maxRetries - 1) {throw error;}
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it('should detect old config version and migrate to v8', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts']
      // no version field
    };
    await fs.writeJson(configPath, oldConfig);

    const loaded = await ConfigManager.load();
    expect(loaded.version).toBe('8.0.0');
  });

  it('should add version to configs without it', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts']
    };
    await fs.writeJson(configPath, oldConfig);

    await ConfigManager.load();

    const saved = await fs.readJson(configPath);
    expect(saved.version).toBe('8.0.0');
  });

  it('should migrate old field names to new ones and then remove deprecated fields in v8', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts'],
      codingTool: 'claude',
      codingToolArgs: ['--model', 'sonnet'],
      codingToolOptions: {
        'Continue?': '--continue'
      }
    };
    await fs.writeJson(configPath, oldConfig);

    const loaded = await ConfigManager.load();

    // v3 migration renames codingTool -> defaultCmd, then v8 migration removes codingTool
    // After full migration through v8, defaultCmd should be set from the old codingTool value
    expect(loaded.defaultCmd).toBe('claude');
    expect(loaded.defaultCmdArgs).toEqual(['--model', 'sonnet']);
    expect(loaded.defaultCmdOptions).toEqual({
      'Continue?': '--continue'
    });
    // Deprecated fields should not exist on the loaded config
    expect((loaded as any).codingTool).toBeUndefined();
    expect((loaded as any).codingToolArgs).toBeUndefined();
    expect((loaded as any).codingToolOptions).toBeUndefined();
  });

  it('should add new default fields during migration', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts']
    };
    await fs.writeJson(configPath, oldConfig);

    const loaded = await ConfigManager.load();

    // v3 migration adds defaults, v8 migration removes gitPromptDir
    // defaultCmd gets set to 'claude' during v3 migration
    expect(loaded.defaultCmd).toBe('claude');
    expect(loaded.defaultCmdArgs).toEqual([]);
    expect(loaded.defaultCmdOptions).toEqual({
      'Continue with last context?': '--continue'
    });
    expect(loaded.autoReview).toBe(true);
    expect(loaded.autoRun).toBe(false);
    // gitPromptDir is removed in v8 migration
    expect((loaded as any).gitPromptDir).toBeUndefined();
  });

  it('should preserve existing prompt dirs during migration when not default', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts', '/absolute/templates'],
      customField: 'should-remain'
    };
    await fs.writeJson(configPath, oldConfig);

    const loaded = await ConfigManager.load();

    // Absolute paths that aren't the default './.prompts' should be preserved
    expect(loaded.promptDirs).toContain('/absolute/prompts');
    expect(loaded.promptDirs).toContain('/absolute/templates');

    const saved = await fs.readJson(configPath);
    expect(saved.customField).toBe('should-remain');
  });

  it('should not migrate configs already at current version', async () => {
    const currentConfig = {
      promptDirs: ['./prompts'],
      version: '8.0.0',
      defaultCmd: 'my-tool'
    };
    await fs.writeJson(configPath, currentConfig);

    const loaded = await ConfigManager.load();

    expect(loaded.defaultCmd).toBe('my-tool'); // not overridden
    expect(loaded.version).toBe('8.0.0');
  });

  it('should save migrated config back to disk', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts']
    };
    await fs.writeJson(configPath, oldConfig);

    await ConfigManager.load();

    const saved = await fs.readJson(configPath);
    expect(saved.version).toBe('8.0.0');
    // v3 migration adds defaultCmd
    expect(saved.defaultCmd).toBe('claude');
    expect(saved.defaultCmdArgs).toEqual([]);
    expect(saved.defaultCmdOptions).toBeDefined();
  });

  it('should create backup before migration', async () => {
    const oldConfig = {
      promptDirs: ['/absolute/prompts'],
      codingTool: 'claude'
    };
    await fs.writeJson(configPath, oldConfig);

    await ConfigManager.load();

    // Check backup was created
    const backupPath = `${configPath  }.backup`;
    expect(await fs.pathExists(backupPath)).toBe(true);

    const backup = await fs.readJson(backupPath);
    expect(backup.codingTool).toBe('claude');
    expect(backup.version).toBeUndefined();
  });
});
