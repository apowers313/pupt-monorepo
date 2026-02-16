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

// Mock execa (still needed for non-npm paths)
vi.mock('execa', () => ({
  execa: vi.fn(),
  $: vi.fn()
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
import simpleGit from 'simple-git';

import { extractRepoName, installFromGit, installFromNpm,isNpmPackage, validateGitUrl, validateNpmPackage } from '../../src/commands/install.js';
import { ConfigManager } from '../../src/config/config-manager.js';

vi.mock('fs/promises');
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
describe('Install Command', () => {
  let loggerLogSpy: any;
  let loggerWarnSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    testDir = '/tmp/test-pupt-install';
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerWarnSpy = vi.mocked(logger.warn).mockImplementation(() => {});
  });

  afterEach(() => {
  });

  describe('Git URL Detection', () => {
    describe('validateGitUrl', () => {
      it('should accept valid HTTPS git URLs', () => {
        const validUrls = [
          'https://github.com/user/repo',
          'https://github.com/user/repo.git',
          'https://gitlab.com/org/project',
          'https://bitbucket.org/team/repo.git',
          'https://github.com/user-name/repo-name',
          'https://github.com/user_name/repo_name',
          'https://github.com/user123/repo456'
        ];

        validUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });

      it('should accept valid SSH git URLs', () => {
        const validUrls = [
          'git@github.com:user/repo.git',
          'git@gitlab.com:org/project.git',
          'git@bitbucket.org:team/repo.git',
          'git@github.com:user-name/repo-name.git',
          'ssh://git@github.com/user/repo.git'
        ];

        validUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });

      it('should accept git:// protocol URLs', () => {
        const validUrls = [
          'git://github.com/user/repo.git',
          'git://gitlab.com/org/project.git'
        ];

        validUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });

      it('should reject invalid URLs', () => {
        const invalidUrls = [
          'not-a-url',
          'http://github.com/user/repo', // http not https
          'ftp://github.com/user/repo',
          'github.com/user/repo', // missing protocol
          'https://github.com', // missing repo path
          'https://github.com/', // missing repo path
          'https://github.com/user', // missing repo name
          'https://github.com/user/', // missing repo name
          '', // empty string
          ' ', // whitespace
          'file:///' // file protocol without proper path
        ];

        invalidUrls.forEach(url => {
          expect(() => validateGitUrl(url), `URL "${url}" should be invalid`).toThrow();
        });
      });

      it('should accept file:// URLs for local repos', () => {
        const validFileUrls = [
          'file:///home/user/repos/my-prompts',
          'file:///tmp/test-repo'
        ];

        validFileUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });
    });

    describe('extractRepoName', () => {
      it('should extract repo name from HTTPS URLs', () => {
        expect(extractRepoName('https://github.com/user/my-repo')).toBe('my-repo');
        expect(extractRepoName('https://github.com/user/my-repo.git')).toBe('my-repo');
        expect(extractRepoName('https://gitlab.com/org/project-name.git')).toBe('project-name');
      });

      it('should extract repo name from SSH URLs', () => {
        expect(extractRepoName('git@github.com:user/my-repo.git')).toBe('my-repo');
        expect(extractRepoName('ssh://git@github.com/user/another-repo.git')).toBe('another-repo');
      });

      it('should extract repo name from git:// URLs', () => {
        expect(extractRepoName('git://github.com/user/repo-name.git')).toBe('repo-name');
      });

      it('should extract repo name from file:// URLs', () => {
        expect(extractRepoName('file:///home/user/repos/my-prompts')).toBe('my-prompts');
        expect(extractRepoName('file:///tmp/test-repo/')).toBe('test-repo');
      });

      it('should handle special characters in repo names', () => {
        expect(extractRepoName('https://github.com/user/repo_with_underscores')).toBe('repo_with_underscores');
        expect(extractRepoName('https://github.com/user/repo-with-dashes')).toBe('repo-with-dashes');
        expect(extractRepoName('https://github.com/user/repo.with.dots')).toBe('repo.with.dots');
      });
    });
  });

  describe('Git Operations', () => {
    let mockGit: any;
    const dataDir = '/tmp/test-pupt-install/data';
    const librariesDir = path.join(dataDir, 'libraries');

    beforeEach(() => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: []
      } as any);
      vi.mocked(ConfigManager.save).mockResolvedValue(undefined);

      // Create a fresh mock git instance for each test
      mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit);
    });

    it('should clone repo into {dataDir}/libraries/{name}/', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/test-prompts', { git: mockGit });

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/test-prompts',
        path.join(librariesDir, 'test-prompts'),
        ['--depth', '1']
      );
    });

    it('should extract library name from URL', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/my-awesome-prompts.git', { git: mockGit });

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/my-awesome-prompts.git',
        path.join(librariesDir, 'my-awesome-prompts'),
        ['--depth', '1']
      );
    });

    it('should support --name flag for custom name', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo', { git: mockGit, name: 'custom-name' });

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo',
        path.join(librariesDir, 'custom-name'),
        ['--depth', '1']
      );
    });

    it('should add GitLibraryEntry to global config', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/test-prompts', { git: mockGit });

      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-prompts',
              type: 'git',
              source: 'https://github.com/user/test-prompts',
              promptDirs: ['prompts'],
            })
          ])
        })
      );
    });

    it('should fall back to ["prompts"] if no config in repo', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo', { git: mockGit });

      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              promptDirs: ['prompts'],
            })
          ])
        })
      );
    });

    it('should error if library name already exists', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: [
          {
            name: 'repo',
            type: 'git',
            source: 'https://github.com/other/repo',
            promptDirs: ['prompts'],
            installedAt: '2024-01-15',
          }
        ]
      } as any);

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        installFromGit('https://github.com/user/repo', { git: mockGit })
      ).rejects.toThrow('Library "repo" is already installed');
    });

    it('should use shallow clone (--depth 1)', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo', { git: mockGit });

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo',
        path.join(librariesDir, 'repo'),
        ['--depth', '1']
      );
    });

    it('should create libraries directory if it doesn\'t exist', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo', { git: mockGit });

      expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith(librariesDir, { recursive: true });
    });

    it('should handle git clone errors', async () => {
      mockGit.clone.mockRejectedValue(new Error('fatal: Authentication failed'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(installFromGit('https://github.com/user/private-repo', { git: mockGit })).rejects.toThrow('Failed to clone repository');
    });
  });

  describe('NPM Package Detection', () => {
    describe('isNpmPackage', () => {
      it('should detect regular npm package names', () => {
        expect(isNpmPackage('express')).toBe(true);
        expect(isNpmPackage('lodash')).toBe(true);
        expect(isNpmPackage('react')).toBe(true);
        expect(isNpmPackage('vue')).toBe(true);
      });

      it('should detect scoped npm package names', () => {
        expect(isNpmPackage('@babel/core')).toBe(true);
        expect(isNpmPackage('@types/node')).toBe(true);
        expect(isNpmPackage('@angular/cli')).toBe(true);
        expect(isNpmPackage('@my-org/my-package')).toBe(true);
      });

      it('should reject invalid package names', () => {
        expect(isNpmPackage('https://github.com/user/repo')).toBe(false);
        expect(isNpmPackage('git@github.com:user/repo.git')).toBe(false);
        expect(isNpmPackage('../local/path')).toBe(false);
        expect(isNpmPackage('./relative/path')).toBe(false);
        expect(isNpmPackage('/absolute/path')).toBe(false);
        expect(isNpmPackage('C:\\Windows\\Path')).toBe(false);
        expect(isNpmPackage('package name with spaces')).toBe(false);
        expect(isNpmPackage('package@#$%')).toBe(false);
        expect(isNpmPackage('')).toBe(false);
        expect(isNpmPackage(' ')).toBe(false);
      });

      it('should handle edge cases', () => {
        // Valid edge cases
        expect(isNpmPackage('a')).toBe(true); // single character
        expect(isNpmPackage('package-with-dashes')).toBe(true);
        expect(isNpmPackage('package_with_underscores')).toBe(true);
        expect(isNpmPackage('package.with.dots')).toBe(true);
        expect(isNpmPackage('package123')).toBe(true);

        // Invalid edge cases
        expect(isNpmPackage('-starts-with-dash')).toBe(false);
        expect(isNpmPackage('.starts-with-dot')).toBe(false);
        expect(isNpmPackage('_starts-with-underscore')).toBe(false);
        expect(isNpmPackage('@')).toBe(false); // just scope
        expect(isNpmPackage('@scope/')).toBe(false); // scope without package
        expect(isNpmPackage('@/package')).toBe(false); // empty scope
      });
    });

    describe('validateNpmPackage', () => {
      it('should accept valid package names', () => {
        expect(() => validateNpmPackage('express')).not.toThrow();
        expect(() => validateNpmPackage('@types/node')).not.toThrow();
        expect(() => validateNpmPackage('my-package')).not.toThrow();
      });

      it('should reject invalid package names with helpful errors', () => {
        expect(() => validateNpmPackage('')).toThrow('Package name cannot be empty');
        expect(() => validateNpmPackage('https://github.com/user/repo')).toThrow('Invalid npm package name');
        expect(() => validateNpmPackage('../local/path')).toThrow('Invalid npm package name');
      });
    });
  });

  describe('NPM Operations', () => {
    beforeEach(async () => {
      // Setup default mock for GlobalPackageManager.install
      mockInstall.mockResolvedValue({
        name: '@my-org/prompt-pack',
        version: '1.0.0',
        promptDirs: ['prompts'],
      });

      vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
    });

    describe('installFromNpm', () => {
      beforeEach(() => {
        vi.mocked(ConfigManager.load).mockResolvedValue({
          promptDirs: ['./.prompts'],
          version: '8.0.0',
          libraries: [],
        } as any);
      });

      it('should install npm package via GlobalPackageManager', async () => {
        mockInstall.mockResolvedValue({
          name: '@my-org/prompt-pack',
          version: '1.0.0',
          promptDirs: ['prompts'],
        });

        await installFromNpm('@my-org/prompt-pack');

        expect(mockInstall).toHaveBeenCalledWith('@my-org/prompt-pack');
      });

      it('should save config with NpmLibraryEntry in libraries array', async () => {
        mockInstall.mockResolvedValue({
          name: '@my-org/prompt-pack',
          version: '2.3.1',
          promptDirs: ['prompts'],
        });

        await installFromNpm('@my-org/prompt-pack');

        expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
          expect.objectContaining({
            libraries: expect.arrayContaining([
              expect.objectContaining({
                name: '@my-org/prompt-pack',
                type: 'npm',
                source: '@my-org/prompt-pack',
                promptDirs: ['prompts'],
                version: '2.3.1',
                installedAt: expect.any(String),
              })
            ])
          })
        );
      });

      it('should handle npm install errors', async () => {
        mockInstall.mockRejectedValue(new Error('Failed to install package: npm ERR! 404 Not Found'));

        await expect(installFromNpm('non-existent-package')).rejects.toThrow(
          'Failed to install package'
        );
      });

      it('should not install duplicate library entries', async () => {
        vi.mocked(ConfigManager.load).mockResolvedValue({
          promptDirs: ['./.prompts'],
          version: '8.0.0',
          libraries: [
            {
              name: 'existing-package',
              type: 'npm',
              source: 'existing-package',
              promptDirs: ['prompts'],
              installedAt: '2024-01-15T00:00:00.000Z',
              version: '1.0.0',
            }
          ],
        } as any);

        await expect(installFromNpm('existing-package')).rejects.toThrow(
          'Package "existing-package" is already installed'
        );

        expect(vi.mocked(ConfigManager.save)).not.toHaveBeenCalled();
      });
    });
  });
});
