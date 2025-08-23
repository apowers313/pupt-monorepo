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

vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('fs-extra');
vi.mock('../../src/services/output-capture-service.js');
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
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      // Mock file operations for prompt file
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.analyzeExecution(mockHistoryEntry);

      expect(mockPromptManager.findPrompt).toHaveBeenCalledWith('analyze-output');
      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        'claude',
        ['-p', '--permission-mode', 'acceptEdits'],
        expect.objectContaining({
          detached: true,
          stdio: ['pipe', 'ignore', 'ignore'],
        })
      );
      expect(mockHistoryManager.saveAnnotation).toHaveBeenCalled();
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
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // Check that saveAnnotation was called
      expect(mockHistoryManager.saveAnnotation).toHaveBeenCalled();
      
      // Get the saved annotation from the call
      const callArgs = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0];
      expect(callArgs).toBeDefined();
      
      if (callArgs && callArgs[1]) {
        const savedAnnotation = callArgs[1];
        expect(savedAnnotation.status).toBe('success');
        expect(savedAnnotation.auto_detected).toBe(true);
      }
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
        on: vi.fn(),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

      await service.analyzeExecution(mockHistoryEntry);

      // Should call unref to detach the process
      expect(mockChildProcess.unref).toHaveBeenCalled();
      
      // Should save annotation with background status
      expect(mockHistoryManager.saveAnnotation).toHaveBeenCalled();
      const savedAnnotation = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0][1];
      expect(savedAnnotation.status).toBe('success');
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
});