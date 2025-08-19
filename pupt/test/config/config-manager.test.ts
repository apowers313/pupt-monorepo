import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '@/config/config-manager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'pt-test-config-' + Date.now());
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  it('should load default config when no config file exists', async () => {
    const config = await ConfigManager.load();
    expect(config.promptDirs).toHaveLength(1);
    // When no config exists, it should use default path
    expect(config.promptDirs[0]).toBe(path.join(os.homedir(), '.pt/prompts'));
    expect(config.historyDir).toBeUndefined();
    // Default tool settings are no longer hardcoded - they come from tool detection during init
    expect(config.defaultCmd).toBeUndefined();
    expect(config.defaultCmdArgs).toBeUndefined();
    expect(config.defaultCmdOptions).toBeUndefined();
  });

  it('should load config from .pt-config.json', async () => {
    const testConfig = {
      promptDirs: ['./custom/prompts'],
      historyDir: './custom/history',
      version: '3.0.0' // Add version to prevent migration
    };
    await fs.writeJson('.pt-config.json', testConfig);

    const config = await ConfigManager.load();

    expect(config.promptDirs).toContain(path.join(testDir, 'custom/prompts'));
    expect(config.historyDir).toBe(path.join(testDir, 'custom/history'));
  });

  it('should load config from .pt-config.yaml', async () => {
    const yamlContent = `
promptDirs:
  - ./yaml/prompts
  - ~/prompts
historyDir: ~/.pt/history
version: "2.0.0"
`;
    await fs.writeFile('.pt-config.yaml', yamlContent);

    const config = await ConfigManager.load();
    expect(config.promptDirs).toContain(path.join(testDir, 'yaml/prompts'));
    expect(config.promptDirs).toContain(path.join(os.homedir(), 'prompts'));
    expect(config.historyDir).toBe(path.join(os.homedir(), '.pt/history'));
  });

  it('should use nearest config file when multiple exist in hierarchy', async () => {
    // Create parent config in test directory
    await fs.writeJson('.pt-config.json', {
      promptDirs: ['/parent/prompts'],
      historyDir: '/parent/history',
      version: '3.0.0'
    });

    // Create child directory and config
    const childDir = 'child';
    await fs.ensureDir(childDir);
    await fs.writeJson(path.join(childDir, '.pt-config.json'), {
      promptDirs: ['./prompts'],
      historyDir: './history',
      version: '3.0.0'
    });

    // Change to child directory and load config
    process.chdir(childDir);
    const config = await ConfigManager.load();

    // Change back to parent directory
    process.chdir('..');

    // Should only use the child config (nearest one)
    expect(config.promptDirs).toHaveLength(1);
    expect(config.promptDirs).toContain(path.join(testDir, childDir, 'prompts'));
    expect(config.historyDir).toBe(path.join(testDir, childDir, 'history'));
  });

  it('should expand home directory paths', async () => {
    await fs.writeJson('.pt-config.json', {
      promptDirs: ['~/prompts'],
      historyDir: '~/.pt/history',
      version: '2.0.0'
    });

    const config = await ConfigManager.load();
    const homeDir = os.homedir();
    expect(config.promptDirs).toContain(path.join(homeDir, 'prompts'));
    expect(config.historyDir).toBe(path.join(homeDir, '.pt/history'));
  });

  it('should load and expand helper configurations', async () => {
    await fs.writeJson('.pt-config.json', {
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

  describe('parent directory search', () => {
    it('should find config in parent directory when no config in current directory', async () => {
      // Create config in parent directory
      await fs.writeJson('.pt-config.json', {
        promptDirs: ['./prompts'],
        historyDir: './.pthistory',
        version: '3.0.0'
      });

      // Create subdirectory
      const subDir = path.join(testDir, 'subdir', 'nested');
      await fs.ensureDir(subDir);

      // Change to subdirectory (no config here)
      process.chdir(subDir);

      const result = await ConfigManager.loadWithPath();
      
      // Config should be found in parent directory
      expect(result.filepath).toBe(path.join(testDir, '.pt-config.json'));
      expect(result.configDir).toBe(testDir);
      
      // Paths should be resolved relative to config file location
      expect(result.config.promptDirs).toContain(path.join(testDir, 'prompts'));
      expect(result.config.historyDir).toBe(path.join(testDir, '.pthistory'));
    });

    it('should search up to home directory for config', async () => {
      // Create a deep directory structure
      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd', 'e');
      await fs.ensureDir(deepDir);

      // Put config at the top level
      await fs.writeJson(path.join(testDir, '.pt-config.json'), {
        promptDirs: ['./prompts'],
        version: '3.0.0'
      });

      // Change to deep directory
      process.chdir(deepDir);

      const config = await ConfigManager.load();
      
      // Should find config at top level
      expect(config.promptDirs).toContain(path.join(testDir, 'prompts'));
    });

    it('should stop searching at home directory', async () => {
      // This test would require changing HOME which can be problematic
      // So we'll test that it uses defaults when no config is found
      const noConfigDir = path.join(testDir, 'no-config-here');
      await fs.ensureDir(noConfigDir);
      process.chdir(noConfigDir);

      const config = await ConfigManager.load();
      
      // Should use default config
      expect(config.promptDirs).toHaveLength(1);
      expect(config.promptDirs[0]).toBe(path.join(os.homedir(), '.pt/prompts'));
    });
  });

  describe('path resolution relative to config file', () => {
    it('should resolve relative paths from config file directory', async () => {
      // Create config in parent directory with relative paths
      await fs.writeJson('.pt-config.json', {
        promptDirs: ['./prompts', '../shared-prompts'],
        historyDir: './.pthistory',
        annotationDir: './annotations',
        gitPromptDir: './.git-prompts',
        version: '3.0.0'
      });

      // Create subdirectory
      const subDir = path.join(testDir, 'project', 'src');
      await fs.ensureDir(subDir);
      
      // Change to subdirectory
      process.chdir(subDir);

      const result = await ConfigManager.loadWithPath();
      
      // All paths should be resolved relative to the config file location (testDir)
      expect(result.config.promptDirs).toContain(path.join(testDir, 'prompts'));
      expect(result.config.promptDirs).toContain(path.resolve(testDir, '../shared-prompts'));
      expect(result.config.historyDir).toBe(path.join(testDir, '.pthistory'));
      expect(result.config.annotationDir).toBe(path.join(testDir, 'annotations'));
      expect(result.config.gitPromptDir).toBe(path.join(testDir, '.git-prompts'));
    });

    it('should handle absolute paths correctly', async () => {
      const absolutePaths = {
        promptDirs: ['/absolute/prompts', path.join(os.homedir(), 'my-prompts')],
        historyDir: '/var/log/pt-history',
        version: '3.0.0'
      };

      await fs.writeJson('.pt-config.json', absolutePaths);

      const config = await ConfigManager.load();
      
      // Absolute paths should remain unchanged
      expect(config.promptDirs).toContain('/absolute/prompts');
      expect(config.promptDirs).toContain(path.join(os.homedir(), 'my-prompts'));
      expect(config.historyDir).toBe('/var/log/pt-history');
    });

    it('should resolve helper and extension paths relative to config', async () => {
      await fs.writeJson('.pt-config.json', {
        promptDirs: ['./prompts'], // Add required field
        helpers: {
          myHelper: {
            type: 'file',
            path: './helpers/custom.js'
          }
        },
        handlebarsExtensions: [{
          type: 'file',
          path: './extensions/ext.js'
        }],
        version: '3.0.0'
      });

      // Create subdirectory
      const subDir = path.join(testDir, 'sub');
      await fs.ensureDir(subDir);
      process.chdir(subDir);

      const config = await ConfigManager.load();
      
      // Paths should be resolved relative to config file
      expect(config.helpers?.myHelper.path).toBe(path.join(testDir, 'helpers/custom.js'));
      expect(config.handlebarsExtensions?.[0].path).toBe(path.join(testDir, 'extensions/ext.js'));
    });

    it('should handle mixed relative and absolute paths', async () => {
      await fs.writeJson('.pt-config.json', {
        promptDirs: [
          './local-prompts',
          '/absolute/prompts',
          '~/user-prompts'
        ],
        historyDir: '../shared/.pthistory',
        version: '3.0.0'
      });

      const subDir = path.join(testDir, 'project');
      await fs.ensureDir(subDir);
      process.chdir(subDir);

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
});
