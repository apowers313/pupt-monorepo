import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCommand, parseRunArgs, RunOptions } from '../../src/commands/run.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { PuptService } from '../../src/services/pupt-service.js';
import { collectInputs } from '../../src/services/input-collector.js';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { logger } from '../../src/utils/logger.js';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import { editorLauncher } from '../../src/utils/editor.js';
import { pathExists } from 'fs-extra';
import { resolvePrompt } from '../../src/services/prompt-resolver.js';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/services/pupt-service.js');
vi.mock('../../src/services/input-collector.js');
vi.mock('../../src/ui/interactive-search.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/utils/logger.js');
vi.mock('../../src/services/prompt-resolver.js');
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));
vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn())
}));
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn()
}));
vi.mock('../../src/services/output-capture-service.js');
vi.mock('../../src/utils/editor.js', () => ({
  editorLauncher: {
    findEditor: vi.fn(),
    openInEditor: vi.fn(),
  }
}));
vi.mock('fs-extra', () => ({
  pathExists: vi.fn()
}));

function createMockSpawn(exitCode: number = 0) {
  return {
    stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
    stderr: null,
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (event === 'close') callback(exitCode);
    })
  };
}

function createMockSpawnWithStderr(exitCode: number, stderrData?: string) {
  const stderrCallbacks: Record<string, ((...args: any[]) => void)[]> = {};
  const processCallbacks: Record<string, ((...args: any[]) => void)[]> = {};

  const mockStderr = {
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (!stderrCallbacks[event]) stderrCallbacks[event] = [];
      stderrCallbacks[event].push(callback);
    })
  };

  const mock = {
    stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
    stderr: mockStderr,
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (!processCallbacks[event]) processCallbacks[event] = [];
      processCallbacks[event].push(callback);
    }),
    // Helpers for triggering events in tests
    _triggerStderr: (data: string) => {
      for (const cb of stderrCallbacks['data'] || []) {
        cb(Buffer.from(data));
      }
    },
    _triggerClose: (code: number) => {
      for (const cb of processCallbacks['close'] || []) {
        cb(code);
      }
    },
    _triggerError: (error: Error) => {
      for (const cb of processCallbacks['error'] || []) {
        cb(error);
      }
    }
  };

  // If stderrData is provided, trigger it immediately after the 'data' listener is set
  if (stderrData !== undefined) {
    mockStderr.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
      if (!stderrCallbacks[event]) stderrCallbacks[event] = [];
      stderrCallbacks[event].push(callback);
      if (event === 'data') {
        // Immediately fire the data event
        callback(Buffer.from(stderrData));
      }
    });
  }

  return mock;
}

function setupResolvePromptMock(text: string = 'resolved prompt text', templateInfoOverrides: Record<string, any> = {}) {
  vi.mocked(resolvePrompt).mockResolvedValue({
    text,
    templateInfo: {
      templatePath: '/prompts/test.md',
      templateContent: 'template content',
      variables: new Map(),
      finalPrompt: text,
      title: 'Test Prompt',
      summary: 'A summary',
      reviewFiles: [],
      timestamp: new Date(),
      ...templateInfoOverrides,
    }
  });
}

