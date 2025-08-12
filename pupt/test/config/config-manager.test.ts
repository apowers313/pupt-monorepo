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
    // Normalize the testDir path to handle macOS /private prefix
    const normalizedTestDir = fs.existsSync(testDir) ? fs.realpathSync(testDir) : testDir;
    expect(config.promptDirs[0]).toBe(path.join(normalizedTestDir, 'prompts'));
    expect(config.historyDir).toBeUndefined();
  });

  it('should load config from .ptrc.json', async () => {
    const testConfig = {
      promptDirs: ['/custom/prompts'],
      historyDir: '/custom/history',
    };
    await fs.writeJson('.ptrc.json', testConfig);

    const config = await ConfigManager.load();

    expect(config.promptDirs).toHaveLength(1);
    expect(config.promptDirs[0]).toBe('/custom/prompts');
    expect(config.historyDir).toBe('/custom/history');
  });

  it('should load config from .ptrc.yaml', async () => {
    const yamlContent = `
promptDirs:
  - /yaml/prompts
  - ~/prompts
historyDir: ~/.pt/history
`;
    await fs.writeFile('.ptrc.yaml', yamlContent);

    const config = await ConfigManager.load();
    expect(config.promptDirs).toHaveLength(2);
    expect(config.promptDirs[0]).toBe('/yaml/prompts');
    expect(config.promptDirs[1]).toBe(path.join(os.homedir(), 'prompts'));
    expect(config.historyDir).toBe(path.join(os.homedir(), '.pt/history'));
  });

  it('should merge configs from multiple directories', async () => {
    // Create parent config in test directory
    await fs.writeJson('.ptrc.json', {
      promptDirs: ['/parent/prompts'],
      historyDir: '/parent/history',
    });

    // Create child directory and config
    const childDir = 'child';
    await fs.ensureDir(childDir);
    await fs.writeJson(path.join(childDir, '.ptrc.json'), {
      promptDirs: ['/child/prompts'],
      // historyDir not specified, should inherit from parent
    });

    // Change to child directory and load config
    process.chdir(childDir);
    const config = await ConfigManager.load();

    // Change back to parent directory
    process.chdir('..');

    expect(config.promptDirs).toHaveLength(2);
    expect(config.promptDirs).toContain('/parent/prompts');
    expect(config.promptDirs).toContain('/child/prompts');
    expect(config.historyDir).toBe('/parent/history');
  });

  it('should expand home directory paths', async () => {
    await fs.writeJson('.ptrc.json', {
      promptDirs: ['~/prompts'],
      historyDir: '~/.pt/history',
    });

    const config = await ConfigManager.load();
    const homeDir = os.homedir();
    expect(config.promptDirs[0]).toBe(path.join(homeDir, 'prompts'));
    expect(config.historyDir).toBe(path.join(homeDir, '.pt/history'));
  });

  it('should load and expand helper configurations', async () => {
    await fs.writeJson('.ptrc.json', {
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
