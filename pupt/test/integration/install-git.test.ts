import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { installCommand } from '../../src/commands/install.js';
import simpleGit from 'simple-git';
import { ConfigManager } from '../../src/config/config-manager.js';

let testDir: string;
vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    checkIsRepo: vi.fn(),
    init: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
  }))
}));

// Mock execa for npm tests
vi.mock('execa', () => ({
  execa: vi.fn()
}));

vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal() as typeof import('../../src/config/config-manager.js');
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

describe('Git Installation - Integration Tests', () => {
  const librariesDir = () => path.join(testDir, 'data', 'libraries');

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));

    // Create the data directories
    await fs.mkdir(path.join(testDir, 'data', 'libraries'), { recursive: true });

    // Setup ConfigManager mocks
    vi.mocked(ConfigManager.load).mockResolvedValue({
      promptDirs: ['./.prompts'],
      version: '8.0.0',
      libraries: []
    } as any);
    vi.mocked(ConfigManager.save).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('Full Git Installation Flow', () => {
    it('should clone repository and update configuration', { timeout: 10000 }, async () => {
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          // Simulate git clone by creating the expected directories
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
          await fs.writeFile(
            path.join(promptsDir, 'test-prompt.md'),
            '---\ntitle: Test Prompt\n---\nTest content'
          );
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Install from a mock repository URL
      await installCommand('https://github.com/user/mock-repo');

      // Verify git clone was called correctly
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/mock-repo',
        path.join(librariesDir(), 'mock-repo'),
        ['--depth', '1']
      );

      // Check config was saved with a GitLibraryEntry
      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'mock-repo',
              type: 'git',
              source: 'https://github.com/user/mock-repo',
              promptDirs: ['prompts'],
            })
          ])
        })
      );
    });

    it('should handle missing prompts directory gracefully', { timeout: 10000 }, async () => {
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          // Create repo without prompts directory
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(path.join(dir, 'README.md'), '# Test Repo');
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Install should succeed
      await installCommand('https://github.com/user/mock-repo-no-prompts');

      // Config should be saved with a library entry using default prompts dir
      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'mock-repo-no-prompts',
              type: 'git',
              source: 'https://github.com/user/mock-repo-no-prompts',
              promptDirs: ['prompts'],
            })
          ])
        })
      );
    });

    it('should not allow duplicate library names', { timeout: 10000 }, async () => {
      // First call: config has no libraries
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: []
      } as any);

      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Install first time
      await installCommand('https://github.com/user/mock-repo-duplicate');

      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledTimes(1);

      // Now simulate second install: config already has the library
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
        libraries: [
          {
            name: 'mock-repo-duplicate',
            type: 'git',
            source: 'https://github.com/user/mock-repo-duplicate',
            promptDirs: ['prompts'],
            installedAt: '2024-01-15T10:30:00.000Z',
          }
        ]
      } as any);
      vi.mocked(ConfigManager.save).mockClear();

      // Should throw because library already exists
      await expect(installCommand('https://github.com/user/mock-repo-duplicate')).rejects.toThrow(
        'Library "mock-repo-duplicate" is already installed'
      );
    });

    it('should reject non-git URLs with helpful error', async () => {
      // Mock execa to simulate npm install failure for invalid packages
      const execaMock = await import('execa');
      vi.mocked(execaMock.execa).mockRejectedValue(new Error('npm ERR! 404 Not Found'));

      await expect(installCommand('https://example.com')).rejects.toThrow('Invalid installation source');
      await expect(installCommand('ftp://example.com/repo')).rejects.toThrow('Invalid installation source');

      // This one will try npm install and fail
      await expect(installCommand('not-a-url')).rejects.toThrow('Failed to install package');
    });

    it('should install to libraries directory under data dir', { timeout: 10000 }, async () => {
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false),
        log: vi.fn().mockResolvedValue({ latest: { hash: 'abc12345deadbeef' } }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Install
      await installCommand('https://github.com/user/mock-repo-custom');

      // Check libraries directory was used
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/mock-repo-custom',
        path.join(librariesDir(), 'mock-repo-custom'),
        ['--depth', '1']
      );

      // Check config uses correct library entry
      expect(vi.mocked(ConfigManager.save)).toHaveBeenCalledWith(
        expect.objectContaining({
          libraries: expect.arrayContaining([
            expect.objectContaining({
              name: 'mock-repo-custom',
              type: 'git',
              source: 'https://github.com/user/mock-repo-custom',
              promptDirs: ['prompts'],
            })
          ])
        })
      );
    });
  });
});
