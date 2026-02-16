import * as path from 'node:path';

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../../src/utils/logger.js';

let testDir: string;
vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock execa (needed by GlobalPackageManager)
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock GlobalPackageManager
const mockGpmUninstall = vi.fn();
const mockGpmEnsureInitialized = vi.fn();

vi.mock('../../src/services/package-manager.js', () => ({
  GlobalPackageManager: vi.fn().mockImplementation(() => ({
    uninstall: mockGpmUninstall,
    ensureInitialized: mockGpmEnsureInitialized,
  })),
}));

import fs from 'fs-extra';

import { uninstallCommand } from '../../src/commands/uninstall.js';
import { ConfigManager } from '../../src/config/config-manager.js';

vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ConfigManager: {
      ...original.ConfigManager,
      load: vi.fn(),
      save: vi.fn(),
    },
  };
});
vi.mock('../../src/utils/logger.js');

describe('uninstallCommand - npm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDir = '/tmp/test-pupt-uninstall-npm';
    vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
    vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run npm uninstall in packages dir', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: '@acme/prompts',
          type: 'npm' as const,
          source: '@acme/prompts',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    mockGpmUninstall.mockResolvedValue(undefined);

    await uninstallCommand('@acme/prompts');

    expect(mockGpmUninstall).toHaveBeenCalledWith('@acme/prompts');
  });

  it('should remove NpmLibraryEntry from config', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'git-lib',
          type: 'git' as const,
          source: 'https://github.com/user/git-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
        {
          name: 'npm-lib',
          type: 'npm' as const,
          source: 'npm-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    mockGpmUninstall.mockResolvedValue(undefined);

    await uninstallCommand('npm-lib');

    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: [
          expect.objectContaining({ name: 'git-lib', type: 'git' }),
        ],
      }),
    );
  });

  it('should handle npm uninstall failure gracefully', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'npm-lib',
          type: 'npm' as const,
          source: 'npm-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    mockGpmUninstall.mockRejectedValue(new Error('Permission denied'));

    // Should still succeed (remove from config) even if npm uninstall fails
    await uninstallCommand('npm-lib');

    // Should warn about failure
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('Failed to uninstall npm package'),
    );

    // Should still remove from config
    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: [],
      }),
    );
  });

  it('should still remove git libraries with fs.remove', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'my-git-lib',
          type: 'git' as const,
          source: 'https://github.com/user/my-git-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    vi.mocked(fs.remove).mockResolvedValue(undefined);

    await uninstallCommand('my-git-lib');

    // Should use fs.remove for git libraries
    expect(vi.mocked(fs.remove)).toHaveBeenCalled();
    // Should NOT use GlobalPackageManager for git libraries
    expect(mockGpmUninstall).not.toHaveBeenCalled();
  });
});
