import * as nodeFs from 'node:fs/promises';

import fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installCommand } from '../../src/commands/install.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';

let testDir: string;
vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Mock execa (still needed as a transitive dependency)
vi.mock('execa', () => ({
  execa: vi.fn()
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    checkIsRepo: vi.fn().mockResolvedValue(false),
    log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
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

// Mock ConfigManager to use test configs
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

vi.mock('../../src/utils/logger.js');

describe('NPM Installation Integration Tests', () => {
  let loggerLogSpy: any;
  let loggerErrorSpy: any;

  beforeEach(async () => {
    // Create temp directory
    testDir = await nodeFs.mkdtemp(path.join(os.tmpdir(), `pt-test-npm-`));

    // Create data directories
    await fs.ensureDir(path.join(testDir, 'data', 'packages'));

    // Mock ConfigManager
    vi.mocked(ConfigManager.load).mockResolvedValue({
      version: '8.0.0',
      promptDirs: ['./.prompts'],
      libraries: [],
    } as any);
    vi.mocked(ConfigManager.save).mockResolvedValue(undefined);

    // Setup default GlobalPackageManager.install mock
    mockInstall.mockResolvedValue({
      name: 'my-prompts',
      version: '1.0.0',
      promptDirs: ['prompts'],
    });

    // Setup console spies
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Full NPM Installation Flow', () => {
    it('should install a regular npm package', async () => {
      // Mock successful install returning package info
      mockInstall.mockResolvedValue({
        name: 'my-prompts',
        version: '1.0.0',
        promptDirs: ['prompts'],
      });

      // Run install command
      await installCommand('my-prompts');

      // Verify GlobalPackageManager.install was called
      expect(mockInstall).toHaveBeenCalledWith('my-prompts');

      // Verify config was saved with NpmLibraryEntry
      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'my-prompts',
              type: 'npm',
              source: 'my-prompts',
              promptDirs: ['prompts'],
              version: '1.0.0',
              installedAt: expect.any(String),
            })
          ])
        })
      );

      // Verify console output
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('my-prompts'));
    });

    it('should install a scoped npm package', async () => {
      // Mock successful install returning package info
      mockInstall.mockResolvedValue({
        name: '@myorg/prompts',
        version: '2.0.0',
        promptDirs: ['prompts'],
      });

      // Run install command
      await installCommand('@myorg/prompts');

      // Verify GlobalPackageManager.install was called
      expect(mockInstall).toHaveBeenCalledWith('@myorg/prompts');

      // Verify config was saved with NpmLibraryEntry
      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: '@myorg/prompts',
              type: 'npm',
              source: '@myorg/prompts',
              promptDirs: ['prompts'],
              version: '2.0.0',
              installedAt: expect.any(String),
            })
          ])
        })
      );
    });

    it('should handle npm install failure', async () => {
      // Mock failed npm install
      mockInstall.mockRejectedValue(new Error('Failed to install package: npm ERR! 404 Not Found'));

      await expect(installCommand('non-existent-package')).rejects.toThrow(
        'Failed to install package'
      );
    });

    it('should not duplicate existing library entries', async () => {
      // Create config with existing library entry
      vi.mocked(ConfigManager.load).mockResolvedValue({
        version: '8.0.0',
        promptDirs: ['./.prompts'],
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

      // Run install command - should throw for duplicate
      await expect(installCommand('existing-package')).rejects.toThrow(
        'Package "existing-package" is already installed'
      );

      // Verify config was not saved (library already exists)
      expect(vi.mocked(ConfigManager.save)).not.toHaveBeenCalled();

      // Verify install was not called (duplicate check happens before install)
      expect(mockInstall).not.toHaveBeenCalled();
    });

    it('should handle invalid installation sources', async () => {
      await expect(installCommand('https://not-git-or-npm')).rejects.toThrow(
        'Invalid installation source'
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('neither a valid git URL nor an npm package name')
      );
    });

    it('should differentiate between git URLs and npm packages', async () => {
      // Test npm package - should use GlobalPackageManager
      mockInstall.mockResolvedValue({
        name: 'npm-package',
        version: '1.0.0',
        promptDirs: ['prompts'],
      });

      await installCommand('npm-package');
      expect(mockInstall).toHaveBeenCalledWith('npm-package');

      // Reset mocks
      mockInstall.mockClear();
      vi.mocked(ConfigManager.save).mockClear();
      vi.mocked(ConfigManager.load).mockResolvedValue({
        version: '8.0.0',
        promptDirs: ['./.prompts'],
        libraries: []
      } as any);

      // Mock simple-git to simulate successful git operation
      const simpleGitMock = await import('simple-git');
      const mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };
      vi.mocked(simpleGitMock.default).mockReturnValue(mockGit as any);

      // Test git URL - should use git, not GlobalPackageManager
      await installCommand('https://github.com/user/repo');
      expect(mockInstall).not.toHaveBeenCalled(); // npm should not be called for git URLs
      expect(mockGit.clone).toHaveBeenCalled(); // git should be called instead
    });
  });
});
