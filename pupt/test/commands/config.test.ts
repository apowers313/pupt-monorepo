import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
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
      contractPaths: original.ConfigManager.contractPaths
    }
  };
});
vi.mock('fs-extra');

describe('Config Command', () => {
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
      // Check that key information is displayed
      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Prompt Directories');
      expect(allCalls).toContain('History Directory');
      expect(allCalls).toContain('.pt-config.json');
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

    it('should indicate missing directories with ✗', async () => {
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
      expect(allCalls).toContain('✗');
    });
  });

  describe('--fix-paths option', () => {
    it('should convert absolute paths to portable format', async () => {
      const projectDir = '/home/user/project';
      const mockConfig = {
        promptDirs: [
          path.join(projectDir, '.prompts'),
          'node_modules/pkg/prompts'
        ],
        historyDir: path.join(projectDir, '.pthistory'),
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: path.join(projectDir, '.pt-config.json'),
        configDir: projectDir
      });

      vi.mocked(fs.readJson).mockResolvedValue(mockConfig);
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      await configCommand({ fixPaths: true });

      expect(fs.writeJson).toHaveBeenCalledWith(
        path.join(projectDir, '.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            'node_modules/pkg/prompts'
          ])
        }),
        { spaces: 2 }
      );

      // Check success message
      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Config paths updated');
    });

    it('should error when no config file exists', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: { promptDirs: [], version: '3.0.0' },
        filepath: undefined,
        configDir: undefined
      });

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(configCommand({ fixPaths: true })).rejects.toThrow('process.exit called');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No config file found')
      );

      mockExit.mockRestore();
    });

    it('should preserve unknown fields in config', async () => {
      const projectDir = '/home/user/project';
      const mockConfig = {
        promptDirs: [path.join(projectDir, '.prompts')],
        version: '3.0.0'
      };

      const originalFileContent = {
        ...mockConfig,
        customField: 'should be preserved',
        anotherField: { nested: true }
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: path.join(projectDir, '.pt-config.json'),
        configDir: projectDir
      });

      vi.mocked(fs.readJson).mockResolvedValue(originalFileContent);
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      await configCommand({ fixPaths: true });

      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          customField: 'should be preserved',
          anotherField: { nested: true }
        }),
        { spaces: 2 }
      );
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
  });
});
