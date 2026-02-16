import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import { configCommand } from '../../src/commands/config.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');
vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal() as typeof import('../../src/config/config-manager.js');
  return {
    ...original,
    ConfigManager: {
      ...original.ConfigManager,
      loadWithPath: vi.fn(),
    }
  };
});
vi.mock('fs-extra');

describe('Config Command', () => {
  let loggerLogSpy: ReturnType<typeof vi.fn>;

  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});

    // Set env vars so global paths are predictable in tests
    savedEnv.PUPT_CONFIG_DIR = process.env.PUPT_CONFIG_DIR;
    savedEnv.PUPT_DATA_DIR = process.env.PUPT_DATA_DIR;
    savedEnv.PUPT_CACHE_DIR = process.env.PUPT_CACHE_DIR;

    process.env.PUPT_CONFIG_DIR = '/test/config';
    process.env.PUPT_DATA_DIR = '/test/data';
    process.env.PUPT_CACHE_DIR = '/test/cache';
  });

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.clearAllMocks();
  });

  describe('--show option', () => {
    it('should display current configuration', async () => {
      const mockConfig = {
        promptDirs: ['/home/user/project/.prompts', 'node_modules/pkg/prompts'],
        historyDir: '/home/user/project/.pthistory',
        annotationDir: '/home/user/project/.pthistory',
        gitPromptDir: '.git-prompts',
        defaultCmd: 'claude',
        autoRun: true,
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/project/.pt-config.json',
        configDir: '/home/user/project'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await configCommand({ show: true });

      expect(loggerLogSpy).toHaveBeenCalled();
      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Prompt Directories');
      expect(allCalls).toContain('History Directory');
      expect(allCalls).toContain('.pt-config.json');
    });

    it('should display global directory paths', async () => {
      const mockConfig = {
        promptDirs: [],
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await configCommand({ show: true });

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Config dir');
      expect(allCalls).toContain('/test/config');
      expect(allCalls).toContain('Data dir');
      expect(allCalls).toContain('/test/data');
      expect(allCalls).toContain('Cache dir');
      expect(allCalls).toContain('/test/cache');
    });

    it('should display version from config', async () => {
      const mockConfig = {
        promptDirs: [],
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await configCommand({ show: true });

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Version');
      expect(allCalls).toContain('3.0.0');
    });

    it('should display output capture settings when present', async () => {
      const mockConfig = {
        promptDirs: [],
        version: '3.0.0',
        outputCapture: {
          enabled: true,
          directory: '/home/user/.pt-output'
        }
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await configCommand({ show: true });

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Output Capture');
      expect(allCalls).toContain('Output Directory');
    });

    it('should show warning when no config file found', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: { promptDirs: [], version: '3.0.0' },
        filepath: undefined,
        configDir: undefined
      });

      await configCommand({ show: true });

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('No config file found');
    });

    it('should indicate missing directories with cross mark', async () => {
      const mockConfig = {
        promptDirs: ['/nonexistent/path'],
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await configCommand({ show: true });

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('\u2717');
    });
  });

  describe('default behavior', () => {
    it('should show config when no options provided', async () => {
      const mockConfig = {
        promptDirs: ['./.prompts'],
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await configCommand({});

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Prompt Directories');
    });

    it('should show global paths when no options provided', async () => {
      const mockConfig = {
        promptDirs: [],
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await configCommand({});

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Config dir');
      expect(allCalls).toContain('Data dir');
      expect(allCalls).toContain('Cache dir');
    });
  });
});
