import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import fs2 from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../../src/utils/logger.js';

let testDir: string;
vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Mock simple-git before importing install commands
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    checkIsRepo: vi.fn(),
    log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
  }))
}));

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
  $: vi.fn()
}));

// Mock cosmiconfig (still used by installFromGit's loadConfigFromDirectory)
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    load: vi.fn(),
    search: vi.fn()
  }))
}));

// Mock GlobalPackageManager
const mockInstall = vi.fn();
const mockEnsureInitialized = vi.fn();
const mockDetectPromptDirs = vi.fn();
const mockGetInstalledVersion = vi.fn();

vi.mock('../../src/services/package-manager.js', () => ({
  GlobalPackageManager: vi.fn().mockImplementation(() => ({
    install: mockInstall,
    ensureInitialized: mockEnsureInitialized,
    detectPromptDirs: mockDetectPromptDirs,
    getInstalledVersion: mockGetInstalledVersion,
    getPackagesDir: () => path.join(testDir, 'data', 'packages'),
    getNodeModulesDir: () => path.join(testDir, 'data', 'packages', 'node_modules'),
  }))
}));

// Now import after mocking
import { cosmiconfig } from 'cosmiconfig';
import simpleGit from 'simple-git';

import {
  extractRepoName,
  installCommand,
  installFromGit,
  installFromNpm,
  isNpmPackage,
} from '../../src/commands/install.js';
import { ConfigManager } from '../../src/config/config-manager.js';

vi.mock('node:fs/promises');
vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ConfigManager: {
      ...original.ConfigManager,
      load: vi.fn(),
      save: vi.fn(),
    }
  };
});
vi.mock('fs-extra');
vi.mock('../../src/utils/logger.js');

