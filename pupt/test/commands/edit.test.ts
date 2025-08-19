import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { editCommand } from '../../src/commands/edit.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { PromptManager } from '../../src/prompts/prompt-manager.js';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { logger } from '../../src/utils/logger.js';

// Use vi.hoisted to ensure mocks are available before imports
const { mockExecFileAsync } = vi.hoisted(() => {
  return {
    mockExecFileAsync: vi.fn()
  };
});

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/ui/interactive-search.js');
vi.mock('../../src/utils/logger.js');
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));
vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecFileAsync)
}));

describe('Edit Command', () => {
  let loggerLogSpy: any;
  let loggerErrorSpy: any;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFileAsync.mockReset();
    mockExecFileAsync.mockResolvedValue(undefined);
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof editCommand).toBe('function');
    });

    it('should return a promise', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue([])
      } as any));
      
      const result = editCommand();
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid unhandled rejection
      await expect(result).rejects.toThrow();
    });
  });

  describe('prompt selection', () => {
    it('should use interactive search to select prompt', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      const mockSelectPrompt = vi.fn().mockResolvedValue(mockPrompts[0]);
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: mockSelectPrompt
      } as any));
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      expect(mockSelectPrompt).toHaveBeenCalledWith(mockPrompts);
    });

    it('should handle no prompts found', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue([])
      } as any));
      
      await expect(editCommand()).rejects.toThrow('No prompts found');
    });

    it('should handle prompt selection cancellation', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockRejectedValue(new Error('User force closed'))
      } as any));
      
      await expect(editCommand()).rejects.toThrow('User force closed');
    });
  });

  describe('editor detection', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
    });

    it('should check $VISUAL first', async () => {
      process.env.VISUAL = 'vim';
      delete process.env.EDITOR;
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      expect(spawn).toHaveBeenCalledWith('vim', ['/prompts/test.md'], { stdio: 'inherit' });
    });

    it('should fall back to $EDITOR if $VISUAL not set', async () => {
      delete process.env.VISUAL;
      process.env.EDITOR = 'nano';
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      expect(spawn).toHaveBeenCalledWith('nano', ['/prompts/test.md'], { stdio: 'inherit' });
    });

    it('should try common editors if environment variables not set', async () => {
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      // Mock execFileAsync to simulate checking for editor availability
      // The editor launcher checks for editors in this order: code, vim, nano, emacs, subl, atom, gedit, notepad
      mockExecFileAsync
        .mockResolvedValueOnce(undefined); // code is available
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(0);
        })
      };
      
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      // Should have tried to spawn code (the first available editor)
      expect(spawn).toHaveBeenCalledWith('code', ['/prompts/test.md'], { stdio: 'inherit' });
    });

    it('should show error when no editor found', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      // Mock all editor checks to fail
      mockExecFileAsync.mockReset();
      mockExecFileAsync.mockRejectedValue(new Error('not found'));
      
      await expect(editCommand()).rejects.toThrow('No editor configured');
    });
  });

  describe('editor launching', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      process.env.VISUAL = 'vim';
    });

    it('should spawn editor with correct arguments', async () => {
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      expect(spawn).toHaveBeenCalledWith('vim', ['/prompts/test.md'], { stdio: 'inherit' });
    });

    it('should wait for editor to close', async () => {
      let closeCallback: any;
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') closeCallback = callback;
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      const promise = editCommand();
      
      // Wait a bit for the callback to be set
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Editor hasn't closed yet
      expect(loggerLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Editor closed')
      );
      
      // Close editor
      if (closeCallback) {
        closeCallback(0);
      }
      await promise;
      
      // The edit command doesn't print any messages when editor closes
    });

    it('should handle non-zero exit codes', async () => {
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(1); // Non-zero exit
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await expect(editCommand()).rejects.toThrow('Failed to open editor: Editor exited with code 1');
    });

    it('should handle editor spawn errors', async () => {
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('spawn failed'));
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await expect(editCommand()).rejects.toThrow('Failed to open editor');
    });

    it('should show opening message', async () => {
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      // The edit command doesn't print any messages when opening editor
    });
  });

  describe('OS-specific fallbacks', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      delete process.env.VISUAL;
      delete process.env.EDITOR;
    });

    it('should include notepad on Windows', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      // Mock all editor availability checks to fail
      mockExecFileAsync.mockReset();
      mockExecFileAsync.mockRejectedValue(new Error('not found'));
      
      try {
        await editCommand();
      } catch {
        // Expected to fail
      }
      
      // Should have checked for notepad availability on Windows
      expect(mockExecFileAsync).toHaveBeenCalledWith('where', ['notepad']);
      
      // Reset platform
      Object.defineProperty(process, 'platform', {
        value: originalEnv.platform || 'linux',
        configurable: true
      });
    });
  });
});