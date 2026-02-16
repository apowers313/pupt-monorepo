/**
 * Regression tests for backwards compatibility with legacy history entries
 *
 * Legacy history entries (created before git_dir tracking was added) don't have
 * the environment.git_dir field. These entries should be treated as belonging
 * to the current directory when using the default filter behavior.
 *
 * This ensures users don't lose access to their existing history when upgrading.
 */

import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { historyCommand } from '../../src/commands/history.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import * as gitInfo from '../../src/utils/git-info.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/utils/logger.js');
vi.mock('../../src/utils/git-info.js');

describe('History Legacy Entries - Command Level Tests', () => {
  let loggerSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerSpy = vi.mocked(logger.log).mockImplementation(() => {});

    vi.mocked(ConfigManager.load).mockResolvedValue({
      promptDirs: ['./.prompts'],
      historyDir: './.pthistory'
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('default filtering with legacy entries', () => {
    it('should include legacy entries (no environment) when using default filter', async () => {
      const currentGitDir = '/home/user/current-project/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: currentGitDir
      });

      // Mix of legacy and new entries
      const mockEntries = [
        {
          // Legacy entry - no environment at all
          timestamp: '2024-01-10T10:00:00.000Z',
          templatePath: '/templates/legacy1.md',
          finalPrompt: 'Legacy prompt 1',
          title: 'Legacy Entry 1',
          templateContent: 'template',
          variables: {},
          filename: '20240110-100000-aabbccdd.json'
        },
        {
          // Legacy entry - environment but no git_dir
          timestamp: '2024-01-11T10:00:00.000Z',
          templatePath: '/templates/legacy2.md',
          finalPrompt: 'Legacy prompt 2',
          title: 'Legacy Entry 2',
          templateContent: 'template',
          variables: {},
          filename: '20240111-100000-aabbccdd.json',
          environment: {
            working_directory: '/home/user/some-project',
            os: 'linux'
          }
        },
        {
          // New entry - matching current git_dir
          timestamp: '2024-01-12T10:00:00.000Z',
          templatePath: '/templates/new1.md',
          finalPrompt: 'New prompt 1',
          title: 'New Entry 1',
          templateContent: 'template',
          variables: {},
          filename: '20240112-100000-aabbccdd.json',
          environment: {
            working_directory: '/home/user/current-project',
            git_dir: currentGitDir,
            os: 'linux'
          }
        },
        {
          // New entry - different git_dir (should be excluded)
          timestamp: '2024-01-13T10:00:00.000Z',
          templatePath: '/templates/other.md',
          finalPrompt: 'Other prompt',
          title: 'Other Project Entry',
          templateContent: 'template',
          variables: {},
          filename: '20240113-100000-aabbccdd.json',
          environment: {
            working_directory: '/home/user/other-project',
            git_dir: '/home/user/other-project/.git',
            os: 'linux'
          }
        }
      ];

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockImplementation(async (_limit, filterOptions) => {
          if (!filterOptions) {return mockEntries;}

          return mockEntries.filter(entry => {
            const env = (entry as any).environment;

            // Backwards compatibility check
            if (!env || !env.git_dir) {
              return filterOptions.includeLegacy === true;
            }

            if (filterOptions.gitDir && env.git_dir === filterOptions.gitDir) {
              return true;
            }

            return false;
          });
        }),
        getTotalCount: vi.fn().mockImplementation(async (filterOptions) => {
          if (!filterOptions) {return mockEntries.length;}

          return mockEntries.filter(entry => {
            const env = (entry as any).environment;

            if (!env || !env.git_dir) {
              return filterOptions.includeLegacy === true;
            }

            if (filterOptions.gitDir && env.git_dir === filterOptions.gitDir) {
              return true;
            }

            return false;
          }).length;
        })
      } as any));

      await historyCommand({});

      // Should show 3 entries: 2 legacy + 1 matching new entry
      // (Other Project Entry should be excluded)
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Legacy Entry 1'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Legacy Entry 2'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('New Entry 1'));

      // Should NOT show the entry from different git_dir
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasOtherEntry = calls.some(call =>
        typeof call === 'string' && call.includes('Other Project Entry')
      );
      expect(hasOtherEntry).toBe(false);
    });

    it('should NOT include legacy entries when using explicit --dir filter', async () => {
      const specificDir = '/home/user/specific-project/.git';

      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: '/home/user/current-project/.git'
      });

      const mockEntries = [
        {
          // Legacy entry - should NOT be included with explicit --dir
          timestamp: '2024-01-10T10:00:00.000Z',
          templatePath: '/templates/legacy.md',
          finalPrompt: 'Legacy prompt',
          title: 'Legacy Entry',
          templateContent: 'template',
          variables: {},
          filename: '20240110-100000-aabbccdd.json'
        },
        {
          // New entry - matching specific dir
          timestamp: '2024-01-12T10:00:00.000Z',
          templatePath: '/templates/specific.md',
          finalPrompt: 'Specific prompt',
          title: 'Specific Entry',
          templateContent: 'template',
          variables: {},
          filename: '20240112-100000-aabbccdd.json',
          environment: {
            working_directory: '/home/user/specific-project',
            git_dir: specificDir,
            os: 'linux'
          }
        }
      ];

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockImplementation(async (_limit, filterOptions) => {
          if (!filterOptions) {return mockEntries;}

          return mockEntries.filter(entry => {
            const env = (entry as any).environment;

            if (!env || !env.git_dir) {
              return filterOptions.includeLegacy === true;
            }

            if (filterOptions.gitDir && env.git_dir === filterOptions.gitDir) {
              return true;
            }

            return false;
          });
        }),
        getTotalCount: vi.fn().mockImplementation(async (filterOptions) => {
          if (!filterOptions) {return mockEntries.length;}

          return mockEntries.filter(entry => {
            const env = (entry as any).environment;

            if (!env || !env.git_dir) {
              return filterOptions.includeLegacy === true;
            }

            if (filterOptions.gitDir && env.git_dir === filterOptions.gitDir) {
              return true;
            }

            return false;
          }).length;
        })
      } as any));

      await historyCommand({ dir: specificDir });

      // Should show only the specific entry
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Specific Entry'));

      // Should NOT show the legacy entry
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasLegacyEntry = calls.some(call =>
        typeof call === 'string' && call.includes('Legacy Entry')
      );
      expect(hasLegacyEntry).toBe(false);
    });

    it('should include all entries (including legacy) with --all-dir', async () => {
      vi.mocked(gitInfo.getGitInfo).mockResolvedValue({
        gitDir: '/home/user/current-project/.git'
      });

      const mockEntries = [
        {
          timestamp: '2024-01-10T10:00:00.000Z',
          templatePath: '/templates/legacy.md',
          finalPrompt: 'Legacy prompt',
          title: 'Legacy Entry',
          templateContent: 'template',
          variables: {},
          filename: '20240110-100000-aabbccdd.json'
        },
        {
          timestamp: '2024-01-12T10:00:00.000Z',
          templatePath: '/templates/new.md',
          finalPrompt: 'New prompt',
          title: 'New Entry',
          templateContent: 'template',
          variables: {},
          filename: '20240112-100000-aabbccdd.json',
          environment: {
            working_directory: '/home/user/other-project',
            git_dir: '/home/user/other-project/.git',
            os: 'linux'
          }
        }
      ];

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(mockEntries),
        getTotalCount: vi.fn().mockResolvedValue(mockEntries.length)
      } as any));

      await historyCommand({ allDir: true });

      // Should show both entries
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Legacy Entry'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('New Entry'));
    });
  });
});
