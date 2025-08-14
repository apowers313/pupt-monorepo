import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../src/config/config-manager.js';
import { Config } from '../../src/types/config.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Config Schema Validation', () => {
  const testDir = path.join(os.tmpdir(), 'pt-config-schema-test');
  const configPath = path.join(testDir, '.ptrc.json');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('new optional fields', () => {
    it('should accept valid historyDir', async () => {
      const config = {
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.historyDir).toBe(path.resolve('./.pthistory'));
    });

    it('should accept valid annotationDir', async () => {
      const config = {
        promptDirs: ['./prompts'],
        annotationDir: './.ptannotations'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.annotationDir).toBe(path.resolve('./.ptannotations'));
    });

    it('should accept valid codingTool', async () => {
      const config = {
        promptDirs: ['./prompts'],
        codingTool: 'claude'
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.codingTool).toBe('claude');
    });

    it('should accept valid codingToolArgs', async () => {
      const config = {
        promptDirs: ['./prompts'],
        codingToolArgs: ['--model', 'sonnet']
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.codingToolArgs).toEqual(['--model', 'sonnet']);
    });

    it('should accept valid codingToolOptions', async () => {
      const config = {
        promptDirs: ['./prompts'],
        codingToolOptions: {
          'Continue with last context?': '--continue',
          'Enable web search?': '--web'
        }
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.codingToolOptions).toEqual({
        'Continue with last context?': '--continue',
        'Enable web search?': '--web'
      });
    });
  });

  describe('backward compatibility', () => {
    it('should work with configs missing new fields', async () => {
      const oldConfig = {
        promptDirs: ['./prompts']
      };
      await fs.writeJson(configPath, oldConfig);
      
      const loaded = await ConfigManager.load();
      expect(loaded.promptDirs).toContain(path.resolve('./prompts'));
      // historyDir might come from parent config, so just check it's a string or undefined
      expect(typeof loaded.historyDir === 'string' || loaded.historyDir === undefined).toBe(true);
      // annotationDir might come from parent config
      expect(typeof loaded.annotationDir === 'string' || loaded.annotationDir === undefined).toBe(true);
      // These get defaults from migration
      expect(loaded.codingTool).toBe('claude');
      expect(loaded.codingToolArgs).toEqual([]);
      expect(loaded.codingToolOptions).toEqual({
        'Continue with last context?': '--continue'
      });
    });

    it('should preserve existing fields when loading old configs', async () => {
      const oldConfig = {
        promptDirs: ['./prompts', './templates'],
        someCustomField: 'value'
      };
      await fs.writeJson(configPath, oldConfig);
      
      const loaded = await ConfigManager.load();
      expect(loaded.promptDirs).toContain(path.resolve('./prompts'));
      expect(loaded.promptDirs).toContain(path.resolve('./templates'));
    });
  });

  describe('field type validation', () => {
    it('should reject invalid historyDir type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        historyDir: 123 // should be string
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration error: 'historyDir' must be a string");
    });

    it('should reject invalid codingToolArgs type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        codingToolArgs: 'not-an-array' // should be array
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration error: 'codingToolArgs' must be an array");
    });

    it('should reject invalid codingToolOptions type', async () => {
      const config = {
        promptDirs: ['./prompts'],
        codingToolOptions: 'not-an-object' // should be object
      };
      await fs.writeJson(configPath, config);
      
      await expect(ConfigManager.load()).rejects.toThrow("Configuration error: 'codingToolOptions' must be an object");
    });
  });

  describe('default values', () => {
    it('should apply default values when creating new config', async () => {
      // No config file exists
      const loaded = await ConfigManager.load();
      
      expect(loaded.promptDirs).toContain(path.join(os.homedir(), '.pt/prompts'));
      expect(loaded.codingTool).toBe('claude');
      expect(loaded.codingToolArgs).toEqual([]);
      expect(loaded.codingToolOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(loaded.version).toBe('2.0.0');
    });

    it('should not override existing values with defaults', async () => {
      const config = {
        promptDirs: ['./my-prompts'],
        codingTool: 'gpt',
        codingToolArgs: ['--custom'],
        codingToolOptions: {
          'My option?': '--my-flag'
        }
      };
      await fs.writeJson(configPath, config);
      
      const loaded = await ConfigManager.load();
      expect(loaded.codingTool).toBe('gpt');
      expect(loaded.codingToolArgs).toEqual(['--custom']);
      expect(loaded.codingToolOptions).toEqual({
        'My option?': '--my-flag'
      });
    });
  });
});

describe('Config Migration', () => {
  const testDir = path.join(os.tmpdir(), 'pt-config-migration-test');
  const configPath = path.join(testDir, '.ptrc.json');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should detect old config version', async () => {
    const oldConfig = {
      promptDirs: ['./prompts']
      // no version field
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    expect(loaded.version).toBe('2.0.0');
  });

  it('should add version to configs without it', async () => {
    const oldConfig = {
      promptDirs: ['./prompts']
    };
    await fs.writeJson(configPath, oldConfig);
    
    await ConfigManager.load();
    
    const saved = await fs.readJson(configPath);
    expect(saved.version).toBe('2.0.0');
  });

  it('should add new default fields during migration', async () => {
    const oldConfig = {
      promptDirs: ['./prompts']
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    
    expect(loaded.codingTool).toBe('claude');
    expect(loaded.codingToolArgs).toEqual([]);
    expect(loaded.codingToolOptions).toEqual({
      'Continue with last context?': '--continue'
    });
  });

  it('should preserve existing fields during migration', async () => {
    const oldConfig = {
      promptDirs: ['./prompts', './templates'],
      customField: 'should-remain'
    };
    await fs.writeJson(configPath, oldConfig);
    
    const loaded = await ConfigManager.load();
    
    expect(loaded.promptDirs).toContain(path.resolve('./prompts'));
    expect(loaded.promptDirs).toContain(path.resolve('./templates'));
    
    const saved = await fs.readJson(configPath);
    expect(saved.customField).toBe('should-remain');
  });

  it('should not migrate configs already at current version', async () => {
    const currentConfig = {
      promptDirs: ['./prompts'],
      version: '2.0.0',
      codingTool: 'my-tool'
    };
    await fs.writeJson(configPath, currentConfig);
    
    const loaded = await ConfigManager.load();
    
    expect(loaded.codingTool).toBe('my-tool'); // not overridden
    expect(loaded.version).toBe('2.0.0');
  });

  it('should save migrated config back to disk', async () => {
    const oldConfig = {
      promptDirs: ['./prompts']
    };
    await fs.writeJson(configPath, oldConfig);
    
    await ConfigManager.load();
    
    const saved = await fs.readJson(configPath);
    expect(saved.version).toBe('2.0.0');
    expect(saved.codingTool).toBe('claude');
    expect(saved.codingToolArgs).toEqual([]);
    expect(saved.codingToolOptions).toBeDefined();
  });
});