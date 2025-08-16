import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import reviewFilePrompt from '../../src/prompts/input-types/review-file-prompt.js';
import fileSearchPrompt from '../../src/prompts/input-types/file-search-prompt.js';
import type { Config } from '../../src/types/config.js';
import { ConfigManager } from '../../src/config/config-manager.js';

// Use vi.hoisted to ensure mocks are available before imports
const { mockExecFileAsync } = vi.hoisted(() => {
  return {
    mockExecFileAsync: vi.fn()
  };
});

vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));
vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecFileAsync)
}));
vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/prompts/input-types/file-search-prompt.js');

describe('ReviewFile Input Type', () => {
  let mockSpawn: any;
  let mockConfig: Config;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset execFileAsync mock - simulate that editors are available
    mockExecFileAsync.mockClear();
    mockExecFileAsync.mockResolvedValue(undefined);
    
    // Mock config with autoReview enabled
    mockConfig = {
      promptDirs: ['./prompts'],
      autoReview: true,
      defaultCmd: 'claude'
    };
    
    vi.mocked(ConfigManager.load).mockResolvedValue(mockConfig);
    
    // Mock spawn to simulate editor process
    mockSpawn = vi.mocked(spawn);
    
    // Setup default behavior for execFileAsync (which/where commands)
    mockExecFileAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('inheritance from file input', () => {
    it('should extend file prompt functionality', async () => {
      // Set editor env var
      process.env.EDITOR = 'vim';
      
      // Mock filePrompt to return a selected file
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/selected/file.txt');

      // Mock successful editor spawn
      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select a file to review:'
      });

      // Simulate editor closing successfully
      setTimeout(() => {
        mockChildProcess.emit('exit', 0);
      }, 50);

      const result = await resultPromise;

      expect(mockFilePrompt).toHaveBeenCalledWith({
        message: 'Select a file to review:'
      });
      expect(result).toBe('/path/to/selected/file.txt');
    });

    it('should pass through all file prompt config options', async () => {
      // Set editor env var
      process.env.EDITOR = 'vim';
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/selected/file.txt');

      // Mock successful editor spawn
      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:',
        basePath: './src',
        filter: '*.ts',
        default: 'index.ts'
      });

      // Simulate editor closing successfully
      setTimeout(() => {
        mockChildProcess.emit('exit', 0);
      }, 50);

      await resultPromise;

      expect(mockFilePrompt).toHaveBeenCalledWith({
        message: 'Select file:',
        basePath: './src',
        filter: '*.ts',
        default: 'index.ts'
      });
    });
  });

  describe('autoReview behavior', () => {
    it('should launch editor when autoReview is enabled', async () => {
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      // Mock successful editor spawn
      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      // Simulate editor closing successfully
      setTimeout(() => {
        mockChildProcess.emit('exit', 0);
      }, 100);

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalled();
      expect(result).toBe('/path/to/file.txt');
    });

    it('should not launch editor when autoReview is disabled', async () => {
      // Mock config with autoReview disabled
      mockConfig.autoReview = false;
      vi.mocked(ConfigManager.load).mockResolvedValue(mockConfig);

      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const result = await reviewFilePrompt({
        message: 'Select file:'
      });

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(result).toBe('/path/to/file.txt');
    });

    it('should handle missing autoReview config (default to true)', async () => {
      // Mock config without autoReview field
      mockConfig.autoReview = undefined;
      vi.mocked(ConfigManager.load).mockResolvedValue(mockConfig);

      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      setTimeout(() => {
        mockChildProcess.emit('exit', 0);
      }, 100);

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalled();
      expect(result).toBe('/path/to/file.txt');
    });
  });

  describe('editor detection and launch', () => {
    it('should use VISUAL environment variable if set', async () => {
      process.env.VISUAL = 'vim';
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      setTimeout(() => {
        mockChildProcess.emit('exit', 0);
      }, 100);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith('vim', ['/path/to/file.txt'], { detached: true, stdio: 'ignore' });
      
      delete process.env.VISUAL;
    });

    it('should use EDITOR environment variable if VISUAL not set', async () => {
      delete process.env.VISUAL;
      process.env.EDITOR = 'nano';
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      setTimeout(() => {
        mockChildProcess.emit('exit', 0);
      }, 100);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith('nano', ['/path/to/file.txt'], { detached: true, stdio: 'ignore' });
      
      delete process.env.EDITOR;
    });

    it('should try common editors when no environment variables set', async () => {
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      
      // Mock editor availability check - first two fail, third succeeds (nano)
      mockExecFileAsync
        .mockRejectedValueOnce(new Error('not found')) // code not found
        .mockRejectedValueOnce(new Error('not found')) // vim not found
        .mockResolvedValueOnce(undefined); // nano found
      
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      // Wait for editor availability checks
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Simulate editor closing
      mockChildProcess.emit('exit', 0);

      await resultPromise;

      // Should have checked for editors using which/where
      expect(mockExecFileAsync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['code']);
      expect(mockExecFileAsync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['vim']);
      expect(mockExecFileAsync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['nano']);
      
      // Should have spawned nano (the first available editor)
      expect(mockSpawn).toHaveBeenCalledWith('nano', ['/path/to/file.txt'], { detached: true, stdio: 'ignore' });
    });

    it('should throw error if no editor is available', async () => {
      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      // Mock all editor checks to fail - simulate 'which' command failing
      mockExecFileAsync.mockRejectedValue(new Error('not found'));

      // Mock all editor checks to fail
      mockSpawn.mockImplementation(() => {
        const proc = new EventEmitter() as any;
        proc.unref = vi.fn();
        setTimeout(() => proc.emit('error', new Error('Not found')), 10);
        return proc;
      });

      await expect(reviewFilePrompt({
        message: 'Select file:'
      })).rejects.toThrow(/editor/i);
    });

    it('should handle editor spawn errors', async () => {
      process.env.EDITOR = 'fake-editor';
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Spawn failed'));
      }, 100);

      await expect(resultPromise).rejects.toThrow('Spawn failed');
      
      delete process.env.EDITOR;
    });

    it('should handle editor non-zero exit codes gracefully', async () => {
      process.env.EDITOR = 'vim';
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      // Simulate editor exiting with non-zero code (user cancelled)
      setTimeout(() => {
        mockChildProcess.emit('exit', 1);
      }, 100);

      // Should throw error when editor exits with non-zero code
      await expect(resultPromise).rejects.toThrow('Failed to open editor: Editor exited with code 1');
      
      delete process.env.EDITOR;
    });
  });

  describe('platform-specific behavior', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true
      });
    });

    it('should try platform-specific editors on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      });

      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      
      // Mock all editors to not exist except notepad
      mockExecFileAsync
        .mockRejectedValueOnce(new Error('not found')) // code not found
        .mockRejectedValueOnce(new Error('not found')) // vim not found
        .mockRejectedValueOnce(new Error('not found')) // nano not found
        .mockRejectedValueOnce(new Error('not found')) // emacs not found
        .mockRejectedValueOnce(new Error('not found')) // subl not found
        .mockRejectedValueOnce(new Error('not found')) // atom not found
        .mockRejectedValueOnce(new Error('not found')) // gedit not found
        .mockResolvedValueOnce(undefined); // notepad found!
      
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      // Wait for editor checks
      await new Promise(resolve => setTimeout(resolve, 150));
      
      mockChildProcess.emit('exit', 0);

      await resultPromise;

      // Should have checked all editors including notepad
      expect(mockExecFileAsync).toHaveBeenCalledWith('where', ['notepad']);
      // Should have spawned notepad
      expect(mockSpawn).toHaveBeenCalledWith('notepad', ['/path/to/file.txt'], { detached: true, stdio: 'ignore' });
    });

    it('should try platform-specific editors on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true
      });

      delete process.env.VISUAL;
      delete process.env.EDITOR;
      
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const mockChildProcess = new EventEmitter() as any;
      mockChildProcess.unref = vi.fn();
      
      // Mock 'which' command - all fail except code
      let callCount = 0;
      mockExecFileAsync.mockImplementation((cmd, args) => {
        if (cmd === 'which' && args && args[0] === 'code') {
          return Promise.resolve(); // VS Code exists
        } else {
          return Promise.reject(new Error('not found'));
        }
      });
      
      mockSpawn.mockReturnValue(mockChildProcess);

      const resultPromise = reviewFilePrompt({
        message: 'Select file:'
      });

      // Wait for editor checks
      await new Promise(resolve => setTimeout(resolve, 150));
      
      mockChildProcess.emit('exit', 0);

      await resultPromise;

      // Should have tried code
      expect(mockExecFileAsync).toHaveBeenCalledWith('which', ['code']);
      expect(mockSpawn).toHaveBeenCalledWith('code', ['/path/to/file.txt'], expect.any(Object));
    });
  });
});