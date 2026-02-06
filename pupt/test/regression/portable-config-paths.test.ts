/**
 * Regression test for portable config paths
 *
 * Issue: Config files stored absolute paths like /home/user/project/.prompts
 * which made configs non-portable across machines and broke team collaboration.
 *
 * Fix: Added path contraction when saving configs:
 * - Absolute paths under project root → ${projectRoot}/...
 * - Absolute paths under home → ~/...
 * - Relative paths → kept as-is (e.g., node_modules/...)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { contractPath, isNonPortableAbsolutePath, warnAboutNonPortablePaths } from '../../src/utils/path-utils.js';
import { findProjectRoot, clearProjectRootCache } from '../../src/utils/project-root.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');

describe('Portable Config Paths - Regression Tests', () => {
  const homeDir = os.homedir();
  let originalCwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    clearProjectRootCache();
    originalCwd = process.cwd();
  });

  afterEach(() => {
    clearProjectRootCache();
  });

  describe('contractPath', () => {
    it('should keep relative paths as-is', () => {
      const result = contractPath('node_modules/package/prompts');
      expect(result.path).toBe('node_modules/package/prompts');
      expect(result.warned).toBe(false);
    });

    it('should keep ./ prefixed relative paths as-is', () => {
      const result = contractPath('./.prompts');
      expect(result.path).toBe('./.prompts');
      expect(result.warned).toBe(false);
    });

    it('should keep paths already using ${projectRoot}', () => {
      const result = contractPath('${projectRoot}/.prompts');
      expect(result.path).toBe('${projectRoot}/.prompts');
      expect(result.warned).toBe(false);
    });

    it('should keep paths already using ~/', () => {
      const result = contractPath('~/my-prompts');
      expect(result.path).toBe('~/my-prompts');
      expect(result.warned).toBe(false);
    });

    it('should convert absolute path under project root to ${projectRoot}/...', () => {
      // Use cwd as project root (it has package.json)
      const cwd = process.cwd();
      const absolutePath = path.join(cwd, '.prompts');

      const result = contractPath(absolutePath, { configDir: cwd, warnOnAbsolute: false });
      expect(result.path).toBe('${projectRoot}/.prompts');
      expect(result.warned).toBe(false);
    });

    it('should convert absolute path under home to ~/', () => {
      const absolutePath = path.join(homeDir, 'my-prompts', 'shared');

      const result = contractPath(absolutePath, { warnOnAbsolute: false });
      expect(result.path).toBe('~/my-prompts/shared');
      expect(result.warned).toBe(false);
    });

    it('should use forward slashes for cross-platform compatibility', () => {
      const cwd = process.cwd();
      const absolutePath = path.join(cwd, 'deep', 'nested', 'path');

      const result = contractPath(absolutePath, { configDir: cwd, warnOnAbsolute: false });
      expect(result.path).toBe('${projectRoot}/deep/nested/path');
      expect(result.path).not.toContain('\\'); // No backslashes
    });

    it('should warn about absolute paths outside project and home', () => {
      const result = contractPath('/opt/shared/prompts', { warnOnAbsolute: true });
      expect(result.path).toBe('/opt/shared/prompts');
      expect(result.warned).toBe(true);
    });
  });

  describe('isNonPortableAbsolutePath', () => {
    it('should return false for relative paths', () => {
      expect(isNonPortableAbsolutePath('node_modules/pkg/prompts')).toBe(false);
      expect(isNonPortableAbsolutePath('./.prompts')).toBe(false);
    });

    it('should return false for paths using ${projectRoot}', () => {
      expect(isNonPortableAbsolutePath('${projectRoot}/.prompts')).toBe(false);
    });

    it('should return false for paths using ~/', () => {
      expect(isNonPortableAbsolutePath('~/my-prompts')).toBe(false);
    });

    it('should return true for absolute paths that could be made portable', () => {
      const cwd = process.cwd();
      expect(isNonPortableAbsolutePath(path.join(cwd, '.prompts'), cwd)).toBe(true);
      expect(isNonPortableAbsolutePath(path.join(homeDir, 'prompts'))).toBe(true);
    });
  });

  describe('warnAboutNonPortablePaths', () => {
    it('should not warn for portable paths', () => {
      const loggerWarnSpy = vi.mocked(logger.warn);

      warnAboutNonPortablePaths([
        'node_modules/pkg/prompts',
        './.prompts',
        '${projectRoot}/.history',
        '~/shared-prompts'
      ]);

      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should warn for absolute paths that could be made portable', () => {
      const loggerWarnSpy = vi.mocked(logger.warn);
      const cwd = process.cwd();

      warnAboutNonPortablePaths([
        path.join(cwd, '.prompts'),
        path.join(homeDir, 'my-prompts')
      ], path.join(cwd, '.pt-config.json'));

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy.mock.calls[0][0]).toContain('absolute paths');
      expect(loggerWarnSpy.mock.calls[0][0]).toContain('portable');
    });
  });

  describe('ConfigManager.contractPaths', () => {
    it('should contract all path fields in config', () => {
      const cwd = process.cwd();
      const config = {
        promptDirs: [
          path.join(cwd, '.prompts'),
          'node_modules/pkg/prompts',
          path.join(homeDir, 'shared-prompts')
        ],
        historyDir: path.join(cwd, '.pthistory'),
        annotationDir: path.join(cwd, '.pthistory'),
        gitPromptDir: path.join(cwd, '.git-prompts'),
        version: '3.0.0'
      };

      const contracted = ConfigManager.contractPaths(config, cwd);

      expect(contracted.promptDirs).toEqual([
        '${projectRoot}/.prompts',
        'node_modules/pkg/prompts',
        '~/shared-prompts'
      ]);
      expect(contracted.historyDir).toBe('${projectRoot}/.pthistory');
      expect(contracted.annotationDir).toBe('${projectRoot}/.pthistory');
      expect(contracted.gitPromptDir).toBe('${projectRoot}/.git-prompts');
    });

    it('should preserve already-portable paths', () => {
      const config = {
        promptDirs: [
          '${projectRoot}/.prompts',
          'node_modules/pkg/prompts',
          '~/shared-prompts',
          './.local-prompts'
        ],
        historyDir: '${projectRoot}/.pthistory',
        version: '3.0.0'
      };

      const contracted = ConfigManager.contractPaths(config, process.cwd());

      expect(contracted.promptDirs).toEqual(config.promptDirs);
      expect(contracted.historyDir).toBe(config.historyDir);
    });
  });

  describe('Monorepo scenarios', () => {
    it('should handle paths in monorepo subdirectory', () => {
      // Simulate: running from /monorepo/packages/app
      // where project root is /monorepo (has package.json)
      const cwd = process.cwd();
      const projectRoot = findProjectRoot(cwd);

      // Path in subdirectory should still resolve to ${projectRoot}
      if (projectRoot) {
        const subDirPath = path.join(projectRoot, 'packages', 'app', '.prompts');
        const result = contractPath(subDirPath, { configDir: cwd, warnOnAbsolute: false });
        expect(result.path).toBe('${projectRoot}/packages/app/.prompts');
      }
    });

    it('should handle node_modules paths in monorepo', () => {
      // node_modules paths should stay relative
      const result = contractPath('node_modules/@org/prompts/templates');
      expect(result.path).toBe('node_modules/@org/prompts/templates');
      expect(result.warned).toBe(false);
    });

    it('should handle worktree paths correctly', () => {
      // Paths from git worktrees should resolve through findProjectRoot
      const cwd = process.cwd();
      const projectRoot = findProjectRoot(cwd);

      if (projectRoot) {
        // Any path under project root should become ${projectRoot}/...
        const worktreePath = path.join(projectRoot, '.worktrees', 'feature', 'node_modules', 'pkg');
        const result = contractPath(worktreePath, { configDir: cwd, warnOnAbsolute: false });
        expect(result.path).toContain('${projectRoot}');
        expect(result.warned).toBe(false);
      }
    });
  });
});
