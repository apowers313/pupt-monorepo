import * as nodeFs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalPackageManager } from '../../src/services/package-manager.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock cosmiconfig
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    load: vi.fn().mockResolvedValue(null),
    search: vi.fn(),
  })),
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GlobalPackageManager', () => {
  let testDir: string;
  let packagesDir: string;
  let pm: GlobalPackageManager;
  let mockExeca: any;

  beforeEach(async () => {
    testDir = await nodeFs.mkdtemp(path.join(os.tmpdir(), 'pupt-pm-test-'));
    packagesDir = path.join(testDir, 'packages');
    pm = new GlobalPackageManager(testDir);

    const execaMod = await import('execa');
    mockExeca = vi.mocked(execaMod.execa as any);
    mockExeca.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
  });

  afterEach(async () => {
    await fs.remove(testDir);
    vi.clearAllMocks();
  });

  describe('ensureInitialized', () => {
    it('should create {dataDir}/packages/package.json if not exists', async () => {
      await pm.ensureInitialized();

      const pkgJsonPath = path.join(packagesDir, 'package.json');
      const exists = await fs.pathExists(pkgJsonPath);
      expect(exists).toBe(true);

      const content = await fs.readJson(pkgJsonPath);
      expect(content).toEqual({
        name: 'pupt-packages',
        private: true,
        dependencies: {},
      });
    });

    it('should not overwrite existing package.json', async () => {
      await fs.ensureDir(packagesDir);
      const pkgJsonPath = path.join(packagesDir, 'package.json');
      await fs.writeJson(pkgJsonPath, {
        name: 'pupt-packages',
        private: true,
        dependencies: { 'some-package': '1.0.0' },
      });

      await pm.ensureInitialized();

      const content = await fs.readJson(pkgJsonPath);
      expect(content.dependencies['some-package']).toBe('1.0.0');
    });
  });

  describe('install', () => {
    it('should run npm install in {dataDir}/packages/', async () => {
      await pm.install('some-package');

      expect(mockExeca).toHaveBeenCalledWith('npm', ['install', 'some-package'], {
        cwd: packagesDir,
        stdio: 'inherit',
      });
    });

    it('should return installed package info', async () => {
      // Create fake installed package
      const pkgDir = path.join(packagesDir, 'node_modules', 'test-pkg');
      await fs.ensureDir(pkgDir);
      await fs.writeJson(path.join(pkgDir, 'package.json'), { version: '1.2.3' });
      const promptsDir = path.join(pkgDir, 'prompts');
      await fs.ensureDir(promptsDir);

      const result = await pm.install('test-pkg');

      expect(result.name).toBe('test-pkg');
      expect(result.version).toBe('1.2.3');
      expect(result.promptDirs).toEqual(['prompts']);
    });

    it('should throw on npm install failure', async () => {
      mockExeca.mockRejectedValue(new Error('npm ERR! 404 Not Found'));

      await expect(pm.install('nonexistent')).rejects.toThrow('Failed to install package');
    });
  });

  describe('update', () => {
    it('should run npm update for specific package', async () => {
      await pm.update('some-package');

      expect(mockExeca).toHaveBeenCalledWith('npm', ['update', 'some-package'], {
        cwd: packagesDir,
        stdio: 'inherit',
      });
    });

    it('should run npm update for all packages when no name given', async () => {
      await pm.update();

      expect(mockExeca).toHaveBeenCalledWith('npm', ['update'], {
        cwd: packagesDir,
        stdio: 'inherit',
      });
    });

    it('should throw on update failure', async () => {
      mockExeca.mockRejectedValue(new Error('Network error'));

      await expect(pm.update('bad-pkg')).rejects.toThrow('Failed to update package "bad-pkg"');
    });
  });

  describe('uninstall', () => {
    it('should run npm uninstall in packages dir', async () => {
      await pm.uninstall('some-package');

      expect(mockExeca).toHaveBeenCalledWith('npm', ['uninstall', 'some-package'], {
        cwd: packagesDir,
        stdio: 'inherit',
      });
    });

    it('should throw on uninstall failure', async () => {
      mockExeca.mockRejectedValue(new Error('Permission denied'));

      await expect(pm.uninstall('bad-pkg')).rejects.toThrow('Failed to uninstall package "bad-pkg"');
    });
  });

  describe('getInstalledVersion', () => {
    it('should return version from installed package.json', async () => {
      const pkgDir = path.join(packagesDir, 'node_modules', 'test-pkg');
      await fs.ensureDir(pkgDir);
      await fs.writeJson(path.join(pkgDir, 'package.json'), { version: '3.0.0' });

      const version = await pm.getInstalledVersion('test-pkg');
      expect(version).toBe('3.0.0');
    });

    it('should return null for non-existent package', async () => {
      const version = await pm.getInstalledVersion('nonexistent');
      expect(version).toBeNull();
    });
  });

  describe('detectPromptDirs', () => {
    it('should detect prompt dirs from package .pt-config.json', async () => {
      const { cosmiconfig } = await import('cosmiconfig');
      const mockExplorer = {
        load: vi.fn().mockImplementation(async (configPath: string) => {
          if (configPath.endsWith('.pt-config.json')) {
            return {
              config: {
                promptDirs: ['src/prompts', 'lib/prompts'],
              },
            };
          }
          return null;
        }),
        search: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      const pkgDir = path.join(packagesDir, 'node_modules', 'test-pkg');
      await fs.ensureDir(pkgDir);

      const dirs = await pm.detectPromptDirs('test-pkg');
      expect(dirs).toEqual(['src/prompts', 'lib/prompts']);
    });

    it('should detect prompt dirs from package.json pupt.promptDirs field', async () => {
      const { cosmiconfig } = await import('cosmiconfig');
      vi.mocked(cosmiconfig).mockReturnValue({
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn(),
      } as any);

      const pkgDir = path.join(packagesDir, 'node_modules', 'test-pkg');
      await fs.ensureDir(pkgDir);
      await fs.writeJson(path.join(pkgDir, 'package.json'), {
        name: 'test-pkg',
        version: '1.0.0',
        pupt: { promptDirs: ['custom-prompts'] },
      });

      const dirs = await pm.detectPromptDirs('test-pkg');
      expect(dirs).toEqual(['custom-prompts']);
    });

    it('should fall back to checking for prompts/ directory', async () => {
      const { cosmiconfig } = await import('cosmiconfig');
      vi.mocked(cosmiconfig).mockReturnValue({
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn(),
      } as any);

      const pkgDir = path.join(packagesDir, 'node_modules', 'test-pkg');
      const promptsDir = path.join(pkgDir, 'prompts');
      await fs.ensureDir(promptsDir);
      await fs.writeJson(path.join(pkgDir, 'package.json'), { name: 'test-pkg', version: '1.0.0' });

      const dirs = await pm.detectPromptDirs('test-pkg');
      expect(dirs).toEqual(['prompts']);
    });

    it('should return empty array for pure component packages', async () => {
      const { cosmiconfig } = await import('cosmiconfig');
      vi.mocked(cosmiconfig).mockReturnValue({
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn(),
      } as any);

      const pkgDir = path.join(packagesDir, 'node_modules', 'test-pkg');
      await fs.ensureDir(pkgDir);
      await fs.writeJson(path.join(pkgDir, 'package.json'), { name: 'test-pkg', version: '1.0.0' });

      const dirs = await pm.detectPromptDirs('test-pkg');
      expect(dirs).toEqual([]);
    });
  });

  describe('getPackagesDir', () => {
    it('should return correct packages directory path', () => {
      expect(pm.getPackagesDir()).toBe(path.join(testDir, 'packages'));
    });
  });

  describe('getNodeModulesDir', () => {
    it('should return correct node_modules directory path', () => {
      expect(pm.getNodeModulesDir()).toBe(path.join(testDir, 'packages', 'node_modules'));
    });
  });
});
