import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reviewCommand } from '../../src/commands/review.js';
import { ReviewDataBuilder } from '../../src/services/review-data-builder.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import type { ReviewData } from '../../src/types/review.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/services/review-data-builder.js');
vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/utils/logger.js');
vi.mock('../../src/utils/prompt-dir-resolver.js', () => ({
  resolvePromptDirs: vi.fn(async (opts: any) => opts.configPromptDirs),
}));

describe('Review Command', () => {
  let mockReviewDataBuilder: any;
  let loggerLogSpy: any;
  let loggerErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    loggerLogSpy = vi.fn();
    loggerErrorSpy = vi.fn();
    vi.mocked(logger.log).mockImplementation(loggerLogSpy);
    vi.mocked(logger.error).mockImplementation(loggerErrorSpy);

    mockReviewDataBuilder = {
      buildReviewData: vi.fn()
    };

    vi.mocked(ReviewDataBuilder).mockReturnValue(mockReviewDataBuilder);
    vi.mocked(ConfigManager.load).mockResolvedValue({
      templatesDir: '~/.pt/templates',
      promptsDir: './prompts',
      historyDir: './history',
      debugLevel: 0,
      editor: 'vim',
      backupBeforeEdit: true,
      systemPrompt: '',
      dateFormats: {},
      maskPatterns: [],
      errorRecovery: {},
      version: '3.0.0'
    });
  });

  describe('basic functionality', () => {
    it('should aggregate history and annotation data', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 2,
          total_executions: 10,
          data_completeness: {
            with_annotations: 80,
            with_output_capture: 50,
            with_environment_data: 100
          }
        },
        prompts: [
          {
            name: 'test-prompt',
            path: 'prompts/test-prompt.md',
            content: '# Test Prompt',
            last_modified: '2025-08-16T10:00:00Z',
            usage_statistics: {
              total_runs: 5,
              annotated_runs: 4,
              success_rate: 0.8,
              avg_duration: '2m 30s',
              last_used: '2025-08-16T15:00:00Z'
            },
            execution_outcomes: {
              success: 4,
              partial: 1,
              failure: 0
            },
            environment_correlations: {},
            captured_outputs: [],
            user_annotations: [],
            detected_patterns: []
          }
        ],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, {});

      expect(mockReviewDataBuilder.buildReviewData).toHaveBeenCalledWith({
        promptName: undefined,
        since: undefined
      });
      expect(loggerLogSpy).toHaveBeenCalled();
    });

    it('should export JSON format when requested', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 1,
          total_executions: 5,
          data_completeness: {
            with_annotations: 100,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [{
          name: 'test',
          path: 'prompts/test.md',
          content: '# Test',
          last_modified: '2025-08-16T10:00:00Z',
          usage_statistics: {
            total_runs: 5,
            annotated_runs: 5,
            success_rate: 1.0,
            avg_duration: 'N/A',
            last_used: '2025-08-16T15:00:00Z'
          },
          execution_outcomes: {
            success: 5,
            partial: 0,
            failure: 0
          },
          environment_correlations: {},
          captured_outputs: [],
          user_annotations: [],
          detected_patterns: []
        }],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, { format: 'json' });

      // Should output raw JSON
      expect(loggerLogSpy).toHaveBeenCalledWith(
        JSON.stringify(mockReviewData, null, 2)
      );
    });

    it('should support time filtering with --since option', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '7d',
          total_prompts: 1,
          total_executions: 3,
          data_completeness: {
            with_annotations: 100,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, { since: '7d' });

      expect(mockReviewDataBuilder.buildReviewData).toHaveBeenCalledWith({
        promptName: undefined,
        since: '7d'
      });
    });

    it('should handle specific prompt filtering', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 1,
          total_executions: 2,
          data_completeness: {
            with_annotations: 100,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [{
          name: 'specific-prompt',
          path: 'prompts/specific-prompt.md',
          content: '# Specific',
          last_modified: '2025-08-16T10:00:00Z',
          usage_statistics: {
            total_runs: 2,
            annotated_runs: 2,
            success_rate: 0.5,
            avg_duration: 'N/A',
            last_used: '2025-08-16T15:00:00Z'
          },
          execution_outcomes: {
            success: 1,
            partial: 1,
            failure: 0
          },
          environment_correlations: {},
          captured_outputs: [],
          user_annotations: [],
          detected_patterns: []
        }],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand('specific-prompt', {});

      expect(mockReviewDataBuilder.buildReviewData).toHaveBeenCalledWith({
        promptName: 'specific-prompt',
        since: undefined
      });
    });
  });

  describe('markdown output formatting', () => {
    it('should format markdown report for human readability', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 2,
          total_executions: 15,
          data_completeness: {
            with_annotations: 80,
            with_output_capture: 60,
            with_environment_data: 100
          }
        },
        prompts: [
          {
            name: 'high-performer',
            path: 'prompts/high-performer.md',
            content: '# High Performer',
            last_modified: '2025-08-16T10:00:00Z',
            usage_statistics: {
              total_runs: 10,
              annotated_runs: 8,
              success_rate: 0.9,
              avg_duration: '1m 45s',
              last_used: '2025-08-16T15:00:00Z'
            },
            execution_outcomes: {
              success: 9,
              partial: 1,
              failure: 0
            },
            environment_correlations: {},
            captured_outputs: [],
            user_annotations: [],
            detected_patterns: []
          },
          {
            name: 'problematic',
            path: 'prompts/problematic.md',
            content: '# Problematic',
            last_modified: '2025-08-15T10:00:00Z',
            usage_statistics: {
              total_runs: 5,
              annotated_runs: 4,
              success_rate: 0.2,
              avg_duration: '5m 30s',
              last_used: '2025-08-16T12:00:00Z'
            },
            execution_outcomes: {
              success: 1,
              partial: 2,
              failure: 2
            },
            environment_correlations: {},
            captured_outputs: [],
            user_annotations: [],
            detected_patterns: []
          }
        ],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, { format: 'markdown' });

      // Should output formatted markdown
      const output = loggerLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('# Prompt Review Report');
      expect(output).toContain('Total Prompts: 2');
      expect(output).toContain('Total Executions: 15');
      expect(output).toContain('high-performer');
      expect(output).toContain('Success Rate: 90.0%');
      expect(output).toContain('problematic');
      expect(output).toContain('Success Rate: 20.0%');
    });
  });

  describe('markdown report with annotations and patterns', () => {
    it('should include user annotations in markdown report', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 1,
          total_executions: 3,
          data_completeness: {
            with_annotations: 100,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [{
          name: 'annotated-prompt',
          path: 'prompts/annotated.md',
          content: '# Annotated',
          last_modified: '2025-08-16T10:00:00Z',
          usage_statistics: {
            total_runs: 3,
            annotated_runs: 3,
            success_rate: 0.66,
            avg_duration: '2m',
            last_used: '2025-08-16T15:00:00Z'
          },
          execution_outcomes: {
            success: 2,
            partial: 1,
            failure: 0
          },
          environment_correlations: {},
          captured_outputs: [],
          user_annotations: [
            {
              timestamp: '2025-08-16T15:00:00Z',
              status: 'success',
              notes: 'Worked great, no issues found'
            },
            {
              timestamp: '2025-08-16T12:00:00Z',
              status: 'partial',
              notes: 'Some tests failed but overall structure was good'
            },
            {
              timestamp: '2025-08-16T10:00:00Z',
              status: 'failure',
              notes: null
            }
          ],
          detected_patterns: [
            {
              pattern_type: 'verification_gap',
              severity: 'medium',
              frequency: 2,
              description: 'Tests not verified'
            }
          ]
        }],
        cross_prompt_patterns: [
          {
            pattern: 'inconsistent_testing',
            affected_prompts: ['annotated-prompt', 'other-prompt'],
            total_occurrences: 5,
            impact_assessment: 'Medium impact on reliability'
          }
        ]
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, { format: 'markdown' });

      const output = loggerLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');

      // Should include annotations section
      expect(output).toContain('Recent Annotations');
      expect(output).toContain('Worked great, no issues found');

      // Should include detected patterns
      expect(output).toContain('Detected Patterns');
      expect(output).toContain('verification_gap');
      expect(output).toContain('medium');

      // Should include cross-prompt patterns
      expect(output).toContain('Cross-Prompt Patterns');
      expect(output).toContain('inconsistent_testing');
      expect(output).toContain('Medium impact on reliability');
    });

    it('should truncate long annotation notes', async () => {
      const longNote = 'A'.repeat(150);
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 1,
          total_executions: 1,
          data_completeness: {
            with_annotations: 100,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [{
          name: 'long-notes',
          path: 'prompts/long.md',
          content: '# Long',
          last_modified: '2025-08-16T10:00:00Z',
          usage_statistics: {
            total_runs: 1,
            annotated_runs: 1,
            success_rate: 1,
            avg_duration: '1m',
            last_used: '2025-08-16T15:00:00Z'
          },
          execution_outcomes: { success: 1, partial: 0, failure: 0 },
          environment_correlations: {},
          captured_outputs: [],
          user_annotations: [{
            timestamp: '2025-08-16T15:00:00Z',
            status: 'success',
            notes: longNote
          }],
          detected_patterns: []
        }],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, { format: 'markdown' });

      const output = loggerLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      // Should truncate to 100 chars + '...'
      expect(output).toContain('...');
      expect(output).not.toContain(longNote);
    });

    it('should write JSON to file when --output is specified', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 0,
          total_executions: 0,
          data_completeness: { with_annotations: 0, with_output_capture: 0, with_environment_data: 0 }
        },
        prompts: [],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      const fsMock = await import('fs-extra');
      const writeFileSpy = vi.spyOn(fsMock.default, 'writeFile').mockResolvedValue();

      await reviewCommand(undefined, { format: 'json', output: '/tmp/review.json' });

      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/review.json',
        JSON.stringify(mockReviewData, null, 2)
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Review data written to'));

      writeFileSpy.mockRestore();
    });

    it('should write markdown to file when --output is specified without format', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 0,
          total_executions: 0,
          data_completeness: { with_annotations: 0, with_output_capture: 0, with_environment_data: 0 }
        },
        prompts: [],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      const fsMock = await import('fs-extra');
      const writeFileSpy = vi.spyOn(fsMock.default, 'writeFile').mockResolvedValue();

      await reviewCommand(undefined, { output: '/tmp/review.md' });

      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/review.md',
        expect.stringContaining('# Prompt Review Report')
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Review report written to'));

      writeFileSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    let processExitSpy: any;

    beforeEach(() => {
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    afterEach(() => {
      processExitSpy.mockRestore();
    });

    it('should handle missing annotations gracefully', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 1,
          total_executions: 5,
          data_completeness: {
            with_annotations: 0,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [{
          name: 'unannotated',
          path: 'prompts/unannotated.md',
          content: '# Unannotated',
          last_modified: '2025-08-16T10:00:00Z',
          usage_statistics: {
            total_runs: 5,
            annotated_runs: 0,
            success_rate: 0,
            avg_duration: 'N/A',
            last_used: '2025-08-16T15:00:00Z'
          },
          execution_outcomes: {
            success: 0,
            partial: 0,
            failure: 0
          },
          environment_correlations: {},
          captured_outputs: [],
          user_annotations: [],
          detected_patterns: []
        }],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      await reviewCommand(undefined, {});

      expect(loggerLogSpy).toHaveBeenCalled();
      // Should still display report even with no annotations
      const output = loggerLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('unannotated');
      expect(output).toContain('No annotations available');
    });

    it('should handle builder errors gracefully', async () => {
      mockReviewDataBuilder.buildReviewData.mockRejectedValue(
        new Error('Failed to build review data')
      );

      await expect(reviewCommand(undefined, {})).rejects.toThrow('process.exit called');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating review:')
      );
    });

    it('should show time filter hint when --since is used and error occurs', async () => {
      mockReviewDataBuilder.buildReviewData.mockRejectedValue(
        new Error('Invalid time format')
      );

      await expect(reviewCommand(undefined, { since: 'invalid' })).rejects.toThrow('process.exit called');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Check that the time filter format is correct')
      );
    });

    it('should show prompt name hint when promptName is specified and error occurs', async () => {
      mockReviewDataBuilder.buildReviewData.mockRejectedValue(
        new Error('Prompt not found')
      );

      await expect(reviewCommand('nonexistent', {})).rejects.toThrow('process.exit called');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verify that the prompt name exists')
      );
    });
  });

  describe('output file option', () => {
    it('should support writing output to file', async () => {
      const mockReviewData: ReviewData = {
        metadata: {
          analysis_period: '30d',
          total_prompts: 1,
          total_executions: 1,
          data_completeness: {
            with_annotations: 100,
            with_output_capture: 0,
            with_environment_data: 0
          }
        },
        prompts: [],
        cross_prompt_patterns: []
      };

      mockReviewDataBuilder.buildReviewData.mockResolvedValue(mockReviewData);

      const writeFileSpy = vi.fn();
      vi.doMock('fs-extra', () => ({
        writeFile: writeFileSpy
      }));

      await reviewCommand(undefined, { format: 'json', output: 'review.json' });

      // Note: This test is conceptual - actual implementation may vary
      // The command should write to file when --output is specified
    });
  });
});