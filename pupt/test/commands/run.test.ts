import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCommand, parseRunArgs, RunOptions } from '../../src/commands/run.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { PromptManager } from '../../src/prompts/prompt-manager.js';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';
import { TemplateEngine } from '../../src/template/template-engine.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/ui/interactive-search.js');
vi.mock('../../src/template/template-engine.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn()
}));

describe('Run Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof runCommand).toBe('function');
    });

    it('should return a promise', () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
      } as any);
      
      const result = runCommand(['echo'], {});
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up
      result.catch(() => {});
    });
  });

  describe('argument parsing', () => {
    it('should parse tool and arguments correctly', () => {
      const result = parseRunArgs(['git', 'status', '-s']);
      expect(result).toEqual({
        tool: 'git',
        toolArgs: ['status', '-s'],
        extraArgs: []
      });
    });

    it('should handle -- separator', () => {
      const result = parseRunArgs(['echo', '--', '-n', 'hello']);
      expect(result).toEqual({
        tool: 'echo',
        toolArgs: [],
        extraArgs: ['-n', 'hello']
      });
    });

    it('should handle no arguments', () => {
      const result = parseRunArgs([]);
      expect(result).toEqual({
        tool: undefined,
        toolArgs: [],
        extraArgs: []
      });
    });

    it('should handle only tool name', () => {
      const result = parseRunArgs(['cat']);
      expect(result).toEqual({
        tool: 'cat',
        toolArgs: [],
        extraArgs: []
      });
    });

    it('should handle complex arguments with --', () => {
      const result = parseRunArgs(['npm', 'run', 'test', '--', '--coverage', '--verbose']);
      expect(result).toEqual({
        tool: 'npm',
        toolArgs: ['run', 'test'],
        extraArgs: ['--coverage', '--verbose']
      });
    });
  });

  describe('command building', () => {
    it('should build command without config tool', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello {{name}}' }
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
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello World'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], {});
      
      expect(spawn).toHaveBeenCalledWith('echo', [], expect.any(Object));
    });

    it('should build command with config tool', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        codingTool: 'claude',
        codingToolArgs: ['--model', 'sonnet']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand([], {});
      
      expect(spawn).toHaveBeenCalledWith('claude', ['--model', 'sonnet'], expect.any(Object));
    });

    it('should override config tool with explicit tool', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        codingTool: 'claude',
        codingToolArgs: ['--model', 'sonnet']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['cat'], {});
      
      expect(spawn).toHaveBeenCalledWith('cat', [], expect.any(Object));
    });

    it('should combine all arguments correctly', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
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
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['npm', 'run', 'test', '--', '--coverage'], {});
      
      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'test', '--coverage'], expect.any(Object));
    });
  });

  describe('tool execution', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello World' }
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
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello World'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
    });

    it('should pipe prompt to stdin', async () => {
      const mockStdin = { write: vi.fn(), end: vi.fn() };
      const mockSpawn = {
        stdin: mockStdin,
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['cat'], {});
      
      expect(mockStdin.write).toHaveBeenCalledWith('Hello World');
      expect(mockStdin.end).toHaveBeenCalled();
    });

    it('should inherit stdout and stderr', async () => {
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], {});
      
      expect(spawn).toHaveBeenCalledWith('echo', [], {
        stdio: ['pipe', 'inherit', 'inherit']
      });
    });

    it('should propagate exit code', async () => {
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(42);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['false'], {});
      
      expect(processExitSpy).toHaveBeenCalledWith(42);
    });

    it('should handle spawn error', async () => {
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('spawn ENOENT'));
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await expect(runCommand(['nonexistent'], {})).rejects.toThrow('spawn ENOENT');
    });

    it('should handle stdin error', async () => {
      const mockStdin = { 
        write: vi.fn().mockImplementation(() => {
          throw new Error('Broken pipe');
        }), 
        end: vi.fn() 
      };
      const mockSpawn = {
        stdin: mockStdin,
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Don't call close callback since we expect rejection
          }
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await expect(runCommand(['cat'], {})).rejects.toThrow('Failed to write prompt to tool');
    });
  });

  describe('history support', () => {
    it('should save to history when configured', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
      
      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], {});
      
      expect(mockSavePrompt).toHaveBeenCalledWith({
        templatePath: '/prompts/test.md',
        templateContent: 'Hello',
        variables: new Map(),
        finalPrompt: 'Hello',
        title: 'Test Prompt'
      });
    });

    it('should not save to history when not configured', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
        // No historyDir
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], {});
      
      expect(HistoryManager).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should require a tool', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
        // No codingTool configured
      } as any);
      
      await expect(runCommand([], {})).rejects.toThrow(
        'No tool specified'
      );
    });

    it('should handle no prompts found', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
      } as any);
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue([])
      } as any));
      
      await expect(runCommand(['echo'], {})).rejects.toThrow('No prompts found');
    });
  });

  describe('coding tool options', () => {
    beforeEach(() => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map())
        })
      } as any));
    });

    it('should prompt for each configured option', async () => {
      vi.mocked(confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        codingTool: 'claude',
        codingToolArgs: ['--model', 'sonnet'],
        codingToolOptions: {
          'Continue with last context?': '--continue',
          'Enable web search?': '--web'
        }
      } as any);
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand([], {});
      
      expect(confirm).toHaveBeenCalledWith({
        message: 'Continue with last context?',
        default: false
      });
      expect(confirm).toHaveBeenCalledWith({
        message: 'Enable web search?',
        default: false
      });
      
      // Should include --continue but not --web
      expect(spawn).toHaveBeenCalledWith('claude', ['--model', 'sonnet', '--continue'], expect.any(Object));
    });

    it('should preserve argument order', async () => {
      vi.mocked(confirm).mockResolvedValueOnce(true);
      
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        codingTool: 'claude',
        codingToolArgs: ['--model', 'sonnet'],
        codingToolOptions: {
          'Continue?': '--continue'
        }
      } as any);
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['--', '--temperature', '0.7'], {});
      
      expect(spawn).toHaveBeenCalledWith('claude', 
        ['--model', 'sonnet', '--continue', '--temperature', '0.7'], 
        expect.any(Object)
      );
    });

    it('should skip options when using explicit tool', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        codingTool: 'claude',
        codingToolOptions: {
          'Continue?': '--continue'
        }
      } as any);
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['cat'], {});
      
      expect(confirm).not.toHaveBeenCalled();
      expect(spawn).toHaveBeenCalledWith('cat', [], expect.any(Object));
    });
  });

  describe('history flag support', () => {
    it('should load prompt from history', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      const mockHistoryEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/prompts/test.md',
        templateContent: 'Hello {{name}}',
        variables: { name: 'World' },
        finalPrompt: 'Hello World',
        title: 'Test Prompt'
      };
      
      const mockGetEntry = vi.fn().mockResolvedValue(mockHistoryEntry);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: mockGetEntry
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], { historyIndex: 1 });
      
      expect(mockGetEntry).toHaveBeenCalledWith(1);
      expect(mockSpawn.stdin.write).toHaveBeenCalledWith('Hello World');
      
      // Should not prompt for variables
      expect(PromptManager).not.toHaveBeenCalled();
      expect(InteractiveSearch).not.toHaveBeenCalled();
      expect(TemplateEngine).not.toHaveBeenCalled();
    });

    it('should show helpful output when using history', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      const mockHistoryEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/prompts/test.md',
        templateContent: 'Hello',
        variables: {},
        finalPrompt: 'Hello',
        title: 'Test Prompt'
      };
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry)
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], { historyIndex: 1 });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using prompt from history #1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test Prompt')
      );
    });

    it('should error for invalid history number', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        listHistory: vi.fn().mockResolvedValue([])
      } as any));
      
      await expect(runCommand(['echo'], { historyIndex: 999 })).rejects.toThrow(
        'History entry #999 not found'
      );
    });

    it('should error when history not configured', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
        // No historyDir
      } as any);
      
      await expect(runCommand(['echo'], { historyIndex: 1 })).rejects.toThrow(
        'History tracking is not enabled'
      );
    });
  });
});