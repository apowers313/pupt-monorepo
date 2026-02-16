import * as inquirer from '@inquirer/prompts';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryManager } from '../../src/history/history-manager';

// Mock simple-git
vi.mock('simple-git');
// Mock inquirer
vi.mock('@inquirer/prompts');

// Mock tool detection (init uses it)
vi.mock('../../src/utils/tool-detection.js', () => ({
  detectInstalledTools: vi.fn(() => []),
  getToolByName: vi.fn(),
  getToolByCommand: vi.fn(),
  isInteractiveTUI: vi.fn(() => false),
  SUPPORTED_TOOLS: [],
}));

describe('Minor Enhancements - Integration Tests', () => {
  let tempDir: string;
  let configDir: string;
  let dataDir: string;
  let mockGit: SimpleGit;
  let savedEnv: { PUPT_CONFIG_DIR?: string; PUPT_DATA_DIR?: string; PUPT_CACHE_DIR?: string };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-minor-enhancements-'));
    configDir = path.join(tempDir, 'config');
    dataDir = path.join(tempDir, 'data');
    await fs.ensureDir(configDir);
    await fs.ensureDir(dataDir);

    // Save and set env vars so global-paths resolves to our temp dirs
    savedEnv = {
      PUPT_CONFIG_DIR: process.env.PUPT_CONFIG_DIR,
      PUPT_DATA_DIR: process.env.PUPT_DATA_DIR,
      PUPT_CACHE_DIR: process.env.PUPT_CACHE_DIR,
    };
    process.env.PUPT_CONFIG_DIR = configDir;
    process.env.PUPT_DATA_DIR = dataDir;
    process.env.PUPT_CACHE_DIR = path.join(tempDir, 'cache');

    // Setup mock git
    mockGit = {
      checkIsRepo: vi.fn(),
      clone: vi.fn(),
      revparse: vi.fn()
    } as any;

    vi.mocked(simpleGit).mockReturnValue(mockGit);
  });

  afterEach(async () => {
    // Restore env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await fs.remove(tempDir);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Timestamp Formatting with Local Timezone', () => {
    it('should create history files with local timezone in filename', async () => {
      const historyDir = path.join(tempDir, '.pthistory');
      const historyManager = new HistoryManager(historyDir);

      // Mock a specific date/time
      const mockDate = new Date('2024-03-15T10:30:45.123Z');
      vi.setSystemTime(mockDate);

      // Save a prompt
      const filename = await historyManager.savePrompt({
        templatePath: 'test.md',
        templateContent: 'Test content',
        variables: new Map([['test', 'value']]),
        finalPrompt: 'Test prompt',
        title: 'Test Entry'
      });

      // Verify filename format uses local time
      expect(filename).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);

      // Verify file exists
      const filePath = path.join(historyDir, filename);
      expect(await fs.pathExists(filePath)).toBe(true);

      // Verify content has ISO timestamp
      const content = await fs.readJson(filePath);
      expect(content.timestamp).toBe('2024-03-15T10:30:45.123Z');
    });

    it('should list history entries sorted by local time filenames', async () => {
      const historyDir = path.join(tempDir, '.pthistory');
      const historyManager = new HistoryManager(historyDir);

      // Create multiple entries at different times
      const dates = [
        new Date('2024-03-15T08:00:00.000Z'),
        new Date('2024-03-15T12:00:00.000Z'),
        new Date('2024-03-15T16:00:00.000Z')
      ];

      const filenames: string[] = [];
      for (const date of dates) {
        vi.setSystemTime(date);
        const filename = await historyManager.savePrompt({
          templatePath: 'test.md',
          templateContent: 'Test content',
          variables: new Map(),
          finalPrompt: `Test prompt at ${date.toISOString()}`,
          title: `Entry at ${date.toISOString()}`
        });
        filenames.push(filename);
      }

      // List history
      const entries = await historyManager.listHistory();

      // Should be sorted oldest first
      expect(entries).toHaveLength(3);
      expect(entries[0].title).toContain('08:00:00');
      expect(entries[1].title).toContain('12:00:00');
      expect(entries[2].title).toContain('16:00:00');
    });
  });

  describe('Global Config Integration', () => {
    it('should create config in global config directory during init', async () => {
      const { initCommand } = await import('../../src/commands/init');

      // Mock user inputs for the new init flow
      vi.mocked(inquirer.input).mockResolvedValueOnce(path.join(dataDir, 'prompts')); // prompt dir
      vi.mocked(inquirer.confirm).mockResolvedValueOnce(true);  // enable output capture

      await initCommand();

      // Check config was created in the global config dir
      const configPath = path.join(configDir, 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      // Check content
      const content = await fs.readJson(configPath);
      expect(content.version).toBe('8.0.0');
      expect(content.promptDirs).toBeDefined();
      expect(content.libraries).toEqual([]);
    });

    it('should not create .gitignore in init (global config)', async () => {
      const { initCommand } = await import('../../src/commands/init');

      // Mock git repo
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);

      // Mock user inputs for the new init flow
      vi.mocked(inquirer.input).mockResolvedValueOnce(path.join(dataDir, 'prompts')); // prompt dir
      vi.mocked(inquirer.confirm).mockResolvedValueOnce(true);  // enable output capture

      await initCommand();

      // Check .gitignore was NOT created (init no longer touches .gitignore)
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(false);
    });

    it('should install prompts to global data directory', async () => {
      const { installFromGit } = await import('../../src/commands/install');

      // Write initial config
      await fs.writeJson(path.join(configDir, 'config.json'), {
        version: '8.0.0',
        promptDirs: [path.join(dataDir, 'prompts')],
        libraries: [],
      });

      // Mock git operations
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      vi.mocked(mockGit.clone).mockImplementation(async (_url, dest) => {
        // Create the destination directory to simulate a successful clone
        await fs.ensureDir(dest as string);
        // Create a prompts directory in the cloned repo
        const promptsDir = path.join(dest as string, 'prompts');
        await fs.ensureDir(promptsDir);
        return undefined as any;
      });

      await installFromGit('https://github.com/user/test-repo', mockGit);

      // Verify clone was called with a path inside data dir
      expect(mockGit.clone).toHaveBeenCalled();
      const clonePath = vi.mocked(mockGit.clone).mock.calls[0][1] as string;
      expect(clonePath).toContain(path.join(dataDir, 'libraries'));
    });

    it('should preserve existing config content on install', async () => {
      const { installFromGit } = await import('../../src/commands/install');

      // Write initial config with custom settings
      const initialConfig = {
        version: '8.0.0',
        promptDirs: [path.join(dataDir, 'prompts')],
        defaultCmd: 'claude',
        autoRun: true,
        libraries: [],
      };
      await fs.writeJson(path.join(configDir, 'config.json'), initialConfig);

      // Mock git operations
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      vi.mocked(mockGit.clone).mockImplementation(async (_url, dest) => {
        await fs.ensureDir(dest as string);
        const promptsDir = path.join(dest as string, 'prompts');
        await fs.ensureDir(promptsDir);
        return undefined as any;
      });

      await installFromGit('https://github.com/user/test-repo', mockGit);

      // Verify config preserved existing settings
      const updatedConfig = await fs.readJson(path.join(configDir, 'config.json'));
      expect(updatedConfig.defaultCmd).toBe('claude');
      expect(updatedConfig.autoRun).toBe(true);
      // Should have the new prompt dir added
      expect(updatedConfig.promptDirs.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle absolute prompt paths correctly in config', async () => {
      const { initCommand } = await import('../../src/commands/init');

      const absolutePromptDir = path.join(tempDir, 'custom-prompts');

      // Mock user inputs
      vi.mocked(inquirer.input).mockResolvedValueOnce(absolutePromptDir); // absolute prompt dir
      vi.mocked(inquirer.confirm).mockResolvedValueOnce(false);  // no output capture

      await initCommand();

      // Check config
      const configPath = path.join(configDir, 'config.json');
      const content = await fs.readJson(configPath);
      expect(content.promptDirs).toContain(absolutePromptDir);
    });
  });
});