describe('Run Command - Coverage Tests', () => {
  let loggerLogSpy: any;
  let loggerErrorSpy: any;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // Default mock for ConfigManager.loadWithPath
    vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
      config: {
        promptDirs: ['./.prompts']
      } as any,
      filepath: undefined
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    processExitSpy.mockRestore();
    stderrWriteSpy.mockRestore();
  });

  describe('options.prompt path (autoRun)', () => {
    it('should use provided prompt directly without discovering prompts', async () => {
      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {
        prompt: 'direct prompt text'
      });

      // Should NOT call resolvePrompt
      expect(resolvePrompt).not.toHaveBeenCalled();

      // Should write the provided prompt to stdin
      expect(mockSpawn.stdin.write).toHaveBeenCalledWith('direct prompt text');
      expect(mockSpawn.stdin.end).toHaveBeenCalled();
    });

    it('should use provided templateInfo when given with prompt', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      const templateInfo = {
        templatePath: '/custom/path.md',
        templateContent: 'custom content',
        variables: new Map([['key', 'value']]),
        finalPrompt: 'direct prompt text',
        title: 'Custom Title',
        summary: 'Custom summary',
        reviewFiles: [] as Array<{ name: string; value: unknown }>,
        timestamp: new Date()
      };

      await runCommand(['echo'], {
        prompt: 'direct prompt text',
        templateInfo
      });

      // Should save history with the provided templateInfo
      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        templatePath: '/custom/path.md',
        templateContent: 'custom content',
        finalPrompt: 'direct prompt text',
        title: 'Custom Title',
      }));
    });

    it('should not set templateInfo when only prompt is provided (no templateInfo)', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {
        prompt: 'direct prompt text'
        // no templateInfo
      });

      // templateInfo is undefined, so history should NOT be saved
      // (the condition is: config.historyDir && templateInfo && promptResult.trim().length > 0)
      expect(mockSavePrompt).not.toHaveBeenCalled();
    });
  });

  describe('noInteractive mode for tool options', () => {
    it('should skip prompting and log message when noInteractive is true', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          defaultCmd: 'claude',
          defaultCmdArgs: ['--model', 'sonnet'],
          defaultCmdOptions: {
            'Continue with last context?': '--continue',
            'Enable web search?': '--web'
          }
        } as any,
        filepath: undefined
      });

      setupResolvePromptMock('Hello');

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand([], { noInteractive: true });

      // Should NOT call confirm
      expect(confirm).not.toHaveBeenCalled();

      // Should log the skip message
      expect(loggerLogSpy).toHaveBeenCalledWith(
        chalk.dim('Skipping tool options in non-interactive mode')
      );

      // Should still include default args but no selected options
      // Claude Code detection: no explicit tool and defaultCmd is 'claude', so prompt goes as arg
      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['--model', 'sonnet', 'Hello'],
        expect.any(Object)
      );
    });
  });

  describe('Claude Code detection in executeTool', () => {
    it('should append prompt to args when isClaudeCode is true (explicit claude tool)', async () => {
      setupResolvePromptMock('my prompt text');

      const mockSpawn = createMockSpawn(0);
      // For claude, stderr is piped, so we need a mock stderr
      const mockStderr = { on: vi.fn() };
      mockSpawn.stderr = mockStderr as any;
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['claude'], {});

      // Prompt should be in args, not piped via stdin
      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['my prompt text'],
        { stdio: ['inherit', 'inherit', 'pipe'] }
      );

      // stdin should NOT have been written to (the finalPrompt is empty)
      // Since isClaudeCode is true, stdin is 'inherit' so child.stdin may not exist
      // The close stdin path handles child.stdin.end() for empty prompt
    });

    it('should use inherit for stdin when tool is claude', async () => {
      setupResolvePromptMock('my prompt text');

      const mockSpawn = createMockSpawn(0);
      mockSpawn.stderr = { on: vi.fn() } as any;
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['claude'], {});

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        { stdio: ['inherit', 'inherit', 'pipe'] }
      );
    });

    it('should use pipe for stdin when tool is not claude', async () => {
      setupResolvePromptMock('my prompt text');

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['cat'], {});

      expect(spawn).toHaveBeenCalledWith(
        'cat',
        [],
        { stdio: ['pipe', 'inherit', 'inherit'] }
      );
    });

    it('should detect claude as default tool and append prompt to args', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          defaultCmd: 'claude',
          defaultCmdArgs: ['--model', 'sonnet']
        } as any,
        filepath: undefined
      });

      setupResolvePromptMock('hello world');

      const mockSpawn = createMockSpawn(0);
      mockSpawn.stderr = { on: vi.fn() } as any;
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand([], {});

      // When defaultCmd is 'claude', prompt is appended to args
      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['--model', 'sonnet', 'hello world'],
        { stdio: ['inherit', 'inherit', 'pipe'] }
      );
    });
  });

  describe('Claude stderr error detection', () => {
    it('should detect raw mode error in stderr and reject on close', async () => {
      setupResolvePromptMock('test prompt');

      const stderrErrorData = 'Error: Raw mode is not supported in the current environment. Ink requires raw mode.';
      const mock = createMockSpawnWithStderr(1, stderrErrorData);

      // Also need to trigger 'close' with non-zero exit after stderr data
      mock.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
        if (event === 'close') {
          // Close with non-zero after stderr fires
          setTimeout(() => callback(1), 0);
        }
        if (event === 'error') {
          // don't trigger error event
        }
      });

      vi.mocked(spawn).mockReturnValue(mock as any);

      await expect(runCommand(['claude'], {})).rejects.toThrow('Claude requires interactive trust setup');

      // Should have logged error messages
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude cannot run in interactive mode')
      );
    });

    it('should not reject when raw mode error is detected but exit code is 0', async () => {
      setupResolvePromptMock('test prompt');

      const stderrErrorData = 'Error: Raw mode is not supported in the current environment. Ink requires raw mode.';
      const mock = createMockSpawnWithStderr(0, stderrErrorData);

      mock.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      vi.mocked(spawn).mockReturnValue(mock as any);

      // Should NOT reject since exit code is 0
      await runCommand(['claude'], {});
    });

    it('should still write stderr data to process.stderr', async () => {
      setupResolvePromptMock('test prompt');

      const stderrData = 'Some warning output';
      const mock = createMockSpawnWithStderr(0, stderrData);

      mock.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      vi.mocked(spawn).mockReturnValue(mock as any);

      await runCommand(['claude'], {});

      expect(stderrWriteSpy).toHaveBeenCalledWith(Buffer.from(stderrData));
    });
  });

  describe('ENOENT error with tool suggestions', () => {
    it('should suggest similar tools when spawn emits ENOENT', async () => {
      setupResolvePromptMock('test prompt');

      const mock = {
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
        stderr: null,
        on: vi.fn((event: string, callback: (...args: any[]) => void) => {
          if (event === 'error') {
            const error = new Error('spawn ENOENT') as Error & { code?: string };
            error.code = 'ENOENT';
            callback(error);
          }
        })
      };

      vi.mocked(spawn).mockReturnValue(mock as any);

      // 'claud' is close to 'claude'
      await expect(runCommand(['claud'], {})).rejects.toThrow("Tool 'claud' not found");
    });

    it('should reject with original error when spawn emits non-ENOENT error', async () => {
      setupResolvePromptMock('test prompt');

      const mock = {
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
        stderr: null,
        on: vi.fn((event: string, callback: (...args: any[]) => void) => {
          if (event === 'error') {
            const error = new Error('EACCES: permission denied');
            callback(error);
          }
        })
      };

      vi.mocked(spawn).mockReturnValue(mock as any);

      await expect(runCommand(['sometool'], {})).rejects.toThrow('EACCES: permission denied');
    });
  });

  describe('stdin EPIPE error handling', () => {
    it('should ignore EPIPE errors on stdin', async () => {
      setupResolvePromptMock('test prompt');

      const stdinOnCallbacks: Record<string, (...args: any[]) => void> = {};
      const mock = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn((event: string, callback: (...args: any[]) => void) => {
            stdinOnCallbacks[event] = callback;
          })
        },
        stderr: null,
        on: vi.fn((event: string, callback: (...args: any[]) => void) => {
          if (event === 'close') callback(0);
        })
      };

      vi.mocked(spawn).mockReturnValue(mock as any);

      await runCommand(['cat'], {});

      // Trigger EPIPE error on stdin - should not cause problems
      const epipeError = new Error('EPIPE') as NodeJS.ErrnoException;
      epipeError.code = 'EPIPE';

      expect(stdinOnCallbacks['error']).toBeDefined();
      // Should not throw
      stdinOnCallbacks['error'](epipeError);

      // logger.error should NOT have been called for EPIPE
      expect(loggerErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('stdin error'));
    });

    it('should log non-EPIPE stdin errors', async () => {
      setupResolvePromptMock('test prompt');

      const stdinOnCallbacks: Record<string, (...args: any[]) => void> = {};
      const mock = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn((event: string, callback: (...args: any[]) => void) => {
            stdinOnCallbacks[event] = callback;
          })
        },
        stderr: null,
        on: vi.fn((event: string, callback: (...args: any[]) => void) => {
          if (event === 'close') callback(0);
        })
      };

      vi.mocked(spawn).mockReturnValue(mock as any);

      await runCommand(['cat'], {});

      // Trigger non-EPIPE error on stdin
      const otherError = new Error('ECONNRESET') as NodeJS.ErrnoException;
      otherError.code = 'ECONNRESET';

      stdinOnCallbacks['error'](otherError);

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('stdin error'));
    });

    it('should reject with error when stdin.write throws non-EPIPE error', async () => {
      setupResolvePromptMock('test prompt');

      const writeError = new Error('Broken pipe') as NodeJS.ErrnoException;
      writeError.code = 'OTHER';

      const mock = {
        stdin: {
          write: vi.fn().mockImplementation(() => { throw writeError; }),
          end: vi.fn(),
          on: vi.fn()
        },
        stderr: null,
        on: vi.fn((event: string, callback: (...args: any[]) => void) => {
          // Don't call close since we expect rejection from write
        })
      };

      vi.mocked(spawn).mockReturnValue(mock as any);

      await expect(runCommand(['cat'], {})).rejects.toThrow('Failed to write prompt to tool');
    });

    it('should ignore EPIPE from stdin.write catch block', async () => {
      setupResolvePromptMock('test prompt');

      const epipeError = new Error('EPIPE') as NodeJS.ErrnoException;
      epipeError.code = 'EPIPE';

      const mock = {
        stdin: {
          write: vi.fn().mockImplementation(() => { throw epipeError; }),
          end: vi.fn(),
          on: vi.fn()
        },
        stderr: null,
        on: vi.fn((event: string, callback: (...args: any[]) => void) => {
          if (event === 'close') callback(0);
        })
      };

      vi.mocked(spawn).mockReturnValue(mock as any);

      // Should not reject since EPIPE is ignored in the catch block
      await runCommand(['cat'], {});
    });

    it('should close stdin when no prompt (empty finalPrompt)', async () => {
      // For claude, finalPrompt becomes '' and isClaudeCode is true
      setupResolvePromptMock('my prompt');

      const mock = createMockSpawn(0);
      mock.stderr = { on: vi.fn() } as any;
      vi.mocked(spawn).mockReturnValue(mock as any);

      await runCommand(['claude'], {});

      // For Claude Code, prompt is added to args and finalPrompt is ''
      // So the else branch (line 384-387) should be hit: child.stdin.end()
      // But since stdio[0] is 'inherit', there may be no stdin
      // The mock still has a stdin, so end should be called
      expect(mock.stdin.end).toHaveBeenCalled();
    });
  });

  describe('handlePostRunReviews', () => {
    it('should log warning when review file does not exist', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'output.txt', value: '/tmp/output.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(false);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {});

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("File for 'output.txt' not found")
      );
    });

    it('should auto-open file in autoRun mode without prompting', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          autoReview: true
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'output.txt', value: '/tmp/output.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue(undefined);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], { isAutoRun: true });

      // Should NOT prompt for confirmation
      expect(confirm).not.toHaveBeenCalled();

      // Should log auto-reviewing message
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Auto-reviewing file 'output.txt'")
      );

      // Should open the file in editor
      expect(editorLauncher.findEditor).toHaveBeenCalled();
      expect(editorLauncher.openInEditor).toHaveBeenCalledWith('code', '/tmp/output.txt');
    });

    it('should prompt user in normal mode and open file if confirmed', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'result.txt', value: '/tmp/result.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('vim');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue(undefined);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {});

      // Should prompt for confirmation
      expect(confirm).toHaveBeenCalledWith({
        message: expect.stringContaining("Would you like to review the file 'result.txt'"),
        default: true
      });

      // Should open the file
      expect(editorLauncher.openInEditor).toHaveBeenCalledWith('vim', '/tmp/result.txt');
    });

    it('should not open file if user declines review', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'result.txt', value: '/tmp/result.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(confirm).mockResolvedValue(false);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {});

      // Should NOT try to find or open editor
      expect(editorLauncher.findEditor).not.toHaveBeenCalled();
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should show warning when no editor found', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          autoReview: true
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'output.txt', value: '/tmp/output.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(editorLauncher.findEditor).mockResolvedValue(null);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {});

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No editor found')
      );

      // Should NOT try to open editor
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should log error when editor fails to open', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'output.txt', value: '/tmp/output.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      vi.mocked(editorLauncher.openInEditor).mockRejectedValue(new Error('Editor crashed'));

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {});

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open editor: Editor crashed')
      );
    });

    it('should show file path when autoReview is false', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          autoReview: false
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'output.txt', value: '/tmp/output.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(confirm).mockResolvedValue(true);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], {});

      // Should log the file path instead of opening editor
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('File saved at: /tmp/output.txt')
      );

      // Should NOT try to find or open editor
      expect(editorLauncher.findEditor).not.toHaveBeenCalled();
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should auto-open file when noInteractive is true', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          autoReview: true
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test prompt', {
        reviewFiles: [{ name: 'output.txt', value: '/tmp/output.txt' }]
      });

      vi.mocked(pathExists as any).mockResolvedValue(true);
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue(undefined);

      const mockSpawn = createMockSpawn(0);
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      await runCommand(['echo'], { noInteractive: true });

      // Should NOT prompt for confirmation (noInteractive acts like autoRun)
      expect(confirm).not.toHaveBeenCalled();

      // Should open the file
      expect(editorLauncher.openInEditor).toHaveBeenCalledWith('code', '/tmp/output.txt');
    });
  });

  describe('executeToolWithCapture', () => {
    it('should use output capture when config.outputCapture.enabled is true', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          outputCapture: {
            enabled: true,
            directory: '/tmp/captures',
            maxSizeMB: 5
          }
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('captured prompt');

      const mockCaptureCommand = vi.fn().mockResolvedValue({ exitCode: 0, outputSize: 256 });
      vi.mocked(OutputCaptureService).mockImplementation(() => ({
        captureCommand: mockCaptureCommand
      } as any));

      await runCommand(['echo'], {});

      // Should have used OutputCaptureService instead of direct spawn
      expect(OutputCaptureService).toHaveBeenCalledWith({
        outputDirectory: '/tmp/captures',
        maxOutputSize: 5 * 1024 * 1024
      });
      expect(mockCaptureCommand).toHaveBeenCalledWith(
        'echo',
        [],
        'captured prompt',
        expect.stringContaining('output.json')
      );

      // Should NOT have called spawn directly
      expect(spawn).not.toHaveBeenCalled();

      // History should include outputFile and outputSize
      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        outputFile: expect.stringContaining('output.json'),
        outputSize: 256,
        exitCode: 0
      }));
    });

    it('should use historyDir when outputCapture.directory is not set', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: '/home/user/.pthistory',
          outputCapture: {
            enabled: true
          }
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test');

      const mockCaptureCommand = vi.fn().mockResolvedValue({ exitCode: 0, outputSize: 100 });
      vi.mocked(OutputCaptureService).mockImplementation(() => ({
        captureCommand: mockCaptureCommand
      } as any));

      await runCommand(['echo'], {});

      expect(OutputCaptureService).toHaveBeenCalledWith({
        outputDirectory: '/home/user/.pthistory',
        maxOutputSize: 10 * 1024 * 1024 // default 10MB
      });
    });

    it('should pass prompt as argument for claude in capture mode', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          defaultCmd: 'claude',
          defaultCmdArgs: ['--model', 'sonnet'],
          outputCapture: {
            enabled: true
          }
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('capture this');

      const mockCaptureCommand = vi.fn().mockResolvedValue({ exitCode: 0, outputSize: 50 });
      vi.mocked(OutputCaptureService).mockImplementation(() => ({
        captureCommand: mockCaptureCommand
      } as any));

      await runCommand([], {});

      // For Claude Code in capture mode, prompt is appended to args and stdin prompt is empty
      expect(mockCaptureCommand).toHaveBeenCalledWith(
        'claude',
        ['--model', 'sonnet', 'capture this'],
        '', // empty stdin prompt
        expect.any(String)
      );
    });

    it('should handle capture result with non-zero exit code', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          outputCapture: {
            enabled: true
          }
        } as any,
        filepath: undefined
      });

      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));

      setupResolvePromptMock('test');

      const mockCaptureCommand = vi.fn().mockResolvedValue({ exitCode: 1, outputSize: 200 });
      vi.mocked(OutputCaptureService).mockImplementation(() => ({
        captureCommand: mockCaptureCommand
      } as any));

      await runCommand(['echo'], {});

      expect(processExitSpy).toHaveBeenCalledWith(1);

      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        exitCode: 1,
        outputSize: 200
      }));
    });
  });

  describe('Claude raw mode error on close', () => {
    it('should provide helpful error messages when claude has raw mode error', async () => {
      setupResolvePromptMock('test prompt');

      const stderrData = 'Error: Raw mode is not supported. Ink requires interactive mode.';
      const mock = createMockSpawnWithStderr(1, stderrData);

      mock.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      vi.mocked(spawn).mockReturnValue(mock as any);

      await expect(runCommand(['claude'], {})).rejects.toThrow('Claude requires interactive trust setup');

      // Should have logged multiple helpful messages
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('This typically happens when Claude needs to ask for directory trust permissions')
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('To fix this:')
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Run Claude directly in this directory')
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--permission-mode acceptEdits')
      );
    });
  });
});
