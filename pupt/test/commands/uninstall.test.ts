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

describe('uninstallCommand', () => {
  const dataDir = () => path.join(testDir, 'data');
  const librariesDir = () => path.join(dataDir(), 'libraries');

  beforeEach(() => {
    vi.clearAllMocks();
    testDir = '/tmp/test-pupt-uninstall';
    vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
    vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should remove library directory from {dataDir}/libraries/', async () => {
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
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);
    vi.mocked(fs.pathExists).mockResolvedValue(true as any);
    vi.mocked(fs.remove).mockResolvedValue(undefined);

    await uninstallCommand('my-lib');

    expect(vi.mocked(fs.remove)).toHaveBeenCalledWith(
      path.join(librariesDir(), 'my-lib'),
    );
  });

  it('should remove LibraryEntry from global config', async () => {
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
    vi.mocked(fs.remove).mockResolvedValue(undefined);

    await uninstallCommand('lib-a');

    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: [
          expect.objectContaining({ name: 'lib-b' }),
        ],
      }),
    );
  });

  it('should error if library name not found', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [
        {
          name: 'existing-lib',
          type: 'git' as const,
          source: 'https://github.com/user/existing-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15',
        },
      ],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);

    await expect(uninstallCommand('nonexistent')).rejects.toThrow(
      'Library "nonexistent" not found',
    );
  });

  it('should error when no name provided', async () => {
    await expect(uninstallCommand('')).rejects.toThrow(
      'Please provide a library name',
    );
  });

  it('should handle missing library directory gracefully', async () => {
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
    vi.mocked(fs.pathExists).mockResolvedValue(false as any);

    // Should succeed even if directory doesn't exist
    await uninstallCommand('my-lib');

    // Should NOT call remove since directory doesn't exist
    expect(vi.mocked(fs.remove)).not.toHaveBeenCalled();

    // Should still remove from config
    expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
      expect.objectContaining({
        libraries: [],
      }),
    );
  });

  it('should handle empty libraries array', async () => {
    const config = {
      promptDirs: ['/home/user/prompts'],
      version: '8.0.0',
      libraries: [],
    };
    vi.mocked(ConfigManager.load).mockResolvedValue(config as any);

    await expect(uninstallCommand('anything')).rejects.toThrow(
      'Library "anything" not found',
    );
  });
});
