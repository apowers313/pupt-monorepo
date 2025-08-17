import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import simpleGit, { SimpleGit } from 'simple-git';
import { initCommand } from '../../src/commands/init';
import { installFromGit } from '../../src/commands/install';
import { HistoryManager } from '../../src/history/history-manager';
import * as inquirer from '@inquirer/prompts';

// Mock simple-git
vi.mock('simple-git');
// Mock inquirer
vi.mock('@inquirer/prompts');

describe('Minor Enhancements - Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let mockGit: SimpleGit;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-minor-enhancements-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    // Setup mock git
    mockGit = {
      checkIsRepo: vi.fn(),
      clone: vi.fn(),
      revparse: vi.fn()
    } as any;
    
    vi.mocked(simpleGit).mockReturnValue(mockGit);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
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

  describe('.gitignore Integration', () => {
    it('should add entries to .gitignore during init in git repository', async () => {
      // Mock git repo check
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      
      // Mock user inputs
      vi.mocked(inquirer.input).mockResolvedValueOnce('./prompts'); // prompt dir
      vi.mocked(inquirer.confirm)
        .mockResolvedValueOnce(true)  // enable history
        .mockResolvedValueOnce(true); // enable annotations
      vi.mocked(inquirer.input).mockResolvedValueOnce('./.pthistory'); // history dir
      vi.mocked(inquirer.input).mockResolvedValueOnce('./.pthistory'); // annotation dir
      
      await initCommand();
      
      // Check .gitignore was created
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(true);
      
      // Check content
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# Prompt Tool');
      expect(content).toContain('.pt-config.json.backup');
      expect(content).toContain('.pthistory');
      expect(content).toContain('.git-prompts');
    });

    it('should not create .gitignore in non-git directory', async () => {
      // Mock non-git repo
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(false);
      
      // Mock user inputs
      vi.mocked(inquirer.input).mockResolvedValueOnce('./prompts');
      vi.mocked(inquirer.confirm)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false); // no history
      
      await initCommand();
      
      // Check .gitignore was NOT created
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(false);
    });

    it('should add git prompts directory to .gitignore during install', async () => {
      // Setup config
      const config = {
        promptDirs: ['./prompts'],
        gitPromptDir: '.git-prompts',
        defaultCmd: 'echo',
        defaultCmdArgs: ['{{prompt}}']
      };
      await fs.writeJson('.pt-config.json', config);
      
      // Mock git operations
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      vi.mocked(mockGit.clone).mockResolvedValue(undefined as any);
      
      await installFromGit('https://github.com/user/test-repo', mockGit);
      
      // Check .gitignore
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(true);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# Prompt Tool');
      expect(content).toContain('.git-prompts');
    });

    it('should preserve existing .gitignore content', async () => {
      // Create existing .gitignore
      const existingContent = 'node_modules/\n*.log\n.env\n';
      await fs.writeFile('.gitignore', existingContent);
      
      // Mock git repo
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      
      // Mock user inputs for init
      vi.mocked(inquirer.input).mockResolvedValueOnce('./prompts');
      vi.mocked(inquirer.confirm)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      vi.mocked(inquirer.input).mockResolvedValueOnce('./.pthistory');
      
      await initCommand();
      
      // Check content preserved and new entries added
      const content = await fs.readFile('.gitignore', 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('*.log');
      expect(content).toContain('.env');
      expect(content).toContain('# Prompt Tool');
      expect(content).toContain('.pthistory');
    });

    it('should handle absolute paths correctly (not added to gitignore)', async () => {
      // Mock git repo
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      
      // Mock user inputs with absolute path
      vi.mocked(inquirer.input).mockResolvedValueOnce('./prompts');
      vi.mocked(inquirer.confirm)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      vi.mocked(inquirer.input).mockResolvedValueOnce('/var/log/pthistory'); // absolute path
      
      await initCommand();
      
      // Check .gitignore
      const content = await fs.readFile('.gitignore', 'utf-8');
      expect(content).not.toContain('/var/log/pthistory');
      expect(content).toContain('.pt-config.json.backup'); // Should still have other entries
    });

    it('should handle home directory paths correctly (not added to gitignore)', async () => {
      // Mock git repo
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      
      // Mock user inputs with home path
      vi.mocked(inquirer.input).mockResolvedValueOnce('./prompts');
      vi.mocked(inquirer.confirm)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      vi.mocked(inquirer.input).mockResolvedValueOnce('~/.pthistory'); // home path
      
      await initCommand();
      
      // Check .gitignore
      const content = await fs.readFile('.gitignore', 'utf-8');
      expect(content).not.toContain('~/.pthistory');
      expect(content).toContain('.pt-config.json.backup'); // Should still have other entries
    });
  });
});