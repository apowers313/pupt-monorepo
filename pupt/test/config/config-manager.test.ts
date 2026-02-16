import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '@/config/config-manager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  let testDir: string;
  let dataDir: string;
  let savedEnv: { PUPT_CONFIG_DIR?: string; PUPT_DATA_DIR?: string };

  beforeEach(async () => {
    // Create temp directories and resolve to canonical paths
    const tempDir = path.join(os.tmpdir(), 'pt-test-config-' + Date.now());
    await fs.ensureDir(tempDir);
    testDir = fs.realpathSync(tempDir);

    const tempDataDir = path.join(os.tmpdir(), 'pt-test-data-' + Date.now());
    await fs.ensureDir(tempDataDir);
    dataDir = fs.realpathSync(tempDataDir);

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

    await fs.remove(testDir);
    await fs.remove(dataDir);
  });

  it('should load default config when no config file exists', async () => {
    const config = await ConfigManager.load();
    expect(config.promptDirs).toHaveLength(1);
    // Default prompt dir should use the PUPT_DATA_DIR + /prompts
    expect(config.promptDirs[0]).toBe(path.join(dataDir, 'prompts'));
    expect(config.historyDir).toBeUndefined();
    // Default tool settings are no longer hardcoded - they come from tool detection during init
    expect(config.defaultCmd).toBeUndefined();
    expect(config.defaultCmdArgs).toBeUndefined();
    expect(config.defaultCmdOptions).toBeUndefined();
  });

  it('should load config from config.json in global config dir', async () => {
    const testConfig = {
      promptDirs: ['./custom/prompts'],
      historyDir: './custom/history',
      version: '8.0.0'
    };
    await fs.writeJson(path.join(testDir, 'config.json'), testConfig);

    const config = await ConfigManager.load();

    expect(config.promptDirs).toContain(path.join(testDir, 'custom/prompts'));
    expect(config.historyDir).toBe(path.join(testDir, 'custom/history'));
  });

  it('should load config from config.yaml in global config dir', async () => {
    const yamlContent = `
promptDirs:
  - ./yaml/prompts
  - ~/prompts
historyDir: ~/.pt/history
version: "8.0.0"
`;
    await fs.writeFile(path.join(testDir, 'config.yaml'), yamlContent);

    const config = await ConfigManager.load();
    expect(config.promptDirs).toContain(path.join(testDir, 'yaml/prompts'));
    expect(config.promptDirs).toContain(path.join(os.homedir(), 'prompts'));
    expect(config.historyDir).toBe(path.join(os.homedir(), '.pt/history'));
  });

  it('should expand home directory paths', async () => {
    await fs.writeJson(path.join(testDir, 'config.json'), {
      promptDirs: ['~/prompts'],
      historyDir: '~/.pt/history',
      version: '8.0.0'
    });

    const config = await ConfigManager.load();
    const homeDir = os.homedir();
    expect(config.promptDirs).toContain(path.join(homeDir, 'prompts'));
    expect(config.historyDir).toBe(path.join(homeDir, '.pt/history'));
  });

  it('should load and expand helper configurations', async () => {
    await fs.writeJson(path.join(testDir, 'config.json'), {
      promptDirs: ['./.prompts'],
      helpers: {
        customDate: {
          type: 'inline',
          value: 'return new Date().toISOString()',
        },
        fileContent: {
          type: 'file',
          path: '~/helpers/fileContent.js',
        },
      },
      version: '8.0.0',
    });

    const config = await ConfigManager.load();
    const homeDir = os.homedir();

    expect(config.helpers).toBeDefined();
    expect(config.helpers?.customDate).toEqual({
      type: 'inline',
      value: 'return new Date().toISOString()',
    });
    expect(config.helpers?.fileContent).toEqual({
      type: 'file',
      path: path.join(homeDir, 'helpers/fileContent.js'),
    });
  });

  describe('path resolution relative to config file', () => {
    it('should resolve relative paths from config file directory', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts', '../shared-prompts'],
        historyDir: './.pthistory',
        annotationDir: './annotations',
        version: '8.0.0'
      });

      const result = await ConfigManager.loadWithPath();

      // All paths should be resolved relative to the config file location (testDir)
      expect(result.config.promptDirs).toContain(path.join(testDir, 'prompts'));
      expect(result.config.promptDirs).toContain(path.resolve(testDir, '../shared-prompts'));
      expect(result.config.historyDir).toBe(path.join(testDir, '.pthistory'));
      expect(result.config.annotationDir).toBe(path.join(testDir, 'annotations'));
    });

    it('should handle absolute paths correctly', async () => {
      const absolutePaths = {
        promptDirs: ['/absolute/prompts', path.join(os.homedir(), 'my-prompts')],
        historyDir: '/var/log/pt-history',
        version: '8.0.0'
      };

      await fs.writeJson(path.join(testDir, 'config.json'), absolutePaths);

      const config = await ConfigManager.load();

      // Absolute paths should remain unchanged
      expect(config.promptDirs).toContain('/absolute/prompts');
      expect(config.promptDirs).toContain(path.join(os.homedir(), 'my-prompts'));
      expect(config.historyDir).toBe('/var/log/pt-history');
    });

    it('should resolve helper and extension paths relative to config', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        helpers: {
          myHelper: {
            type: 'file',
            path: './helpers/custom.js'
          }
        },
        version: '8.0.0'
      });

      const config = await ConfigManager.load();

      // Paths should be resolved relative to config file
      expect(config.helpers?.myHelper.path).toBe(path.join(testDir, 'helpers/custom.js'));
    });

    it('should handle mixed relative and absolute paths', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: [
          './local-prompts',
          '/absolute/prompts',
          '~/user-prompts'
        ],
        historyDir: '../shared/.pthistory',
        version: '8.0.0'
      });

      const config = await ConfigManager.load();

      // Relative path resolved from config dir
      expect(config.promptDirs).toContain(path.join(testDir, 'local-prompts'));
      // Absolute path unchanged
      expect(config.promptDirs).toContain('/absolute/prompts');
      // Home path expanded
      expect(config.promptDirs).toContain(path.join(os.homedir(), 'user-prompts'));
      // Relative path with .. resolved from config dir
      expect(config.historyDir).toBe(path.resolve(testDir, '../shared/.pthistory'));
    });
  });

  describe('validation errors', () => {
    it('should throw validation error for invalid config values', async () => {
      // Write a config with an invalid value
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: 'not-an-array', // Should be array
        version: '8.0.0'
      });

      await expect(ConfigManager.load()).rejects.toThrow();
    });
  });

  describe('loadWithPath', () => {
    it('should return filepath and configDir when config exists', async () => {
      await fs.writeJson(path.join(testDir, 'config.json'), {
        promptDirs: ['./prompts'],
        version: '8.0.0'
      });

      const result = await ConfigManager.loadWithPath();

      expect(result.filepath).toBe(path.join(testDir, 'config.json'));
      expect(result.configDir).toBe(testDir);
    });

    it('should return undefined filepath and configDir when no config exists', async () => {
      const result = await ConfigManager.loadWithPath();

      expect(result.filepath).toBeUndefined();
      expect(result.configDir).toBeUndefined();
      // Should still return a valid default config
      expect(result.config.promptDirs).toHaveLength(1);
      expect(result.config.promptDirs[0]).toBe(path.join(dataDir, 'prompts'));
    });
  });

  describe('save', () => {
    it('should save config to the global config path', async () => {
      const config = {
        promptDirs: ['~/my-prompts'],
        version: '8.0.0',
      } as any;

      await ConfigManager.save(config);

      const configPath = path.join(testDir, 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const savedConfig = await fs.readJson(configPath);
      expect(savedConfig.promptDirs).toEqual(['~/my-prompts']);
      expect(savedConfig.version).toBe('8.0.0');
    });

    it('should create the config directory if it does not exist', async () => {
      // Point to a nested directory that does not exist yet
      const nestedDir = path.join(testDir, 'nested', 'config', 'dir');
      process.env.PUPT_CONFIG_DIR = nestedDir;

      const config = {
        promptDirs: ['./prompts'],
        version: '8.0.0',
      } as any;

      await ConfigManager.save(config);

      const configPath = path.join(nestedDir, 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it('should overwrite existing config file', async () => {
      const originalConfig = {
        promptDirs: ['./old-prompts'],
        version: '8.0.0',
      };
      await fs.writeJson(path.join(testDir, 'config.json'), originalConfig);

      const newConfig = {
        promptDirs: ['./new-prompts'],
        historyDir: '~/.pt/history',
        version: '8.0.0',
      } as any;

      await ConfigManager.save(newConfig);

      const savedConfig = await fs.readJson(path.join(testDir, 'config.json'));
      expect(savedConfig.promptDirs).toEqual(['./new-prompts']);
      expect(savedConfig.historyDir).toBe('~/.pt/history');
    });
  });
});
