import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { configCommand } from '../../src/commands/config.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');
vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ConfigManager: {
      ...original.ConfigManager,
      loadWithPath: vi.fn(),
    }
  };
});
vi.mock('fs-extra');

describe('Config Command - additional coverage', () => {
  let loggerLogSpy: ReturnType<typeof vi.fn>;
  let loggerErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('showConfig - defaultCmdArgs display', () => {
    it('should display default command args when configured', async () => {
      const mockConfig = {
        promptDirs: ['/home/user/.prompts'],
        defaultCmd: 'claude',
        defaultCmdArgs: ['--permission-mode', 'acceptEdits'],
        autoRun: false,
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
      expect(allCalls).toContain('Default Command');
      expect(allCalls).toContain('claude');
      expect(allCalls).toContain('Default Args');
      expect(allCalls).toContain('--permission-mode acceptEdits');
    });

    it('should not display default args when defaultCmdArgs is empty', async () => {
      const mockConfig = {
        promptDirs: [],
        defaultCmd: 'claude',
        defaultCmdArgs: [],
        autoRun: false,
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
      expect(allCalls).toContain('Default Command');
      expect(allCalls).not.toContain('Default Args');
    });

    it('should show non-existing history and annotation directories with red X', async () => {
      const mockConfig = {
        promptDirs: [],
        historyDir: '/nonexistent/history',
        annotationDir: '/nonexistent/annotations',
        autoRun: false,
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
      expect(allCalls).toContain('History Directory');
      expect(allCalls).toContain('Annotation Directory');
    });

    it('should display empty prompt dirs message', async () => {
      const mockConfig = {
        promptDirs: [],
        autoRun: false,
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: '/home/user/.pt-config.json',
        configDir: '/home/user'
      });

      await configCommand({ show: true });

      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('(none)');
    });
  });

});
