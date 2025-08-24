import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoAnnotationService } from '../../src/services/auto-annotation-service.js';
import type { Config } from '../../src/types/config.js';
import type { EnhancedHistoryEntry } from '../../src/types/history.js';
import { PromptManager } from '../../src/prompts/prompt-manager.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import fs from 'fs-extra';
import path from 'path';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import { spawn } from 'node:child_process';
import * as fsNode from 'node:fs';

vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('fs-extra');
vi.mock('../../src/services/output-capture-service.js');

// Mock node:fs for tracking file descriptor operations
vi.mock('node:fs', () => ({
  openSync: vi.fn().mockReturnValue(3), // Return a fake file descriptor
  closeSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn()
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn((cmd, args, cb) => {
    // Mock tool availability check for both Windows and Unix
    const isWindows = process.platform === 'win32';
    const whichCmd = isWindows ? 'where' : 'which';
    
    if (cmd === whichCmd && args[0] === 'claude') {
      const path = isWindows ? 'C:\\Program Files\\claude\\claude.exe' : '/usr/local/bin/claude';
      cb(null, path, '');
    } else {
      cb(new Error('Command not found'), '', '');
    }
  }),
  spawn: vi.fn()
}));

describe('AutoAnnotationService', () => {
  let service: AutoAnnotationService;
  let mockConfig: Config;
  let mockPromptManager: PromptManager;
  let mockHistoryManager: HistoryManager;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      version: '4.0.0',
      promptDirs: ['/test/prompts'],
      historyDir: '/test/history',
      defaultCmd: 'claude',
      autoAnnotate: {
        enabled: true,
        triggers: ['test-prompt', 'code-review'],
        analysisPrompt: 'analyze-output'
      },
    } as Config;

    mockPromptManager = {
      findPrompt: vi.fn(),
    } as any;

    mockHistoryManager = {
      saveAnnotation: vi.fn(),
    } as any;

    service = new AutoAnnotationService(mockConfig, mockPromptManager, mockHistoryManager);
  });

  describe('analyzeExecution', () => {
    const mockHistoryEntry: EnhancedHistoryEntry = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'test-prompt',
      templateContent: 'test content',
      variables: {},
      finalPrompt: 'test prompt',
      filename: 'test.json',
      execution: {
        start_time: '2025-08-16T10:00:00Z',
        end_time: '2025-08-16T10:00:05Z',
        duration: '5s',
        exit_code: 0,
        command: 'echo test',
        output_file: '/tmp/output-12345.txt',
        output_size: 1024,
      },
    };

    it('should run analysis prompt after execution', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output content');

      // Mock spawn for AI execution
      const mockChildProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
        },
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      // Mock file operations for prompt file
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.analyzeExecution(mockHistoryEntry);

      expect(mockPromptManager.findPrompt).toHaveBeenCalledWith('analyze-output');
      expect(vi.mocked(spawn)).toHaveBeenCalled();
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[0]).toBe('claude');
      expect(spawnCall[1]).toEqual(['-p', '--permission-mode', 'acceptEdits', '--output-format', 'json']);
      expect(spawnCall[2]?.detached).toBe(true);
      // Now using file descriptors instead of 'pipe'
      expect(spawnCall[2]?.stdio[0]).toBe('pipe');
      expect(typeof spawnCall[2]?.stdio[1]).toBe('number'); // file descriptor
      expect(typeof spawnCall[2]?.stdio[2]).toBe('number'); // file descriptor
      expect(mockHistoryManager.saveAnnotation).not.toHaveBeenCalled();
    });

    it('should execute AI analysis successfully', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output content');

      // Mock spawn for AI execution
      const mockChildProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
        },
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // Should NOT save annotation immediately - it will be saved when Claude completes
      expect(mockHistoryManager.saveAnnotation).not.toHaveBeenCalled();
      
      // Verify that Claude was launched with correct arguments including --output-format json
      expect(vi.mocked(spawn)).toHaveBeenCalled();
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[0]).toBe('claude');
      expect(spawnCall[1]).toEqual(['-p', '--permission-mode', 'acceptEdits', '--output-format', 'json']);
      expect(spawnCall[2]?.detached).toBe(true);
      // Now using file descriptors instead of 'pipe'
      expect(spawnCall[2]?.stdio[0]).toBe('pipe');
      expect(typeof spawnCall[2]?.stdio[1]).toBe('number'); // file descriptor
      expect(typeof spawnCall[2]?.stdio[2]).toBe('number'); // file descriptor
    });

    it('should handle AI analysis failure gracefully', async () => {
      vi.mocked(mockPromptManager.findPrompt).mockRejectedValue(new Error('Prompt not found'));
      vi.mocked(fs.readFile).mockResolvedValue('Build failed with 5 tests failed');

      await service.analyzeExecution(mockHistoryEntry);

      // Should not save annotation on failure
      expect(mockHistoryManager.saveAnnotation).not.toHaveBeenCalled();
    });

    it('should handle missing output file gracefully', async () => {
      const entryWithoutOutput = {
        ...mockHistoryEntry,
        execution: undefined,
      };

      await service.analyzeExecution(entryWithoutOutput);

      expect(mockHistoryManager.saveAnnotation).not.toHaveBeenCalled();
    });

    it('should launch auto-annotation in background without waiting for completion', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output');
      
      // Mock spawn for AI execution
      const mockChildProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
        },
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // Should call unref to detach the process
      expect(mockChildProcess.unref).toHaveBeenCalled();
      
      // Should NOT save annotation - Claude will create it
      expect(mockHistoryManager.saveAnnotation).not.toHaveBeenCalled();
    });

    it('should handle very large output files without OOM', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      
      // Create a very large output (10MB)
      const largeOutput = 'x'.repeat(10 * 1024 * 1024);
      vi.mocked(fs.readFile).mockResolvedValue(largeOutput);
      
      // Mock spawn for AI execution
      const mockChildProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
        },
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // Verify that the prompt sent to stdin is truncated
      const writeCalls = mockChildProcess.stdin.write.mock.calls;
      expect(writeCalls.length).toBeGreaterThanOrEqual(1);
      const sentPrompt = writeCalls[0][0] as string;
      
      // Should be much smaller than 10MB
      expect(sentPrompt.length).toBeLessThan(300 * 1024); // Less than 300KB total
      expect(sentPrompt).toContain('[... truncated');
    });

    it('should use file descriptors for stdio when spawning Claude', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      // Mock spawn to track the stdio configuration
      const mockChildProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
        },
        pid: 12345,
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);
      
      // Reset fsNode mocks to track calls
      vi.mocked(fsNode.openSync).mockClear();
      vi.mocked(fsNode.closeSync).mockClear();
      vi.mocked(fsNode.openSync).mockReturnValueOnce(10).mockReturnValueOnce(11); // stdout and stderr fds

      await service.analyzeExecution(mockHistoryEntry);

      // Verify file descriptors were opened for stdout and stderr
      expect(fsNode.openSync).toHaveBeenCalledTimes(2);
      expect(fsNode.openSync).toHaveBeenCalledWith(expect.stringContaining('stdout.txt'), 'w');
      expect(fsNode.openSync).toHaveBeenCalledWith(expect.stringContaining('stderr.txt'), 'w');

      // Verify file descriptors were closed
      expect(fsNode.closeSync).toHaveBeenCalledTimes(2);
      expect(fsNode.closeSync).toHaveBeenCalledWith(10);
      expect(fsNode.closeSync).toHaveBeenCalledWith(11);

      // Verify spawn was called with file descriptors in stdio array
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[2]?.stdio).toEqual(['pipe', 10, 11]);
    });

    it('should create watcher process to save annotations', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      // Track all spawn calls
      const spawnCalls: any[] = [];
      vi.mocked(spawn).mockImplementation((cmd, args, options) => {
        spawnCalls.push({ cmd, args, options });
        
        // Return different mock for different processes
        if (cmd === 'claude') {
          return {
            stdin: { write: vi.fn(), end: vi.fn() },
            pid: 12345,
            unref: vi.fn(),
          } as any;
        } else if (cmd === process.execPath) {
          // This is the watcher process
          return {
            unref: vi.fn(),
          } as any;
        }
        return {} as any;
      });

      await service.analyzeExecution(mockHistoryEntry);

      // Should spawn two processes: Claude and the watcher
      expect(spawnCalls.length).toBe(2);

      // First spawn should be Claude
      expect(spawnCalls[0].cmd).toBe('claude');
      expect(spawnCalls[0].options.detached).toBe(true);

      // Second spawn should be the watcher process
      expect(spawnCalls[1].cmd).toBe(process.execPath);
      expect(spawnCalls[1].args).toEqual(['-e', expect.stringContaining('watchAndSave')]);
      expect(spawnCalls[1].options.detached).toBe(true);
      expect(spawnCalls[1].options.stdio).toBe('ignore');

      // Verify marker file was created with necessary data
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('marker.json'),
        expect.objectContaining({
          stdoutFile: expect.stringContaining('stdout.txt'),
          stderrFile: expect.stringContaining('stderr.txt'),
          historyEntry: mockHistoryEntry,
          annotationDir: mockConfig.annotationDir || mockConfig.historyDir,
          pid: 12345
        })
      );
    });
  });

  describe('shouldAutoAnnotate', () => {
    it('should return true for configured trigger prompts', () => {
      expect(service.shouldAutoAnnotate('test-prompt')).toBe(true);
      expect(service.shouldAutoAnnotate('code-review')).toBe(true);
    });

    it('should return false for non-trigger prompts', () => {
      expect(service.shouldAutoAnnotate('other-prompt')).toBe(false);
    });

    it('should return false when auto-annotation is disabled', () => {
      const disabledConfig = {
        ...mockConfig,
        autoAnnotate: {
          ...mockConfig.autoAnnotate!,
          enabled: false,
        },
      };
      service = new AutoAnnotationService(disabledConfig, mockPromptManager, mockHistoryManager);

      expect(service.shouldAutoAnnotate('test-prompt')).toBe(false);
    });

    it('should return false when autoAnnotate config is missing', () => {
      const noAutoConfig = {
        ...mockConfig,
        autoAnnotate: undefined,
      };
      service = new AutoAnnotationService(noAutoConfig, mockPromptManager, mockHistoryManager);

      expect(service.shouldAutoAnnotate('test-prompt')).toBe(false);
    });

    it('should return true for all prompts when triggers array is empty', () => {
      const allPromptsConfig = {
        ...mockConfig,
        autoAnnotate: {
          ...mockConfig.autoAnnotate!,
          triggers: [],
        },
      };
      service = new AutoAnnotationService(allPromptsConfig, mockPromptManager, mockHistoryManager);

      expect(service.shouldAutoAnnotate('any-prompt')).toBe(true);
      expect(service.shouldAutoAnnotate('other-prompt')).toBe(true);
    });
  });

  describe('JSON parsing from Claude output', () => {
    const mockHistoryEntry: EnhancedHistoryEntry = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'test-prompt',
      templateContent: 'test content',
      variables: {},
      finalPrompt: 'test prompt',
      filename: 'test.json',
      execution: {
        start_time: '2025-08-16T10:00:00Z',
        end_time: '2025-08-16T10:00:05Z',
        duration: '5s',
        exit_code: 0,
        command: 'echo test',
        output_file: '/tmp/output-12345.txt',
        output_size: 1024,
      },
    };

    it('should handle Claude JSON output format with result field', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Test output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      // Mock Claude's response format with 'result' field
      const claudeResponse = {
        result: JSON.stringify({
          status: 'partial',
          tags: ['auto-annotation', 'ai-analysis'],
          auto_detected: true,
          notes: 'Found issues in execution',
          issues_identified: [{
            category: 'verification_gap',
            severity: 'medium',
            description: 'No tests run',
            evidence: 'No test command found'
          }]
        })
      };

      // Mock spawn to simulate Claude returning JSON
      let stdinContent = '';
      const mockChildProcess = {
        stdin: {
          write: vi.fn((data) => { stdinContent = data; }),
          end: vi.fn(),
        },
        pid: 12345,
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      // Create a test to verify the service can handle the response
      await service.analyzeExecution(mockHistoryEntry);

      // Verify Claude was called
      expect(spawn).toHaveBeenCalledWith('claude', expect.any(Array), expect.any(Object));
      
      // Verify the prompt was sent
      expect(mockChildProcess.stdin.write).toHaveBeenCalled();
      expect(stdinContent).toContain('Test output');
      expect(stdinContent).toContain('Analyze the output');
    });

    it('should handle JSON embedded in markdown code blocks', async () => {
      // This tests the regex extraction of JSON from markdown
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      const mockChildProcess = {
        stdin: { write: vi.fn(), end: vi.fn() },
        pid: 12345,
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // The actual parsing happens in the watcher process
      // Verify the watcher code includes proper JSON extraction logic
      const spawnCalls = vi.mocked(spawn).mock.calls;
      const watcherCall = spawnCalls.find(call => call[0] === process.execPath);
      expect(watcherCall).toBeDefined();
      
      const watcherCode = watcherCall![1][1];
      expect(watcherCode).toContain('JSON.parse');
      expect(watcherCode).toContain('parsed.result');
      expect(watcherCode).toContain('match(/\\{[\\s\\S]*\\}/)');
    });

    it('should handle direct JSON response without wrapper', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      const mockChildProcess = {
        stdin: { write: vi.fn(), end: vi.fn() },
        pid: 12345,
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // Verify marker file contains all necessary data for watcher
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('marker.json'),
        expect.objectContaining({
          historyEntry: mockHistoryEntry,
          annotationDir: expect.any(String),
          pid: 12345
        })
      );
    });

    it('should include execution metadata in analysis context', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the execution',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      let capturedPrompt = '';
      const mockChildProcess = {
        stdin: {
          write: vi.fn((data) => { capturedPrompt = data; }),
          end: vi.fn(),
        },
        pid: 12345,
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      // Create history entry with specific metadata
      const testHistoryEntry = {
        ...mockHistoryEntry,
        execution: {
          ...mockHistoryEntry.execution!,
          exit_code: 1,
          duration: '42s',
          command: 'npm test'
        }
      };

      await service.analyzeExecution(testHistoryEntry);

      // Verify metadata is included in the prompt
      expect(capturedPrompt).toContain('Exit Code: 1');
      expect(capturedPrompt).toContain('Duration: 42s');
      expect(capturedPrompt).toContain('Command: npm test');
      expect(capturedPrompt).toContain('History File:');
      expect(capturedPrompt).toContain('Annotation Directory:');
    });

    it('should handle empty or invalid JSON responses gracefully', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Output');
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      const mockChildProcess = {
        stdin: { write: vi.fn(), end: vi.fn() },
        pid: 12345,
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      // Should not throw
      await expect(service.analyzeExecution(mockHistoryEntry)).resolves.not.toThrow();

      // Verify watcher process is still created even if parsing might fail
      const spawnCalls = vi.mocked(spawn).mock.calls;
      expect(spawnCalls.length).toBe(2); // Claude and watcher
    });
  });
});