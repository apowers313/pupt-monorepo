import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { contractPath, isNonPortableAbsolutePath, warnAboutNonPortablePaths } from '../../src/utils/path-utils.js';
import { logger } from '../../src/utils/logger.js';
import { clearProjectRootCache } from '../../src/utils/project-root.js';

vi.mock('../../src/utils/logger.js');

describe('path-utils - Coverage Improvements', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(logger.warn).mockImplementation(() => {});
    clearProjectRootCache();
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    clearProjectRootCache();
    // Clean up temp dir
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  function createTempProject(): string {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-path-utils-'));
    // Create a package.json to mark it as a project root
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
    return tempDir;
  }

  describe('contractPath - path equal to project root', () => {
    it('should contract path equal to project root to ${projectRoot}', () => {
      const projectDir = createTempProject();
      process.chdir(projectDir);
      clearProjectRootCache();

      const result = contractPath(projectDir, { configDir: projectDir });
      expect(result.path).toBe('${projectRoot}');
      expect(result.warned).toBe(false);
    });
  });

  describe('contractPath - path equal to home directory', () => {
    it('should contract path equal to home directory to ~', () => {
      // Create a temp project dir outside home to ensure home isn't under project root
      const projectDir = createTempProject();
      // We need to ensure the home directory is NOT under project root
      // Since homedir is typically outside our temp dir, this should work

      const homeDir = os.homedir();
      const resolvedHome = fs.realpathSync(homeDir);

      // Use configDir pointing to a location that does NOT contain the home dir as a subpath
      // to avoid the projectRoot matching first
      const result = contractPath(resolvedHome, { configDir: '/tmp/nonexistent-project' });
      expect(result.path).toBe('~');
      expect(result.warned).toBe(false);
    });
  });

  describe('contractPath - path under project root uses ${projectRoot}/', () => {
    it('should contract subdirectory of project root', () => {
      const projectDir = createTempProject();
      const subDir = path.join(projectDir, 'src', 'prompts');
      fs.mkdirSync(subDir, { recursive: true });
      process.chdir(projectDir);
      clearProjectRootCache();

      const result = contractPath(subDir, { configDir: projectDir });
      expect(result.path).toBe('${projectRoot}/src/prompts');
      expect(result.warned).toBe(false);
    });
  });

  describe('contractPath - path under home directory uses ~/', () => {
    it('should contract path under home directory', () => {
      const homeDir = os.homedir();
      const resolvedHome = fs.realpathSync(homeDir);
      const testPath = path.join(resolvedHome, '.config', 'pt');

      // Use configDir in a location that won't match the path as project root
      const result = contractPath(testPath, { configDir: '/tmp/nonexistent-project' });
      expect(result.path).toBe('~/.config/pt');
      expect(result.warned).toBe(false);
    });
  });

  describe('contractPath - already relative', () => {
    it('should keep relative paths as-is', () => {
      const result = contractPath('./prompts', {});
      expect(result.path).toBe('./prompts');
      expect(result.warned).toBe(false);
    });
  });

  describe('contractPath - already uses portable variables', () => {
    it('should keep ${projectRoot} paths as-is', () => {
      const result = contractPath('${projectRoot}/prompts', {});
      expect(result.path).toBe('${projectRoot}/prompts');
      expect(result.warned).toBe(false);
    });

    it('should keep ~/ paths as-is', () => {
      const result = contractPath('~/prompts', {});
      expect(result.path).toBe('~/prompts');
      expect(result.warned).toBe(false);
    });

    it('should keep absolute paths containing ${projectRoot} as-is', () => {
      const result = contractPath('/some/absolute/${projectRoot}/prompts', {});
      expect(result.path).toBe('/some/absolute/${projectRoot}/prompts');
      expect(result.warned).toBe(false);
    });
  });

  describe('contractPath - absolute path outside project and home', () => {
    it('should warn about non-portable absolute paths', () => {
      const result = contractPath('/opt/system/prompts', {
        configDir: '/tmp/nonexistent-project',
        warnOnAbsolute: true
      });
      expect(result.path).toBe('/opt/system/prompts');
      expect(result.warned).toBe(true);
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('not be portable')
      );
    });

    it('should not warn when warnOnAbsolute is false', () => {
      const result = contractPath('/opt/system/prompts', {
        configDir: '/tmp/nonexistent-project',
        warnOnAbsolute: false
      });
      expect(result.path).toBe('/opt/system/prompts');
      expect(result.warned).toBe(true);
      expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });
  });

  describe('isNonPortableAbsolutePath', () => {
    it('should return false for relative paths', () => {
      expect(isNonPortableAbsolutePath('./prompts')).toBe(false);
    });

    it('should return false for paths using ${projectRoot}', () => {
      expect(isNonPortableAbsolutePath('${projectRoot}/prompts')).toBe(false);
    });

    it('should return false for paths using ~/', () => {
      expect(isNonPortableAbsolutePath('~/prompts')).toBe(false);
    });

    it('should return false for absolute paths containing ${projectRoot}', () => {
      expect(isNonPortableAbsolutePath('/some/absolute/${projectRoot}/prompts')).toBe(false);
    });

    it('should return true for absolute path under home dir', () => {
      const homeDir = os.homedir();
      const resolvedHome = fs.realpathSync(homeDir);
      const testPath = path.join(resolvedHome, 'some', 'path');
      expect(isNonPortableAbsolutePath(testPath, '/tmp/nonexistent-project')).toBe(true);
    });

    it('should return true for absolute path under project root', () => {
      const projectDir = createTempProject();
      process.chdir(projectDir);
      clearProjectRootCache();

      const testPath = path.join(projectDir, 'src', 'prompts');
      fs.mkdirSync(testPath, { recursive: true });

      expect(isNonPortableAbsolutePath(testPath, projectDir)).toBe(true);
    });

    it('should return true for absolute path outside project and home', () => {
      expect(isNonPortableAbsolutePath('/opt/system/prompts', '/tmp/nonexistent-project')).toBe(true);
    });
  });

  describe('warnAboutNonPortablePaths', () => {
    it('should not warn when all paths are portable', () => {
      warnAboutNonPortablePaths(['./prompts', '~/other', '${projectRoot}/src']);
      expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });

    it('should warn about non-portable absolute paths', () => {
      const homeDir = os.homedir();
      const resolvedHome = fs.realpathSync(homeDir);
      const nonPortablePath = path.join(resolvedHome, 'my-prompts');

      // Use a configFilePath outside home so the path is detected as non-portable
      warnAboutNonPortablePaths([nonPortablePath], '/tmp/nonexistent-project/config.json');
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('absolute paths that may not be portable')
      );
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining(nonPortablePath)
      );
    });

    it('should skip undefined paths', () => {
      warnAboutNonPortablePaths([undefined, './prompts', undefined]);
      expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });

    it('should not warn when array is empty', () => {
      warnAboutNonPortablePaths([]);
      expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });

    it('should use process.cwd() when no configFilePath provided', () => {
      const projectDir = createTempProject();
      process.chdir(projectDir);
      clearProjectRootCache();

      const absolutePath = path.join(projectDir, 'prompts');
      fs.mkdirSync(absolutePath, { recursive: true });

      warnAboutNonPortablePaths([absolutePath]);
      // This path is under project root, so it IS non-portable (absolute instead of using ${projectRoot})
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('absolute paths')
      );
    });

    it('should list multiple non-portable paths in warning', () => {
      const homeDir = os.homedir();
      const resolvedHome = fs.realpathSync(homeDir);
      const path1 = path.join(resolvedHome, 'prompts1');
      const path2 = path.join(resolvedHome, 'prompts2');

      warnAboutNonPortablePaths([path1, path2], '/tmp/nonexistent/config.json');

      expect(vi.mocked(logger.warn)).toHaveBeenCalledTimes(1);
      const warnCall = vi.mocked(logger.warn).mock.calls[0][0] as string;
      expect(warnCall).toContain(path1);
      expect(warnCall).toContain(path2);
    });
  });
});
