import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { editCommand } from '../../src/commands/edit.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { PuptService } from '../../src/services/pupt-service.js';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';

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
vi.mock('../../src/services/pupt-service.js');
vi.mock('../../src/ui/interactive-search.js');

describe('Edit Command Regression Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFileAsync.mockReset();
    mockExecFileAsync.mockResolvedValue({ stdout: '/usr/bin/vim', stderr: '' });
    process.env.VISUAL = 'vim';
  });

  afterEach(() => {
    delete process.env.VISUAL;
  });

  it('should wait for editor to close and not exit immediately', async () => {
    // Setup mocks
    const mockPrompts = [
      { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
    ];
    
    vi.mocked(ConfigManager.load).mockResolvedValue({
      promptDirs: ['./.prompts']
    } as any);
    
    vi.mocked(PuptService).mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      getPromptsAsAdapted: vi.fn().mockReturnValue(mockPrompts),
      findPrompt: vi.fn(),
      getPrompts: vi.fn().mockReturnValue(mockPrompts),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
    } as any));
    
    vi.mocked(InteractiveSearch).mockImplementation(() => ({
      selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
    } as any));

    // Track when the promise completes
    let promiseCompleted = false;
    let exitCallback: any;
    
    const mockSpawn = {
      on: vi.fn((event, callback) => {
        if (event === 'exit') {
          exitCallback = callback;
        }
      })
    };
    
    vi.mocked(spawn).mockReturnValue(mockSpawn as any);
    
    // Start the edit command
    const editPromise = editCommand().then(() => {
      promiseCompleted = true;
    });
    
    // Give time for spawn to be called
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify spawn was called with correct options
    expect(spawn).toHaveBeenCalledWith('vim', ['/prompts/test.md'], {
      stdio: 'inherit'
    });
    
    // Verify no detached mode or unref
    const spawnCall = vi.mocked(spawn).mock.calls[0][2];
    expect(spawnCall).not.toHaveProperty('detached');
    expect(mockSpawn).not.toHaveProperty('unref');
    
    // The promise should NOT be completed yet
    expect(promiseCompleted).toBe(false);
    
    // Now simulate editor closing
    exitCallback(0);
    
    // Wait for promise to complete
    await editPromise;
    
    // Now it should be completed
    expect(promiseCompleted).toBe(true);
  });

  it('should inherit stdio to allow terminal interaction', async () => {
    // Setup mocks
    const mockPrompts = [
      { title: 'Test Prompt', path: '/prompts/test.md', content: '# Test' }
    ];
    
    vi.mocked(ConfigManager.load).mockResolvedValue({
      promptDirs: ['./.prompts']
    } as any);
    
    vi.mocked(PuptService).mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      getPromptsAsAdapted: vi.fn().mockReturnValue(mockPrompts),
      findPrompt: vi.fn(),
      getPrompts: vi.fn().mockReturnValue(mockPrompts),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
    } as any));
    
    vi.mocked(InteractiveSearch).mockImplementation(() => ({
      selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
    } as any));

    const mockSpawn = {
      on: vi.fn((event, callback) => {
        if (event === 'exit') {
          callback(0);
        }
      })
    };
    
    vi.mocked(spawn).mockReturnValue(mockSpawn as any);
    
    await editCommand();
    
    // Verify stdio is inherited, not ignored
    const spawnOptions = vi.mocked(spawn).mock.calls[0][2];
    expect(spawnOptions.stdio).toBe('inherit');
    expect(spawnOptions.stdio).not.toBe('ignore');
  });
});