import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initCommand } from '../../src/commands/init.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import * as inquirerPrompts from '@inquirer/prompts';

// Mock inquirer prompts
vi.mock('@inquirer/prompts');

describe('Init Command', () => {
  const testDir = path.join(os.tmpdir(), 'pt-init-test');
  const originalCwd = process.cwd();

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof initCommand).toBe('function');
    });

    it('should return a promise', () => {
      // Mock all prompts to prevent interactive behavior
      vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);
      
      const result = initCommand();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('existing config handling', () => {
    it('should prompt before overwriting existing config', async () => {
      // Create existing config
      await fs.writeJson('.pt-config.json', { promptDirs: ['./existing'] });

      // Mock user declining overwrite
      vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);

      await initCommand();

      // Config should remain unchanged
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toEqual(['./existing']);
    });

    it('should overwrite when user confirms', async () => {
      // Create existing config
      await fs.writeJson('.pt-config.json', { promptDirs: ['./existing'] });

      // Mock prompts
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)  // Overwrite
        .mockResolvedValueOnce(false); // No history

      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');

      await initCommand();

      // Config should be overwritten
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toEqual(['./prompts']);
    });
  });

  describe('directory creation', () => {
    it('should create prompt directory', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./my-prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false); // No history

      await initCommand();

      expect(await fs.pathExists('./my-prompts')).toBe(true);
    });

    it('should create history directory when enabled', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce('./prompts')
        .mockResolvedValueOnce('./.pthistory');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Enable history
        .mockResolvedValueOnce(false); // No annotations

      await initCommand();

      expect(await fs.pathExists('./.pthistory')).toBe(true);
    });

    it('should create annotation directory when enabled', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce('./prompts')
        .mockResolvedValueOnce('./.pthistory')
        .mockResolvedValueOnce('./.ptannotations');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)  // Enable history
        .mockResolvedValueOnce(true); // Enable annotations

      await initCommand();

      expect(await fs.pathExists('./.ptannotations')).toBe(true);
    });

    it('should handle existing directories gracefully', async () => {
      // Pre-create directory
      await fs.ensureDir('./prompts');
      
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');
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

      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toEqual(['./prompts']);
    });

    it('should use default history directory', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockImplementation(async (config) => {
          return (config as any).default || '';
        });
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)   // Enable history
        .mockResolvedValueOnce(false); // No annotations

      await initCommand();

      const config = await fs.readJson('.pt-config.json');
      expect(config.historyDir).toBe('./.pthistory');
    });

    it('should only ask about annotations if history is enabled', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(false); // No history

      await initCommand();

      // Should only be called once (for history)
      expect(vi.mocked(inquirerPrompts.confirm)).toHaveBeenCalledTimes(1);
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
    it('should create valid JSON config', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson('.pt-config.json');
      expect(config).toBeDefined();
      expect(Array.isArray(config.promptDirs)).toBe(true);
    });

    it('should include default coding tool settings', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson('.pt-config.json');
      expect(config.defaultCmd).toBe('claude');
      expect(config.defaultCmdArgs).toEqual([]);
      expect(config.defaultCmdOptions).toEqual({
        'Continue with last context?': '--continue'
      });
      expect(config.version).toBe('3.0.0');
    });

    it('should only include historyDir when enabled', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false); // No history

      await initCommand();

      const config = await fs.readJson('.pt-config.json');
      expect(config.historyDir).toBeUndefined();
    });

    it('should include both history and annotation dirs when enabled', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce('./prompts')
        .mockResolvedValueOnce('./.pthistory')
        .mockResolvedValueOnce('./.ptannotations');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValueOnce(true)  // Enable history
        .mockResolvedValueOnce(true); // Enable annotations

      await initCommand();

      const config = await fs.readJson('.pt-config.json');
      expect(config.historyDir).toBe('./.pthistory');
      expect(config.annotationDir).toBe('./.ptannotations');
    });

    it('should resolve relative paths', async () => {
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('../prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      const config = await fs.readJson('.pt-config.json');
      // Should store relative path in config
      expect(config.promptDirs).toEqual(['../prompts']);
      // But directory should be created at resolved location
      expect(await fs.pathExists(path.resolve('../prompts'))).toBe(true);
    });
  });

  describe('success messaging', () => {
    it('should log success message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValue('./prompts');
      vi.mocked(inquirerPrompts.confirm)
        .mockResolvedValue(false);

      await initCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration created successfully')
      );

      consoleSpy.mockRestore();
    });
  });
});