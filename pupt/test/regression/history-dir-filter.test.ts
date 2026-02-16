/**
 * Regression tests for history directory filtering
 *
 * These tests ensure that the -d/--dir and --all-dir options for pt history
 * continue to work correctly. The feature allows users to filter history by
 * git directory or working directory, which is essential for git worktree support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { historyCommand } from '../../src/commands/history.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';
import * as gitInfo from '../../src/utils/git-info.js';
import chalk from 'chalk';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/utils/logger.js');
vi.mock('../../src/utils/git-info.js');

describe('History Directory Filtering - Regression Tests', () => {
  let loggerSpy: ReturnType<typeof vi.fn>;
  let mockListHistory: ReturnType<typeof vi.fn>;
  let mockGetTotalCount: ReturnType<typeof vi.fn>;

  const mockEntriesWithEnv = [
    {
      timestamp: '2024-01-14T10:00:00.000Z',
      templatePath: '/templates/test1.md',
      finalPrompt: 'Test prompt 1',
      title: 'Test 1',
      templateContent: 'template',
      variables: {},
      filename: '20240114-100000-abc12345.json',
      environment: {
        working_directory: '/home/user/project-a',
        git_dir: '/home/user/project-a/.git',
        os: 'linux'
      }
    },
    {
      timestamp: '2024-01-15T10:00:00.000Z',
      templatePath: '/templates/test2.md',
      finalPrompt: 'Test prompt 2',
      title: 'Test 2',
      templateContent: 'template',
      variables: {},
      filename: '20240115-100000-def12345.json',
      environment: {
        working_directory: '/home/user/project-b',
        git_dir: '/home/user/project-b/.git',
        os: 'linux'
      }
    },
    {
      timestamp: '2024-01-16T10:00:00.000Z',
      templatePath: '/templates/test3.md',
      finalPrompt: 'Test prompt 3',
      title: 'Test 3',
      templateContent: 'template',
      variables: {},
      filename: '20240116-100000-ghi12345.json',
      environment: {
        working_directory: '/home/user/project-a/worktree',
        git_dir: '/home/user/project-a/.git/worktrees/worktree',
        os: 'linux'
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    loggerSpy = vi.mocked(logger.log).mockImplementation(() => {});

    vi.mocked(ConfigManager.load).mockResolvedValue({
      promptDirs: ['./.prompts'],
      historyDir: './.pthistory'
    } as any);

    mockListHistory = vi.fn();
    mockGetTotalCount = vi.fn();

    vi.mocked(HistoryManager).mockImplementation(() => ({
      listHistory: mockListHistory,
      getTotalCount: mockGetTotalCount
    } as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('default filtering behavior', () => {
    it('should filter by current git directory by default with includeLegacy', async () => {
      const currentGitDir = '/home/user/project-a/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        branch: 'main',
        commit: 'abc123',
        isDirty: false,
        gitDir: currentGitDir
      });

      // Return only entries matching the git directory
      mockListHistory.mockImplementation(async (_limit, filterOptions) => {
        if (filterOptions?.gitDir === currentGitDir) {
          return mockEntriesWithEnv.filter(
            e => e.environment.git_dir === currentGitDir
          );
        }
        return mockEntriesWithEnv;
      });

      mockGetTotalCount.mockImplementation(async (filterOptions) => {
        if (filterOptions?.gitDir === currentGitDir) {
          return mockEntriesWithEnv.filter(
            e => e.environment.git_dir === currentGitDir
          ).length;
        }
        return mockEntriesWithEnv.length;
      });

      await historyCommand({});

      // Should have called listHistory with filter options including includeLegacy: true
      expect(mockListHistory).toHaveBeenCalledWith(
        20,
        expect.objectContaining({ gitDir: currentGitDir, includeLegacy: true })
      );

      // Should show filtered message in header
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('filtered by')
      );
    });

    it('should filter by working directory when not in a git repo with includeLegacy', async () => {
      const cwd = process.cwd();

      // Not in a git repo
      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({});

      mockListHistory.mockImplementation(async (_limit, filterOptions) => {
        if (filterOptions?.workingDir === cwd) {
          return [];
        }
        return mockEntriesWithEnv;
      });

      mockGetTotalCount.mockResolvedValue(0);

      await historyCommand({});

      // Should have called listHistory with workingDir filter and includeLegacy: true
      expect(mockListHistory).toHaveBeenCalledWith(
        20,
        expect.objectContaining({ workingDir: cwd, includeLegacy: true })
      );
    });
  });

  describe('--dir option', () => {
    it('should filter by specified directory path without includeLegacy', async () => {
      const specifiedDir = '/home/user/project-b/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: '/home/user/other-project/.git'
      });

      mockListHistory.mockImplementation(async (_limit, filterOptions) => {
        if (filterOptions?.gitDir === specifiedDir || filterOptions?.workingDir === specifiedDir) {
          return mockEntriesWithEnv.filter(
            e => e.environment.git_dir === specifiedDir ||
                 e.environment.working_directory === specifiedDir
          );
        }
        return mockEntriesWithEnv;
      });

      mockGetTotalCount.mockImplementation(async (filterOptions) => {
        if (filterOptions?.gitDir === specifiedDir || filterOptions?.workingDir === specifiedDir) {
          return mockEntriesWithEnv.filter(
            e => e.environment.git_dir === specifiedDir ||
                 e.environment.working_directory === specifiedDir
          ).length;
        }
        return mockEntriesWithEnv.length;
      });

      await historyCommand({ dir: specifiedDir });

      // Should have called listHistory with the specified directory and includeLegacy: false
      expect(mockListHistory).toHaveBeenCalledWith(
        20,
        expect.objectContaining({
          gitDir: specifiedDir,
          workingDir: specifiedDir,
          includeLegacy: false
        })
      );
    });
  });

  describe('--all-dir option', () => {
    it('should show all history without filtering when --all-dir is specified', async () => {
      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: '/home/user/project-a/.git'
      });

      mockListHistory.mockResolvedValue(mockEntriesWithEnv);
      mockGetTotalCount.mockResolvedValue(mockEntriesWithEnv.length);

      await historyCommand({ allDir: true });

      // Should have called listHistory WITHOUT filter options
      expect(mockListHistory).toHaveBeenCalledWith(20, undefined);

      // Should show "all directories" message in header
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('all directories')
      );
    });

    it('should override git directory detection when --all-dir is specified', async () => {
      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: '/home/user/project-a/.git'
      });

      mockListHistory.mockResolvedValue(mockEntriesWithEnv);
      mockGetTotalCount.mockResolvedValue(mockEntriesWithEnv.length);

      await historyCommand({ allDir: true });

      // getGitInfo might still be called, but filter should not be applied
      expect(mockListHistory).toHaveBeenCalledWith(20, undefined);
      expect(mockGetTotalCount).toHaveBeenCalledWith(undefined);
    });
  });

  describe('empty results with filtering', () => {
    it('should show helpful message when no history found with directory filter', async () => {
      const gitDir = '/home/user/new-project/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir
      });

      mockListHistory.mockResolvedValue([]);
      mockGetTotalCount.mockResolvedValue(0);

      // Note: default behavior includes includeLegacy: true
      await historyCommand({});

      // Should show filtered "no history" message
      expect(loggerSpy).toHaveBeenCalledWith(
        chalk.yellow('📋 No history found for this directory')
      );

      // Should show the filter path
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(gitDir)
      );

      // Should suggest using --all-dir
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('--all-dir')
      );
    });

    it('should show generic message when no history found with --all-dir', async () => {
      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({});

      mockListHistory.mockResolvedValue([]);
      mockGetTotalCount.mockResolvedValue(0);

      await historyCommand({ allDir: true });

      // Should show generic "no history" message
      expect(loggerSpy).toHaveBeenCalledWith(
        chalk.yellow('📋 No history found')
      );

      // Should NOT mention --all-dir since it's already being used
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const mentionsAllDir = calls.some(call =>
        typeof call === 'string' && call.includes('--all-dir')
      );
      expect(mentionsAllDir).toBe(false);
    });
  });

  describe('interaction with other options', () => {
    it('should respect --limit with directory filtering', async () => {
      const gitDir = '/home/user/project-a/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({ gitDir });

      mockListHistory.mockResolvedValue([mockEntriesWithEnv[0]]);
      mockGetTotalCount.mockResolvedValue(1);

      await historyCommand({ limit: 5 });

      expect(mockListHistory).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ gitDir, includeLegacy: true })
      );
    });

    it('should respect --all with directory filtering', async () => {
      const gitDir = '/home/user/project-a/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({ gitDir });

      mockListHistory.mockResolvedValue([mockEntriesWithEnv[0]]);
      mockGetTotalCount.mockResolvedValue(1);

      await historyCommand({ all: true });

      // --all means no limit
      expect(mockListHistory).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ gitDir, includeLegacy: true })
      );
    });

    it('should allow --all-dir with --limit', async () => {
      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: '/home/user/project/.git'
      });

      mockListHistory.mockResolvedValue(mockEntriesWithEnv);
      mockGetTotalCount.mockResolvedValue(mockEntriesWithEnv.length);

      await historyCommand({ allDir: true, limit: 10 });

      expect(mockListHistory).toHaveBeenCalledWith(10, undefined);
    });
  });
});
