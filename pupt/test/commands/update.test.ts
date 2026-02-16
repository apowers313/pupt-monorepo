import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
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

import { updateCommand } from '../../src/commands/update.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import fs from 'fs-extra';

vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal() as typeof import('../../src/config/config-manager.js');
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

describe('updateCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDir = '/tmp/test-pupt-update';
    vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
    vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should git pull in library directory', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'my-lib',
          type: 'git' as const,
          source: 'https://github.com/user/my-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: 'abc1234',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    mockPull.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ latest: { hash: 'def56789abcdef' } });

    await updateCommand('my-lib');

    expect(mockPull).toHaveBeenCalled();
  });

  it('should update version field with new commit hash', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'my-lib',
          type: 'git' as const,
          source: 'https://github.com/user/my-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: 'abc1234',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    mockPull.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ latest: { hash: 'def56789abcdef' } });

    await updateCommand('my-lib');

    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: expect.arrayContaining([
          expect.objectContaining({
            name: 'my-lib',
            version: 'def56789',
          }),
        ]),
      }),
    );
  });

  it('should update specific library by name', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'lib-a',
          type: 'git' as const,
          source: 'https://github.com/user/lib-a',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: 'aaa1111',
        },
        {
          name: 'lib-b',
          type: 'git' as const,
          source: 'https://github.com/user/lib-b',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
          version: 'bbb2222',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    mockPull.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ latest: { hash: 'newwwwww12345678' } });

    await updateCommand('lib-a');

    // Only lib-a should be updated
    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: expect.arrayContaining([
          expect.objectContaining({ name: 'lib-a', version: 'newwwwww' }),
          expect.objectContaining({ name: 'lib-b', version: 'bbb2222' }),
        ]),
      }),
    );
  });

  it('should update all libraries when no name given', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'lib-a',
          type: 'git' as const,
          source: 'https://github.com/user/lib-a',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
        {
          name: 'lib-b',
          type: 'git' as const,
          source: 'https://github.com/user/lib-b',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    mockPull.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ latest: { hash: 'abc12345ffffffff' } });

    await updateCommand();

    // Both should have been pulled
    expect(mockPull).toHaveBeenCalledTimes(2);
  });

  it('should re-discover promptDirs if library config changed', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockExplorer = {
      load: vi.fn().mockImplementation(async (configPath: string) => {
        if (configPath.includes('.pt-config.json')) {
          return {
            config: {
              promptDirs: ['new-prompts', 'extra-prompts'],
            },
          };
        }
        return null;
      }),
      search: vi.fn(),
    };
    vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'my-lib',
          type: 'git' as const,
          source: 'https://github.com/user/my-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    mockPull.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ latest: { hash: 'abc12345' } });

    await updateCommand('my-lib');

    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: expect.arrayContaining([
          expect.objectContaining({
            name: 'my-lib',
            promptDirs: ['new-prompts', 'extra-prompts'],
          }),
        ]),
      }),
    );
  });

  it('should report error if library directory does not exist', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'missing-lib',
          type: 'git' as const,
          source: 'https://github.com/user/missing-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(false as any);

    await expect(updateCommand('missing-lib')).rejects.toThrow(
      'Library directory not found',
    );
  });

  it('should throw when library name is not found', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'other-lib',
          type: 'git' as const,
          source: 'https://github.com/user/other-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);

    await expect(updateCommand('nonexistent')).rejects.toThrow(
      'Library "nonexistent" not found',
    );
  });

  it('should log message when no libraries installed', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);

    await updateCommand();

    expect(vi.mocked(logger.log)).toHaveBeenCalledWith(
      expect.stringContaining('No libraries installed'),
    );
  });

  it('should handle git pull errors gracefully when updating all', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'good-lib',
          type: 'git' as const,
          source: 'https://github.com/user/good-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
        {
          name: 'bad-lib',
          type: 'git' as const,
          source: 'https://github.com/user/bad-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);

    let callCount = 0;
    mockPull.mockImplementation(async () => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Network error');
      }
    });
    mockLog.mockResolvedValue({ latest: { hash: 'abc12345' } });

    await updateCommand();

    // Should log error for bad-lib but continue
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update "bad-lib"'),
    );
    // Should still save config (good-lib was updated)
    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalled();
  });
});