describe('Install Command - Coverage Improvements', () => {
  const dataDir = () => path.join(testDir, 'data');
  const librariesDir = () => path.join(dataDir(), 'libraries');

  beforeEach(async () => {
    vi.clearAllMocks();
    testDir = '/tmp/test-pupt-coverage';
    vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});

    // Re-apply GlobalPackageManager mock implementation after vi.restoreAllMocks()
    const { GlobalPackageManager } = await import('../../src/services/package-manager.js');
    vi.mocked(GlobalPackageManager).mockImplementation(() => ({
      install: mockInstall,
      ensureInitialized: mockEnsureInitialized,
      detectPromptDirs: mockDetectPromptDirs,
      getInstalledVersion: mockGetInstalledVersion,
      getPackagesDir: () => path.join(testDir, 'data', 'packages'),
      getNodeModulesDir: () => path.join(testDir, 'data', 'packages', 'node_modules'),
    }) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('installCommand', () => {
    it('should throw when source is empty', async () => {
      await expect(installCommand('')).rejects.toThrow(
        'Please provide a git URL or npm package name to install from'
      );
    });

    it('should route npm packages to installFromNpm', async () => {
      // Mock GlobalPackageManager.install to return package info
      mockInstall.mockResolvedValue({
        name: 'some-package',
        version: '1.0.0',
        promptDirs: ['prompts'],
      });

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: [],
      } as any);
      vi.mocked(ConfigManager.save).mockResolvedValue(undefined);

      // Should not throw
      await installFromNpm('some-package');

      expect(mockInstall).toHaveBeenCalledWith('some-package');
    });

    it('should route git URLs to installFromGit', async () => {
      const mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345' } }),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: []
      } as any);
      vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installCommand('https://github.com/user/repo');

      expect(mockGit.clone).toHaveBeenCalled();
    });

    it('should provide helpful error for invalid source', async () => {
      await expect(installCommand('not-a-valid-anything!!!')).rejects.toThrow(
        'Invalid installation source'
      );
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('neither a valid git URL nor an npm package name')
      );
    });

    it('should propagate non-URL errors from installFromGit', async () => {
      const mockGit = {
        clone: vi.fn().mockRejectedValue(new Error('Network error')),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345' } }),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: []
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(installCommand('https://github.com/user/repo')).rejects.toThrow(
        'Failed to clone repository'
      );
    });
  });

  describe('installFromNpm - full flow', () => {
    beforeEach(async () => {
      mockInstall.mockResolvedValue({
        name: 'my-pkg',
        version: '1.0.0',
        promptDirs: ['prompts'],
      });

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: [],
      } as any);
      vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
    });

    it('should reject invalid package names', async () => {
      await expect(installFromNpm('')).rejects.toThrow('Package name cannot be empty');
    });

    it('should handle install failure gracefully', async () => {
      mockInstall.mockRejectedValue(new Error('Failed to install package: Command not found'));

      await expect(installFromNpm('my-package')).rejects.toThrow(
        'Failed to install package'
      );
    });

    it('should create NpmLibraryEntry with detected promptDirs', async () => {
      // Mock GlobalPackageManager.install returning multiple prompt dirs
      // (this simulates the case where .pt-config.json in the package has multiple promptDirs)
      mockInstall.mockResolvedValue({
        name: 'my-pkg',
        version: '1.2.0',
        promptDirs: ['prompts', 'extra-prompts'],
      });

      await installFromNpm('my-pkg');

      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'my-pkg',
              type: 'npm',
              source: 'my-pkg',
              promptDirs: ['prompts', 'extra-prompts'],
              version: '1.2.0',
              installedAt: expect.any(String),
            })
          ])
        })
      );
    });

    it('should reject duplicate library entries', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: [
          {
            name: 'my-pkg',
            type: 'npm',
            source: 'my-pkg',
            promptDirs: ['prompts'],
            installedAt: '2024-01-15T00:00:00.000Z',
            version: '1.0.0',
          }
        ],
      } as any);

      await expect(installFromNpm('my-pkg')).rejects.toThrow(
        'Package "my-pkg" is already installed'
      );

      // Should NOT call install or save config
      expect(mockInstall).not.toHaveBeenCalled();
      expect(vi.mocked(ConfigManager.save)).not.toHaveBeenCalled();
    });

    it('should create NpmLibraryEntry with default prompts directory', async () => {
      // GlobalPackageManager.install returns the detected prompts dir
      mockInstall.mockResolvedValue({
        name: 'my-pkg',
        version: '1.0.0',
        promptDirs: ['prompts'],
      });

      await installFromNpm('my-pkg');

      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'my-pkg',
              type: 'npm',
              source: 'my-pkg',
              promptDirs: ['prompts'],
              version: '1.0.0',
              installedAt: expect.any(String),
            })
          ])
        })
      );
    });

    it('should not duplicate when library name already exists', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: [
          {
            name: 'dup-pkg',
            type: 'npm',
            source: 'dup-pkg',
            promptDirs: ['prompts'],
            installedAt: '2024-01-15T00:00:00.000Z',
            version: '1.0.0',
          }
        ],
      } as any);

      await expect(installFromNpm('dup-pkg')).rejects.toThrow(
        'Package "dup-pkg" is already installed'
      );

      // Should not save since library already exists
      expect(vi.mocked(ConfigManager.save)).not.toHaveBeenCalled();
    });
  });

  describe('isNpmPackage - edge cases', () => {
    it('should reject scoped packages with just @ symbol', () => {
      expect(isNpmPackage('@')).toBe(false);
    });

    it('should reject scoped packages with empty package name', () => {
      expect(isNpmPackage('@scope/')).toBe(false);
    });

    it('should reject scoped packages with empty scope', () => {
      expect(isNpmPackage('@/package')).toBe(false);
    });

    it('should reject null/undefined-like values', () => {
      expect(isNpmPackage(null as any)).toBe(false);
      expect(isNpmPackage(undefined as any)).toBe(false);
    });

    it('should reject strings starting with invalid characters', () => {
      expect(isNpmPackage('-invalid')).toBe(false);
      expect(isNpmPackage('.invalid')).toBe(false);
      expect(isNpmPackage('_invalid')).toBe(false);
    });
  });

  describe('extractRepoName - additional edge cases', () => {
    it('should throw for URLs without recognizable format', () => {
      expect(() => extractRepoName('just-a-string')).toThrow(
        'Cannot extract repository name from URL'
      );
    });

    it('should handle file:// URLs ending with slash', () => {
      const name = extractRepoName('file:///home/user/repos/test-repo/');
      expect(name).toBe('test-repo');
    });

    it('should handle SSH URLs', () => {
      const name = extractRepoName('git@github.com:org/my-repo.git');
      expect(name).toBe('my-repo');
    });

    it('should handle git:// protocol', () => {
      const name = extractRepoName('git://example.com/user/cool-repo.git');
      expect(name).toBe('cool-repo');
    });
  });

  describe('installFromGit - installed package with existing promptDirs', () => {
    let mockGit: any;

    beforeEach(() => {
      mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
    });

    it('should read .pt-config.json from cloned repo for promptDirs', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: []
      } as any);

      const installPath = path.join(librariesDir(), 'my-repo');

      // Mock cosmiconfig to return promptDirs from the cloned repo
      const mockExplorer = {
        load: vi.fn().mockImplementation(async (configPath: string) => {
          if (configPath.includes(path.join(installPath, '.pt-config.json'))) {
            return {
              config: {
                promptDirs: ['src/prompts', 'lib/prompts']
              }
            };
          }
          return null;
        }),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await installFromGit('https://github.com/user/my-repo', { git: mockGit });

      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'my-repo',
              promptDirs: ['src/prompts', 'lib/prompts'],
            })
          ])
        })
      );
    });
  });
});
