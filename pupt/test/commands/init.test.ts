import * as inquirerPrompts from '@inquirer/prompts';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initCommand } from '../../src/commands/init.js';
import { logger } from '../../src/utils/logger.js';

// Mock inquirer prompts
vi.mock('@inquirer/prompts');

vi.mock('../../src/utils/logger.js');
// Mock tool detection
vi.mock('../../src/utils/tool-detection.js', () => ({
  detectInstalledTools: vi.fn(() => []),
  getToolByName: vi.fn()
}));

describe('Init Command', () => {
  const testBaseDir = path.join(os.tmpdir(), 'pt-init-test');
  let configDir: string;
  let dataDir: string;
  let configPath: string;
  let savedEnv: { PUPT_CONFIG_DIR?: string; PUPT_DATA_DIR?: string };

  beforeEach(async () => {
    // Create unique temp dirs for each test
    configDir = path.join(testBaseDir, 'config');
    dataDir = path.join(testBaseDir, 'data');
    configPath = path.join(configDir, 'config.json');

    await fs.ensureDir(configDir);
    await fs.ensureDir(dataDir);

    // Save and set env vars so global-paths resolves to our temp dirs
    savedEnv = {
      PUPT_CONFIG_DIR: process.env.PUPT_CONFIG_DIR,
      PUPT_DATA_DIR: process.env.PUPT_DATA_DIR,
    };
    process.env.PUPT_CONFIG_DIR = configDir;
    process.env.PUPT_DATA_DIR = dataDir;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Restore env vars
    if (savedEnv.PUPT_CONFIG_DIR === undefined) {
      delete process.env.PUPT_CONFIG_DIR;
    } else {
      process.env.PUPT_CONFIG_DIR = savedEnv.PUPT_CONFIG_DIR;
    }
    if (savedEnv.PUPT_DATA_DIR === undefined) {
      delete process.env.PUPT_DATA_DIR;
    } else {
      process.env.PUPT_DATA_DIR = savedEnv.PUPT_DATA_DIR;
    }
    await fs.remove(testBaseDir);
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof initCommand).toBe('function');
    });

    it('should return a promise', async () => {
      // Mock all prompts to prevent interactive behavior
      // initCommand checks for existing config first; since none exists it goes to input
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      const result = initCommand();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe('existing config handling', () => {
    it('should prompt before reconfiguring existing config', async () => {
      // Create existing config at the global config path
      await fs.writeJson(configPath, { promptDirs: ['./existing'] });

      // Mock user declining reconfigure
      vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);

      await initCommand();

      // Config should remain unchanged
      const config = await fs.readJson(configPath);
      expect(config.promptDirs).toEqual(['./existing']);
    });

    it('should reconfigure when user confirms', async () => {
      // Create existing config at the global config path
      await fs.writeJson(configPath, { promptDirs: ['./existing'] });

      // Mock prompts
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Reconfigure
        .mockResolvedValueOnce(true);  // Enable output capture

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));

      await initCommand();

      // Config should be overwritten
      const config = await fs.readJson(configPath);
      expect(config.promptDirs).toEqual([path.join(dataDir, 'prompts')]);
    });
  });

  describe('directory creation', () => {
    it('should create prompt directory', async () => {
      const promptDir = path.join(dataDir, 'my-prompts');
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(promptDir);
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false); // No output capture

      await initCommand();

      expect(await fs.pathExists(promptDir)).toBe(true);
    });

    it('should create history directory', async () => {
      const historyDir = path.join(dataDir, 'history');
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce(path.join(dataDir, 'prompts'))
        .mockResolvedValueOnce(historyDir)
        .mockResolvedValueOnce(historyDir)
        .mockResolvedValueOnce(path.join(dataDir, 'output'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Enable history
        .mockResolvedValueOnce(true)   // Enable annotations
        .mockResolvedValueOnce(true);  // Enable output capture

      await initCommand();

      expect(await fs.pathExists(historyDir)).toBe(true);
    });

    it('should create output directory when output capture is enabled', async () => {
      const outputDir = path.join(dataDir, 'output');
      const historyDir = path.join(dataDir, 'history');
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce(path.join(dataDir, 'prompts'))
        .mockResolvedValueOnce(historyDir)
        .mockResolvedValueOnce(historyDir)
        .mockResolvedValueOnce(outputDir);
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Enable history
        .mockResolvedValueOnce(true)   // Enable annotations
        .mockResolvedValueOnce(true);  // Enable output capture

      await initCommand();

      expect(await fs.pathExists(outputDir)).toBe(true);
    });

    it('should handle existing directories gracefully', async () => {
      // Pre-create directory
      const promptDir = path.join(dataDir, 'prompts');
      await fs.ensureDir(promptDir);

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(promptDir);
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      // Should not throw
      await expect(initCommand()).resolves.not.toThrow();
    });
  });

  describe('interactive prompts', () => {
    it('should use default prompt directory', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockImplementation(async (config) => {
          // Return the default value
          return (config as any).default || '';
        });
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson(configPath);
      // Default is path.join(dataDir, 'prompts')
      expect(config.promptDirs).toEqual([path.join(dataDir, 'prompts')]);
    });

    it('should expand home directory paths', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('~/prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const expectedPath = path.join(os.homedir(), 'prompts');
      expect(await fs.pathExists(expectedPath)).toBe(true);
    });
  });

  describe('config file generation', () => {
    it('should create valid JSON config at global config path', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config).toBeDefined();
      expect(Array.isArray(config.promptDirs)).toBe(true);
    });

    it('should not include default tool settings when no tools are detected', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.defaultCmd).toBeUndefined();
      expect(config.defaultCmdArgs).toBeUndefined();
      expect(config.defaultCmdOptions).toBeUndefined();
      expect(config.autoRun).toBe(false);
      expect(config.version).toBe('8.0.0');
    });

    it('should prompt for tool selection when Claude is detected', async () => {
      const { detectInstalledTools, getToolByName } = await import('../../src/utils/tool-detection.js');

      vi.mocked(detectInstalledTools).mockReturnValue([{
        name: 'claude',
        displayName: 'Claude',
        command: 'claude',
        defaultArgs: ['--permission-mode', 'acceptEdits'],
        defaultOptions: { 'Continue with last context?': '--continue' }
      }]);

      vi.mocked(getToolByName).mockReturnValue({
        name: 'claude',
        displayName: 'Claude',
        command: 'claude',
        defaultArgs: ['--permission-mode', 'acceptEdits'],
        defaultOptions: { 'Continue with last context?': '--continue' }
      });

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(true); // Enable output capture
      vi.mocked(inquirerPrompts.select)
        .mockResolvedValue('claude');

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual(['--permission-mode', 'acceptEdits']);
      expect(config.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(config.autoRun).toBe(true);
    });

    it('should prompt for tool selection when Kiro is detected', async () => {
      const { detectInstalledTools, getToolByName } = await import('../../src/utils/tool-detection.js');

      vi.mocked(detectInstalledTools).mockReturnValue([{
        name: 'kiro',
        displayName: 'Kiro',
        command: 'kiro-cli',
        defaultArgs: ['chat'],
        defaultOptions: {}
      }]);

      vi.mocked(getToolByName).mockReturnValue({
        name: 'kiro',
        displayName: 'Kiro',
        command: 'kiro-cli',
        defaultArgs: ['chat'],
        defaultOptions: {}
      });

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(true); // Enable output capture
      vi.mocked(inquirerPrompts.select)
        .mockResolvedValue('kiro');

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.defaultCmd).toBe('kiro-cli');
      expect(config.defaultCmdArgs).toEqual(['chat']);
      expect(config.defaultCmdOptions).toBeUndefined();
      expect(config.autoRun).toBe(true);
    });

    it('should not set defaultCmd when user selects none', async () => {
      const { detectInstalledTools } = await import('../../src/utils/tool-detection.js');

      vi.mocked(detectInstalledTools).mockReturnValue([{
        name: 'claude',
        displayName: 'Claude',
        command: 'claude',
        defaultArgs: ['--permission-mode', 'acceptEdits'],
        defaultOptions: { 'Continue with last context?': '--continue' }
      }]);

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);
      vi.mocked(inquirerPrompts.select)
        .mockResolvedValue('none');

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.defaultCmd).toBeUndefined();
      expect(config.defaultCmdArgs).toBeUndefined();
      expect(config.defaultCmdOptions).toBeUndefined();
      expect(config.autoRun).toBe(false);
    });

    it('should include historyDir and annotationDir pointing to data history', async () => {
      const expectedHistoryDir = path.join(dataDir, 'history');
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce(path.join(dataDir, 'prompts'))
        .mockResolvedValueOnce(expectedHistoryDir)
        .mockResolvedValueOnce(expectedHistoryDir)
        .mockResolvedValueOnce(path.join(dataDir, 'output'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Enable history
        .mockResolvedValueOnce(true)   // Enable annotations
        .mockResolvedValueOnce(true);  // Enable output capture

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.historyDir).toBe(expectedHistoryDir);
      expect(config.annotationDir).toBe(expectedHistoryDir);
    });

    it('should include libraries as empty array', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.libraries).toEqual([]);
    });
  });

  describe('success messaging', () => {
    it('should log success message', async () => {
      const loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration created successfully')
      );

      loggerLogSpy.mockRestore();
    });
  });

  describe('config completeness', () => {
    it('should create config with all required fields', async () => {
      const expectedHistoryDir = path.join(dataDir, 'history');
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce(path.join(dataDir, 'prompts'))
        .mockResolvedValueOnce(expectedHistoryDir)
        .mockResolvedValueOnce(expectedHistoryDir)
        .mockResolvedValueOnce(path.join(dataDir, 'output'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Enable history
        .mockResolvedValueOnce(true)   // Enable annotations
        .mockResolvedValueOnce(true);  // Enable output capture

      await initCommand();

      const config = await fs.readJson(configPath);

      // Should have version 8.0.0
      expect(config.version).toBe('8.0.0');

      // Should have outputCapture with enabled true by default
      expect(config.outputCapture).toBeDefined();
      expect(config.outputCapture.enabled).toBe(true);
      expect(config.outputCapture.maxSizeMB).toBe(50);
      expect(config.outputCapture.retentionDays).toBe(30);
      expect(config.outputCapture.directory).toBe(path.join(dataDir, 'output'));

      // Should have historyDir and annotationDir
      expect(config.historyDir).toBe(expectedHistoryDir);
      expect(config.annotationDir).toBe(expectedHistoryDir);

      // Should have libraries as empty array
      expect(config.libraries).toEqual([]);

      // Should NOT have autoAnnotate (feature removed)
      expect(config.autoAnnotate).toBeUndefined();
    });

    it('should not include outputCapture when user declines', async () => {
      const expectedHistoryDir = path.join(dataDir, 'history');
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce(path.join(dataDir, 'prompts'))
        .mockResolvedValueOnce(expectedHistoryDir)
        .mockResolvedValueOnce(expectedHistoryDir);
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)    // Enable history
        .mockResolvedValueOnce(true)    // Enable annotations
        .mockResolvedValueOnce(false);  // Decline output capture

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.outputCapture).toBeUndefined();
    });

    it('should not include history or outputCapture when history is disabled', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue(path.join(dataDir, 'prompts'));
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(false);  // Disable history

      await initCommand();

      const config = await fs.readJson(configPath);
      expect(config.historyDir).toBeUndefined();
      expect(config.annotationDir).toBeUndefined();
      expect(config.outputCapture).toBeUndefined();
    });
  });
});
