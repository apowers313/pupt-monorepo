import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
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
      contractPaths: vi.fn(),
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

  describe('fixPaths - annotationDir and gitPromptDir', () => {
    it('should include annotationDir and gitPromptDir in updated config', async () => {
      const projectDir = '/home/user/project';
      const mockConfig = {
        promptDirs: [path.join(projectDir, '.prompts')],
        historyDir: path.join(projectDir, '.pthistory'),
        annotationDir: path.join(projectDir, '.annotations'),
        gitPromptDir: path.join(projectDir, '.git-prompts'),
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: path.join(projectDir, '.pt-config.json'),
        configDir: projectDir
      });

      // contractPaths should return portable versions of all paths
      vi.mocked(ConfigManager.contractPaths).mockReturnValue({
        promptDirs: ['.prompts'],
        historyDir: '.pthistory',
        annotationDir: '.annotations',
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      });

      vi.mocked(fs.readJson).mockResolvedValue(mockConfig);
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      await configCommand({ fixPaths: true });

      // Verify writeJson was called with annotationDir and gitPromptDir
      expect(fs.writeJson).toHaveBeenCalledWith(
        path.join(projectDir, '.pt-config.json'),
        expect.objectContaining({
          annotationDir: '.annotations',
          gitPromptDir: '.git-prompts',
        }),
        { spaces: 2 }
      );

      // Verify annotationDir and gitPromptDir are logged
      const allCalls = loggerLogSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('annotationDir');
      expect(allCalls).toContain('.annotations');
      expect(allCalls).toContain('gitPromptDir');
      expect(allCalls).toContain('.git-prompts');
    });

    it('should not include annotationDir in config when not present', async () => {
      const projectDir = '/home/user/project';
      const mockConfig = {
        promptDirs: [path.join(projectDir, '.prompts')],
        historyDir: path.join(projectDir, '.pthistory'),
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: mockConfig,
        filepath: path.join(projectDir, '.pt-config.json'),
        configDir: projectDir
      });

      vi.mocked(ConfigManager.contractPaths).mockReturnValue({
        promptDirs: ['.prompts'],
        historyDir: '.pthistory',
        version: '3.0.0'
      });

      vi.mocked(fs.readJson).mockResolvedValue(mockConfig);
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      await configCommand({ fixPaths: true });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig).not.toHaveProperty('annotationDir');
      expect(writtenConfig).not.toHaveProperty('gitPromptDir');
    });
  });
});
