import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '@/config/config-manager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  const testDir = path.join(os.tmpdir(), 'pt-test-config');
  const originalCwd = process.cwd();

  beforeEach(async () => {
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
    // Check new default fields
    expect(config.defaultCmd).toBe('claude');
    expect(config.defaultCmdArgs).toEqual([]);
    expect(config.defaultCmdOptions).toEqual({
      'Continue with last context?': '--continue'
    });
  });

  it('should load config from .pt-config.json', async () => {
    const testConfig = {
      promptDirs: ['/custom/prompts'],
      historyDir: '/custom/history',
      version: '3.0.0' // Add version to prevent migration
    };
    await fs.writeJson('.pt-config.json', testConfig);

    const config = await ConfigManager.load();

    expect(config.promptDirs).toContain(path.resolve('/custom/prompts'));
    expect(config.historyDir).toBe(path.resolve('/custom/history'));
  });

  it('should load config from .pt-config.yaml', async () => {
    const yamlContent = `
promptDirs:
  - /yaml/prompts
  - ~/prompts
historyDir: ~/.pt/history
version: "2.0.0"
`;
    await fs.writeFile('.pt-config.yaml', yamlContent);

    const config = await ConfigManager.load();
    expect(config.promptDirs).toContain(path.resolve('/yaml/prompts'));
    expect(config.promptDirs).toContain(path.join(os.homedir(), 'prompts'));
    expect(config.historyDir).toBe(path.join(os.homedir(), '.pt/history'));
  });

  it('should merge configs from multiple directories', async () => {
    // Create parent config in test directory
    await fs.writeJson('.pt-config.json', {
      promptDirs: ['/parent/prompts'],
      historyDir: '/parent/history',
      version: '2.0.0'
    });

    // Create child directory and config
    const childDir = 'child';
    await fs.ensureDir(childDir);
    await fs.writeJson(path.join(childDir, '.pt-config.json'), {
      promptDirs: ['/child/prompts'],
      version: '2.0.0'
      // historyDir not specified, should inherit from parent
    });

    // Change to child directory and load config
    process.chdir(childDir);
    const config = await ConfigManager.load();

    // Change back to parent directory
    process.chdir('..');

    expect(config.promptDirs).toContain(path.resolve('/parent/prompts'));
    expect(config.promptDirs).toContain(path.resolve('/child/prompts'));
    expect(config.historyDir).toBe(path.resolve('/parent/history'));
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
      promptDirs: ['./prompts'],
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
});
