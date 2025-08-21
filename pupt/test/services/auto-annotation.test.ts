import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoAnnotationService } from '../../src/services/auto-annotation-service.js';
import type { Config } from '../../src/types/config.js';
import type { EnhancedHistoryEntry } from '../../src/types/history.js';
import { PromptManager } from '../../src/prompts/prompt-manager.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import fs from 'fs-extra';
import path from 'path';

vi.mock('../../src/prompts/prompt-manager.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('fs-extra');

describe('AutoAnnotationService', () => {
  let service: AutoAnnotationService;
  let mockConfig: Config;
  let mockPromptManager: PromptManager;
  let mockHistoryManager: HistoryManager;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      version: '4.0.0',
      promptsDirectory: '/test/prompts',
      historyDirectory: '/test/history',
      autoAnnotate: {
        enabled: true,
        triggers: ['test-prompt', 'code-review'],
        analysisPrompt: 'analyze-output',
        fallbackRules: [
          {
            pattern: '\\d+ tests? failed',
            category: 'verification_gap',
            severity: 'high',
          },
          {
            pattern: 'build failed|compilation error',
            category: 'incomplete_task',
            severity: 'critical',
          },
        ],
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
      command: 'echo test',
      inputs: {},
      maskedInputs: {},
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

      // Mock the prompt execution to return valid JSON
      const executePromptSpy = vi.spyOn(service as any, 'executeAnalysisPrompt')
        .mockResolvedValue({
          status: 'partial',
          issues_identified: [
            {
              category: 'verification_gap',
              severity: 'high',
              description: 'Tests were not run',
              evidence: 'No test output found',
            },
          ],
          structured_outcome: {
            tasks_completed: 2,
            tasks_total: 3,
            tests_run: 0,
            tests_passed: 0,
            tests_failed: 0,
            verification_passed: false,
            execution_time: '5s',
          },
        });

      await service.analyzeExecution(mockHistoryEntry);

      expect(mockPromptManager.findPrompt).toHaveBeenCalledWith('analyze-output');
      expect(executePromptSpy).toHaveBeenCalledWith(
        mockAnalysisPrompt,
        'Command output content'
      );
      expect(mockHistoryManager.saveAnnotation).toHaveBeenCalled();
    });

    it('should parse JSON response from AI', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output content');

      const aiResponse = {
        status: 'success',
        notes: 'All tasks completed successfully',
        structured_outcome: {
          tasks_completed: 3,
          tasks_total: 3,
          tests_run: 10,
          tests_passed: 10,
          tests_failed: 0,
          verification_passed: true,
          execution_time: '5s',
        },
      };

      vi.spyOn(service as any, 'executeAnalysisPrompt').mockResolvedValue(aiResponse);

      await service.analyzeExecution(mockHistoryEntry);

      const savedAnnotation = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0][1];
      expect(savedAnnotation.status).toBe('success');
      expect(savedAnnotation.auto_detected).toBe(true);
      expect(savedAnnotation.structured_outcome).toEqual(aiResponse.structured_outcome);
    });

    it('should fall back to pattern rules on failure', async () => {
      vi.mocked(mockPromptManager.findPrompt).mockRejectedValue(new Error('Prompt not found'));
      vi.mocked(fs.readFile).mockResolvedValue('Build failed with 5 tests failed');

      await service.analyzeExecution(mockHistoryEntry);

      const savedAnnotation = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0][1];
      expect(savedAnnotation.status).toBe('failure');
      expect(savedAnnotation.auto_detected).toBe(true);
      expect(savedAnnotation.issues_identified).toHaveLength(2); // Both patterns match
      expect(savedAnnotation.issues_identified?.[0].category).toBe('verification_gap');
      expect(savedAnnotation.issues_identified?.[1].category).toBe('incomplete_task');
    });

    it('should create annotation files automatically', async () => {
      vi.mocked(mockPromptManager.findPrompt).mockRejectedValue(new Error('AI unavailable'));
      vi.mocked(fs.readFile).mockResolvedValue('3 tests failed');

      await service.analyzeExecution(mockHistoryEntry);

      expect(mockHistoryManager.saveAnnotation).toHaveBeenCalledWith(
        mockHistoryEntry,
        expect.objectContaining({
          historyFile: path.basename(mockHistoryEntry.timestamp + '.json'),
          timestamp: expect.any(String),
          status: 'failure',
          auto_detected: true,
          tags: ['auto-annotation', 'pattern-match'],
        })
      );
    });

    it('should handle missing output file gracefully', async () => {
      const entryWithoutOutput = {
        ...mockHistoryEntry,
        execution: undefined,
      };

      await service.analyzeExecution(entryWithoutOutput);

      expect(mockHistoryManager.saveAnnotation).not.toHaveBeenCalled();
    });

    it('should handle invalid AI response gracefully', async () => {
      const mockAnalysisPrompt = {
        name: 'analyze-output',
        content: 'Analyze the output',
      };

      vi.mocked(mockPromptManager.findPrompt).mockResolvedValue(mockAnalysisPrompt);
      vi.mocked(fs.readFile).mockResolvedValue('Command output');
      
      // Return invalid JSON
      vi.spyOn(service as any, 'executeAnalysisPrompt').mockResolvedValue('Not valid JSON');

      await service.analyzeExecution(mockHistoryEntry);

      // Should fall back to pattern matching
      const savedAnnotation = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0][1];
      expect(savedAnnotation.tags).toContain('pattern-match');
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
  });

  describe('pattern matching', () => {
    it('should detect test failures', async () => {
      const historyEntry: EnhancedHistoryEntry = {
        timestamp: '2025-08-16T10:00:00Z',
        templatePath: 'test-prompt',
        command: 'npm test',
        inputs: {},
        maskedInputs: {},
        execution: {
          start_time: '2025-08-16T10:00:00Z',
          end_time: '2025-08-16T10:00:05Z',
          duration: '5s',
          exit_code: 1,
          command: 'npm test',
          output_file: '/tmp/output.txt',
          output_size: 500,
        },
      };

      vi.mocked(mockPromptManager.findPrompt).mockRejectedValue(new Error('No AI'));
      vi.mocked(fs.readFile).mockResolvedValue(`
        Running tests...
        ✓ Test 1 passed
        ✓ Test 2 passed
        ✗ Test 3 failed
        ✗ Test 4 failed
        
        2 tests failed
      `);

      await service.analyzeExecution(historyEntry);

      const savedAnnotation = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0][1];
      expect(savedAnnotation.issues_identified).toHaveLength(1);
      expect(savedAnnotation.issues_identified?.[0]).toEqual({
        category: 'verification_gap',
        severity: 'high',
        description: 'Pattern detected: 2 tests failed',
        evidence: '2 tests failed',
      });
    });

    it('should detect build failures', async () => {
      const historyEntry: EnhancedHistoryEntry = {
        timestamp: '2025-08-16T10:00:00Z',
        templatePath: 'test-prompt',
        command: 'npm run build',
        inputs: {},
        maskedInputs: {},
        execution: {
          start_time: '2025-08-16T10:00:00Z',
          end_time: '2025-08-16T10:00:05Z',
          duration: '5s',
          exit_code: 1,
          command: 'npm run build',
          output_file: '/tmp/output.txt',
          output_size: 500,
        },
      };

      vi.mocked(mockPromptManager.findPrompt).mockRejectedValue(new Error('No AI'));
      vi.mocked(fs.readFile).mockResolvedValue('Error: build failed due to TypeScript errors');

      await service.analyzeExecution(historyEntry);

      const savedAnnotation = vi.mocked(mockHistoryManager.saveAnnotation).mock.calls[0][1];
      expect(savedAnnotation.issues_identified).toHaveLength(1);
      expect(savedAnnotation.issues_identified?.[0].category).toBe('incomplete_task');
      expect(savedAnnotation.issues_identified?.[0].severity).toBe('critical');
    });
  });
});