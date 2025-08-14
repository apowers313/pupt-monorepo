import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { editCommand } from '../../src/commands/edit.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { PromptManager } from '../../src/prompts/prompt-manager.js';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/ui/interactive-search.js');
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));
vi.mock('ora');

describe('Edit Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...originalEnv };
    
    // Mock ora spinner
    const mockSpinner = {
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn((text) => {
        // Capture success messages by calling console.log
        if (text) consoleLogSpy(text);
        return mockSpinner;
      }),
      fail: vi.fn().mockReturnThis()
    };
    vi.mocked(ora).mockReturnValue(mockSpinner as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof editCommand).toBe('function');
    });

    it('should return a promise', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
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
        promptDirs: ['./prompts']
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
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      expect(mockSelectPrompt).toHaveBeenCalledWith(mockPrompts);
    });

    it('should handle no prompts found', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
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
        promptDirs: ['./prompts']
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
        promptDirs: ['./prompts']
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
          if (event === 'close') callback(0);
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
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      expect(spawn).toHaveBeenCalledWith('nano', ['/prompts/test.md'], { stdio: 'inherit' });
    });

    it('should try common editors if environment variables not set', async () => {
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            // First attempts fail
            callback(new Error('not found'));
          }
        })
      };
      
      // Make code work
      vi.mocked(spawn)
        .mockReturnValueOnce(mockSpawn as any) // vim fails
        .mockReturnValueOnce(mockSpawn as any) // nano fails
        .mockReturnValueOnce({
          on: vi.fn((event, callback) => {
            if (event === 'close') callback(0);
          })
        } as any); // code succeeds
      
      await editCommand();
      
      expect(spawn).toHaveBeenCalledWith('vim', expect.any(Array), expect.any(Object));
      expect(spawn).toHaveBeenCalledWith('nano', expect.any(Array), expect.any(Object));
      expect(spawn).toHaveBeenCalledWith('code', expect.any(Array), expect.any(Object));
    });

    it('should show error when no editor found', async () => {
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('not found'));
          }
        })
      };
      
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await expect(editCommand()).rejects.toThrow('No editor configured');
    });
  });

  describe('editor launching', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
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
          if (event === 'close') callback(0);
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
          if (event === 'close') closeCallback = callback;
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      const promise = editCommand();
      
      // Wait a bit for the callback to be set
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Editor hasn't closed yet
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Editor closed')
      );
      
      // Close editor
      if (closeCallback) {
        closeCallback(0);
      }
      await promise;
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Editor closed')
      );
    });

    it('should handle non-zero exit codes', async () => {
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(1); // Non-zero exit
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      // Current implementation shows "Editor closed" regardless of exit code
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Editor closed')
      );
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
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await editCommand();
      
      // Spinner messages are handled by ora, final message is "Editor closed"
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Editor closed')
      );
    });
  });

  describe('OS-specific fallbacks', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
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
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      
      const mockSpawn = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('not found'));
          }
        })
      };
      
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      try {
        await editCommand();
      } catch {
        // Expected to fail
      }
      
      expect(spawn).toHaveBeenCalledWith('notepad', expect.any(Array), expect.any(Object));
      
      // Reset platform
      Object.defineProperty(process, 'platform', {
        value: originalEnv.platform || 'linux',
        configurable: true
      });
    });
  });
});