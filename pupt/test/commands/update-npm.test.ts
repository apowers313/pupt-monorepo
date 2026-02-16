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

// Mock simple-git
const mockPull = vi.fn();
const mockLog = vi.fn();
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    pull: mockPull,
    log: mockLog,
  })),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
  },
}));

// Mock cosmiconfig (needed by loadConfigFromDirectory)
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    load: vi.fn().mockResolvedValue(null),
    search: vi.fn(),
  })),
}));

// Mock execa (needed by GlobalPackageManager)
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock GlobalPackageManager
const mockGpmUpdate = vi.fn();
const mockGpmGetInstalledVersion = vi.fn();
const mockGpmDetectPromptDirs = vi.fn();
const mockGpmEnsureInitialized = vi.fn();

vi.mock('../../src/services/package-manager.js', () => ({
  GlobalPackageManager: vi.fn().mockImplementation(() => ({
    update: mockGpmUpdate,
    getInstalledVersion: mockGpmGetInstalledVersion,
    detectPromptDirs: mockGpmDetectPromptDirs,
    ensureInitialized: mockGpmEnsureInitialized,
  })),
}));

import fs from 'fs-extra';

import { updateCommand } from '../../src/commands/update.js';
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

describe('updateCommand - npm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDir = '/tmp/test-pupt-update-npm';
    vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
    vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
  });

  afterEach(() => {
  });

  it('should run npm update for specific package', async () => {
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
    mockGpmUpdate.mockResolvedValue(undefined);
    mockGpmGetInstalledVersion.mockResolvedValue('1.1.0');
    mockGpmDetectPromptDirs.mockResolvedValue(['prompts']);

    await updateCommand('@acme/prompts');

    expect(mockGpmUpdate).toHaveBeenCalledWith('@acme/prompts');
  });

  it('should update version in library entry', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'my-pkg',
          type: 'npm' as const,
          source: 'my-pkg',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    mockGpmUpdate.mockResolvedValue(undefined);
    mockGpmGetInstalledVersion.mockResolvedValue('2.0.0');
    mockGpmDetectPromptDirs.mockResolvedValue(['prompts']);

    await updateCommand('my-pkg');

    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: expect.arrayContaining([
          expect.objectContaining({
            name: 'my-pkg',
            version: '2.0.0',
          }),
        ]),
      }),
    );
  });

  it('should update all npm packages when no name given', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'pkg-a',
          type: 'npm' as const,
          source: 'pkg-a',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
        {
          name: 'pkg-b',
          type: 'npm' as const,
          source: 'pkg-b',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    mockGpmUpdate.mockResolvedValue(undefined);
    mockGpmGetInstalledVersion.mockResolvedValue('1.1.0');
    mockGpmDetectPromptDirs.mockResolvedValue(['prompts']);

    await updateCommand();

    // Should have been called for each npm library
    expect(mockGpmUpdate).toHaveBeenCalledTimes(2);
    expect(mockGpmUpdate).toHaveBeenCalledWith('pkg-a');
    expect(mockGpmUpdate).toHaveBeenCalledWith('pkg-b');
  });

  it('should update both git and npm libraries when no name given', async () => {
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
          version: 'abc1234',
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
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    mockPull.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ latest: { hash: 'def56789' } });
    mockGpmUpdate.mockResolvedValue(undefined);
    mockGpmGetInstalledVersion.mockResolvedValue('2.0.0');
    mockGpmDetectPromptDirs.mockResolvedValue(['prompts']);

    await updateCommand();

    // Git library should have been pulled
    expect(mockPull).toHaveBeenCalled();
    // NPM library should have been npm-updated
    expect(mockGpmUpdate).toHaveBeenCalledWith('npm-lib');
  });

  it('should re-detect promptDirs after npm update', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'my-pkg',
          type: 'npm' as const,
          source: 'my-pkg',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    mockGpmUpdate.mockResolvedValue(undefined);
    mockGpmGetInstalledVersion.mockResolvedValue('2.0.0');
    mockGpmDetectPromptDirs.mockResolvedValue(['new-prompts', 'extra-prompts']);

    await updateCommand('my-pkg');

    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: expect.arrayContaining([
          expect.objectContaining({
            name: 'my-pkg',
            promptDirs: ['new-prompts', 'extra-prompts'],
          }),
        ]),
      }),
    );
  });

  it('should handle npm update failure gracefully when updating all', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'good-pkg',
          type: 'npm' as const,
          source: 'good-pkg',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
        {
          name: 'bad-pkg',
          type: 'npm' as const,
          source: 'bad-pkg',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: '1.0.0',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);

    let callCount = 0;
    mockGpmUpdate.mockImplementation(async () => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Failed to update package "bad-pkg": Network error');
      }
    });
    mockGpmGetInstalledVersion.mockResolvedValue('1.1.0');
    mockGpmDetectPromptDirs.mockResolvedValue(['prompts']);

    await updateCommand();

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update "bad-pkg"'),
    );
    // Should still save config (good-pkg was updated)
    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalled();
  });
});
