import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { editorLauncher, DefaultEditorLauncher } from '../../src/utils/editor.js';
import { mockEnvironmentVariables } from '../utils/test-helpers.js';

// Use vi.hoisted to ensure mocks are available before imports
const { mockExecFileAsync } = vi.hoisted(() => {
  return {
    mockExecFileAsync: vi.fn()
  };
});

// Mock child_process module
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

// Mock util module
vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecFileAsync)
}));

describe('EditorLauncher', () => {
  let launcher: DefaultEditorLauncher;
  let mockSpawn: any;

  beforeEach(() => {
    launcher = new DefaultEditorLauncher();
    vi.clearAllMocks();
    mockExecFileAsync.mockReset();
    
    // Clear environment variables that might affect tests
    delete process.env.VISUAL;
    delete process.env.EDITOR;
    
    // Get the mocked functions
    mockSpawn = vi.mocked(spawn);
    
    // Default mock behavior for execFileAsync - editors are available
    mockExecFileAsync.mockImplementation((command: string, args: string[]) => {
      if (command === 'which' || command === 'where') {
        const editor = args[0];
        if (['vim', 'nano', 'code'].includes(editor)) {
          return Promise.resolve({ stdout: `/usr/bin/${editor}`, stderr: '' });
        }
        return Promise.reject(new Error('Command not found'));
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });
    
    // Default spawn mock
    mockSpawn.mockImplementation(() => {
      const mockProcess = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        unref: vi.fn()
      };
      return mockProcess;
    });
  });

  describe('findEditor', () => {
    describe('environment variables', () => {
      it('should prefer VISUAL over EDITOR', async () => {
        process.env.VISUAL = 'vim';
        process.env.EDITOR = 'nano';

        const editor = await launcher.findEditor();
        expect(editor).toBe('vim');
      });

      it('should use EDITOR if VISUAL not set', async () => {
        process.env.EDITOR = 'nano';
        delete process.env.VISUAL;

        const editor = await launcher.findEditor();
        expect(editor).toBe('nano');
      });

      it('should check if environment editor is available', async () => {
        mockEnvironmentVariables({
          VISUAL: 'nonexistent-editor'
        });

        const editor = await launcher.findEditor();
        expect(editor).not.toBe('nonexistent-editor');
      });
    });

    describe('common editors fallback', () => {
      beforeEach(() => {
        mockEnvironmentVariables({});
      });

      it('should find first available common editor', async () => {
        const editor = await launcher.findEditor();
        expect(['vim', 'nano', 'code']).toContain(editor);
      });

      it('should return null if no editor found', async () => {
        // Mock all editors as unavailable
        mockExecFileAsync.mockRejectedValue(new Error('Command not found'));

        const editor = await launcher.findEditor();
        expect(editor).toBeNull();
      });

      it('should try all common editors in order', async () => {
        let callCount = 0;
        mockExecFileAsync.mockImplementation((command, args) => {
          callCount++;
          const editor = args[0];
          // First two editors are not available
          if (callCount < 3) {
            return Promise.reject(new Error('Command not found'));
          }
          // Third editor (nano) is available
          if (editor === 'nano') {
            return Promise.resolve({ stdout: '/usr/bin/nano', stderr: '' });
          }
          return Promise.reject(new Error('Command not found'));
        });

        const editor = await launcher.findEditor();
        expect(editor).toBe('nano');
      });
    });
  });

  describe('isEditorAvailable', () => {
    it('should return true for available editor on unix', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const available = await launcher.isEditorAvailable('vim');
      expect(available).toBe(true);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return true for available editor on windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const available = await launcher.isEditorAvailable('code');
      expect(available).toBe(true);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return false for unavailable editor', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('Command not found'));

      const available = await launcher.isEditorAvailable('nonexistent');
      expect(available).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('Permission denied'));

      const available = await launcher.isEditorAvailable('vim');
      expect(available).toBe(false);
    });
  });

  describe('openInEditor', () => {
    it('should spawn editor with correct arguments', async () => {
      await launcher.openInEditor('vim', '/path/to/file.txt');

      expect(mockSpawn).toHaveBeenCalledWith('vim', ['/path/to/file.txt'], {
        stdio: 'inherit'
      });
    });

    it('should handle successful editor exit', async () => {
      mockSpawn.mockImplementation(() => {
        const mockProcess = {
          on: vi.fn((event: string, callback: Function) => {
            if (event === 'exit') {
              setTimeout(() => callback(0), 10);
            }
            return mockProcess;
          }),
          unref: vi.fn()
        };
        return mockProcess;
      });

      await expect(launcher.openInEditor('vim', '/path/to/file.txt'))
        .resolves.toBeUndefined();
    });

    it('should handle editor error', async () => {
      mockSpawn.mockImplementation(() => {
        const mockProcess = {
          on: vi.fn((event: string, callback: Function) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('spawn error')), 10);
            }
            return mockProcess;
          }),
          unref: vi.fn()
        };
        return mockProcess;
      });

      await expect(launcher.openInEditor('vim', '/path/to/file.txt'))
        .rejects.toThrow('spawn error');
    });

    it('should handle non-zero exit code', async () => {
      mockSpawn.mockImplementation(() => {
        const mockProcess = {
          on: vi.fn((event: string, callback: Function) => {
            if (event === 'exit') {
              setTimeout(() => callback(1), 10);
            }
            return mockProcess;
          }),
          unref: vi.fn()
        };
        return mockProcess;
      });

      await expect(launcher.openInEditor('vim', '/path/to/file.txt'))
        .rejects.toThrow('Editor exited with code 1');
    });

    it('should wait for editor to close before resolving', async () => {
      const mockProcess = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        unref: vi.fn()
      };
      
      mockSpawn.mockReturnValue(mockProcess);

      await launcher.openInEditor('vim', '/path/to/file.txt');

      expect(mockProcess.unref).not.toHaveBeenCalled();
    });

    it('should inherit stdio to allow editor to use terminal', async () => {
      await launcher.openInEditor('vim', '/path/to/file.txt');

      expect(mockSpawn).toHaveBeenCalledWith('vim', ['/path/to/file.txt'], {
        stdio: 'inherit'
      });
      
      // Ensure we don't use detached mode
      const spawnCall = mockSpawn.mock.calls[0][2];
      expect(spawnCall).not.toHaveProperty('detached');
      expect(spawnCall.detached).not.toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle spaces in editor paths', async () => {
      mockEnvironmentVariables({
        VISUAL: 'code --wait'
      });
      
      // The editor launcher treats 'code --wait' as a single command
      // which/where will fail for this, so it should fall back to common editors
      mockExecFileAsync.mockImplementation((command, args) => {
        if (args[0] === 'code --wait') {
          // This will fail because which/where expects just the command name
          return Promise.reject(new Error('Command not found'));
        }
        if (args[0] === 'code') {
          return Promise.resolve({ stdout: '/usr/bin/code', stderr: '' });
        }
        return Promise.reject(new Error('Command not found'));
      });

      const editor = await launcher.findEditor();
      // Should fall back to first available common editor (code)
      expect(editor).toBe('code');
    });

    it('should handle absolute paths for editors', async () => {
      process.env.VISUAL = '/usr/local/bin/vim';
      
      // Mock that the absolute path editor is available
      mockExecFileAsync.mockImplementation((command, args) => {
        if (args[0] === '/usr/local/bin/vim') {
          return Promise.resolve({ stdout: '/usr/local/bin/vim', stderr: '' });
        }
        if (args[0] === 'vim') {
          return Promise.resolve({ stdout: '/usr/bin/vim', stderr: '' });
        }
        return Promise.reject(new Error('Command not found'));
      });

      const editor = await launcher.findEditor();
      expect(editor).toBe('/usr/local/bin/vim');
    });

    it('should handle editors with arguments', async () => {
      await launcher.openInEditor('code --wait', '/path/to/file.txt');

      expect(mockSpawn).toHaveBeenCalledWith('code --wait', ['/path/to/file.txt'], {
        stdio: 'inherit'
      });
    });
  });

  describe('platform-specific behavior', () => {
    it('should use which command on unix systems', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      await launcher.isEditorAvailable('vim');

      expect(mockExecFileAsync).toHaveBeenCalledWith('which', ['vim']);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should use where command on windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      await launcher.isEditorAvailable('vim');

      expect(mockExecFileAsync).toHaveBeenCalledWith('where', ['vim']);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});

describe('editorLauncher singleton', () => {
  it('should export a singleton instance', () => {
    expect(editorLauncher).toBeDefined();
    expect(editorLauncher).toBeInstanceOf(DefaultEditorLauncher);
  });

  it('should use the singleton for operations', async () => {
    // Reset and configure the global mock
    mockExecFileAsync.mockReset();
    mockExecFileAsync.mockResolvedValue({ stdout: '/usr/bin/vim', stderr: '' });
    
    process.env.VISUAL = 'vim';

    const editor = await editorLauncher.findEditor();
    expect(editor).toBe('vim');
  });
});