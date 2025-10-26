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
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/ui/interactive-search.js');
vi.mock('../../src/template/template-engine.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/utils/logger.js');
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

describe('Run Command', () => {
  let loggerLogSpy: any;
  let loggerErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
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
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof runCommand).toBe('function');
    });

    it('should return a promise', () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
        } as any,
        filepath: undefined
      });
      
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
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello World'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          defaultCmd: 'claude',
          defaultCmdArgs: ['--model', 'sonnet']
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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

      expect(spawn).toHaveBeenCalledWith('claude', ['--model', 'sonnet', 'Hello'], expect.any(Object));
    });

    it('should override config tool with explicit tool', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          defaultCmd: 'claude',
          defaultCmdArgs: ['--model', 'sonnet']
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello World'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
          // No historyDir, so no history to save
        } as any,
        filepath: undefined
      });
      
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
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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
      
      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        templatePath: '/prompts/test.md',
        templateContent: 'Hello',
        variables: new Map(),
        finalPrompt: 'Hello',
        title: 'Test Prompt',
        reviewFiles: [],
        timestamp: expect.any(Date)
      }));
    });

    it('should not save to history when not configured', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
          // No historyDir
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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

    it('should not save to history when prompt is empty', async () => {
      const mockPrompts = [
        { title: 'Empty Prompt', path: '/prompts/empty.md', content: '{{!-- Just a comment --}}' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue(''), // Empty result
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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

    it('should not save to history when prompt contains only whitespace', async () => {
      const mockPrompts = [
        { title: 'Whitespace Prompt', path: '/prompts/whitespace.md', content: '   \n\t   ' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('   \n\t   '), // Only whitespace
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
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
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
          // No defaultCmd configured
        } as any,
        filepath: undefined
      });
      
      await expect(runCommand([], {})).rejects.toThrow(
        "Tool '' not found"
      );
    });

    it('should handle no prompts found', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
        } as any,
        filepath: undefined
      });
      
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
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
        })
      } as any));
    });

    it('should prompt for each configured option', async () => {
      vi.mocked(confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
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
      
      // Should include --continue but not --web (and prompt as final argument)
      expect(spawn).toHaveBeenCalledWith('claude', ['--model', 'sonnet', '--continue', 'Hello'], expect.any(Object));
    });

    it('should preserve argument order', async () => {
      vi.mocked(confirm).mockResolvedValueOnce(true);
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          defaultCmd: 'claude',
          defaultCmdArgs: ['--model', 'sonnet'],
          defaultCmdOptions: {
            'Continue?': '--continue'
          }
        } as any,
        filepath: undefined
      });
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['--', '--temperature', '0.7'], {});

      expect(spawn).toHaveBeenCalledWith('claude',
        ['--model', 'sonnet', '--continue', '--temperature', '0.7', 'Hello'],
        expect.any(Object)
      );
    });

    it('should skip options when using explicit tool', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          defaultCmd: 'claude',
          defaultCmdOptions: {
            'Continue?': '--continue'
          }
        } as any,
        filepath: undefined
      });
      
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
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });
      
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
        getHistoryEntry: mockGetEntry,
        savePrompt: vi.fn().mockResolvedValue('test-filename.json')
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
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });
      
      const mockHistoryEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/prompts/test.md',
        templateContent: 'Hello',
        variables: {},
        finalPrompt: 'Hello',
        title: 'Test Prompt'
      };
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
        savePrompt: vi.fn().mockResolvedValue('test-filename.json')
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand(['echo'], { historyIndex: 1 });
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using prompt from history #1')
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test Prompt')
      );
    });

    it('should error for invalid history number', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory'
        } as any,
        filepath: undefined
      });
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        listHistory: vi.fn().mockResolvedValue([])
      } as any));
      
      await expect(runCommand(['echo'], { historyIndex: 999 })).rejects.toThrow(
        'History entry #999 not found'
      );
    });

    it('should error when history not configured', async () => {
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts']
          // No historyDir
        } as any,
        filepath: undefined
      });
      
      await expect(runCommand(['echo'], { historyIndex: 1 })).rejects.toThrow(
        'History tracking is not enabled'
      );
    });
  });

  describe('history saving on tool failure', () => {
    it('should save history even when tool exits with non-zero code', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello {{name}}' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          defaultCmd: 'false' // Command that always fails
        } as any,
        filepath: undefined
      });
      
      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello world'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map([['name', 'world']])),
          getVariablesByType: vi.fn().mockReturnValue([])
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(1); // Exit code 1 indicates failure
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      // Mock process.exit to prevent test from actually exiting
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        // Don't throw, just return undefined
        return undefined as never;
      });
      
      await runCommand([], {});
      
      // Verify history WAS saved despite non-zero exit code
      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        templatePath: '/prompts/test.md',
        templateContent: 'Hello {{name}}',
        variables: new Map([['name', 'world']]),
        finalPrompt: 'Hello world',
        title: 'Test Prompt',
        reviewFiles: [],
        timestamp: expect.any(Date)
      }));
      
      // Verify process.exit was called with the tool's exit code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should save history even when tool spawn fails', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          defaultCmd: 'nonexistent-command'
        } as any,
        filepath: undefined
      });
      
      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            const error = new Error('spawn ENOENT') as Error & { code?: string };
            error.code = 'ENOENT';
            callback(error);
          }
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await expect(runCommand([], {})).rejects.toThrow('not found');
      
      // Verify history WAS saved even though spawn failed
      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        templatePath: '/prompts/test.md',
        templateContent: 'Hello',
        variables: new Map(),
        finalPrompt: 'Hello',
        title: 'Test Prompt',
        reviewFiles: [],
        timestamp: expect.any(Date)
      }));
    });

    it('should save history when tool execution succeeds', async () => {
      const mockPrompts = [
        { title: 'Test Prompt', path: '/prompts/test.md', content: 'Hello' }
      ];
      
      vi.mocked(ConfigManager.loadWithPath).mockResolvedValue({
        config: {
          promptDirs: ['./.prompts'],
          historyDir: './.pthistory',
          defaultCmd: 'echo'
        } as any,
        filepath: undefined
      });
      
      const mockSavePrompt = vi.fn().mockResolvedValue('history-file.json');
      vi.mocked(HistoryManager).mockImplementation(() => ({
        savePrompt: mockSavePrompt
      } as any));
      
      vi.mocked(PromptManager).mockImplementation(() => ({
        discoverPrompts: vi.fn().mockResolvedValue(mockPrompts)
      } as any));
      
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: vi.fn().mockResolvedValue(mockPrompts[0])
      } as any));
      
      vi.mocked(TemplateEngine).mockImplementation(() => ({
        processTemplate: vi.fn().mockResolvedValue('Hello'),
        getContext: vi.fn().mockReturnValue({
          getMaskedValues: vi.fn().mockReturnValue(new Map()),
          getVariablesByType: vi.fn().mockReturnValue([])
        })
      } as any));
      
      const mockSpawn = {
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0); // Exit code 0 indicates success
        })
      };
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);
      
      await runCommand([], {});
      
      // Verify history WAS saved
      expect(mockSavePrompt).toHaveBeenCalledWith(expect.objectContaining({
        templatePath: '/prompts/test.md',
        templateContent: 'Hello',
        variables: new Map(),
        finalPrompt: 'Hello',
        title: 'Test Prompt',
        reviewFiles: [],
        timestamp: expect.any(Date)
      }));
    });
  });
});