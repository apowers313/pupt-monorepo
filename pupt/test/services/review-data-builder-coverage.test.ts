import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewDataBuilder } from '../../src/services/review-data-builder.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { PuptService } from '../../src/services/pupt-service.js';
import type { Config } from '../../src/types/config.js';
import type { HistoryEntry, EnhancedHistoryEntry } from '../../src/types/history.js';
import fs from 'fs-extra';
import path from 'path';

vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/services/pupt-service.js');
vi.mock('fs-extra');

describe('ReviewDataBuilder - Coverage Improvements', () => {
  let reviewDataBuilder: ReviewDataBuilder;
  let mockConfig: Config;
  let mockHistoryManager: any;
  let mockPuptService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      templatesDir: '~/.pt/templates',
      promptsDir: './prompts',
      promptDirs: ['./prompts'],
      historyDir: './history',
      annotationDir: './annotations',
      debugLevel: 0,
      editor: 'vim',
      backupBeforeEdit: true,
      systemPrompt: '',
      dateFormats: {},
      maskPatterns: [],
      errorRecovery: {},
      version: '3.0.0'
    };

    mockHistoryManager = {
      listHistory: vi.fn().mockResolvedValue([]),
      loadHistory: vi.fn()
    };

    mockPuptService = {
      init: vi.fn().mockResolvedValue(undefined),
      getPromptsAsAdapted: vi.fn().mockReturnValue([]),
      findPrompt: vi.fn(),
      getPrompts: vi.fn().mockReturnValue([]),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
    };

    vi.mocked(HistoryManager).mockReturnValue(mockHistoryManager);
    vi.mocked(PuptService).mockImplementation(() => mockPuptService as any);

    // Default: no annotation files
    vi.mocked(fs.readdir).mockResolvedValue([] as any);
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

    reviewDataBuilder = new ReviewDataBuilder(mockConfig);
  });

  describe('parseSinceDate', () => {
    it('should parse hours format (e.g., "24h")', async () => {
      const now = new Date();
      const entries: HistoryEntry[] = [
        {
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_test.json'
        },
        {
          timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
          templatePath: 'prompts/old.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_old.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({ since: '24h' });
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('test');
    });

    it('should parse minutes format (e.g., "30m")', async () => {
      const now = new Date();
      const entries: HistoryEntry[] = [
        {
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 min ago
          templatePath: 'prompts/recent.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_recent.json'
        },
        {
          timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 60 min ago
          templatePath: 'prompts/older.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_older.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'recent.md', path: 'prompts/recent.md', relativePath: 'recent.md', title: 'Recent', tags: [], content: '# Recent', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({ since: '30m' });
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('recent');
    });

    it('should parse weeks format (e.g., "2w")', async () => {
      const now = new Date();
      const entries: HistoryEntry[] = [
        {
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          templatePath: 'prompts/week-old.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_week.json'
        },
        {
          timestamp: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks ago
          templatePath: 'prompts/three-weeks.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_three_weeks.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'week-old.md', path: 'prompts/week-old.md', relativePath: 'week-old.md', title: 'Week', tags: [], content: '# Week', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({ since: '2w' });
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('week-old');
    });

    it('should parse ISO date format', async () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: '2025-09-01T10:00:00Z',
          templatePath: 'prompts/after.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_after.json'
        },
        {
          timestamp: '2025-07-01T10:00:00Z',
          templatePath: 'prompts/before.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_before.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'after.md', path: 'prompts/after.md', relativePath: 'after.md', title: 'After', tags: [], content: '# After', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({ since: '2025-08-01' });
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('after');
    });

    it('should throw on invalid format', async () => {
      mockHistoryManager.listHistory.mockResolvedValue([
        {
          timestamp: new Date().toISOString(),
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_test.json'
        }
      ]);

      await expect(
        reviewDataBuilder.buildReviewData({ since: 'invalid-format' })
      ).rejects.toThrow('Invalid since format');
    });
  });

  describe('calculateExecutionOutcomes with mixed statuses', () => {
    it('should count success, partial, and failure correctly', async () => {
      const entries: HistoryEntry[] = [
        { timestamp: '2025-08-16T10:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_1.json' },
        { timestamp: '2025-08-16T11:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_2.json' },
        { timestamp: '2025-08-16T12:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_3.json' },
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);

      // Mock annotation files
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (String(dir) === mockConfig.annotationDir) {
          return [
            'history_1.annotation.json',
            'history_2.annotation.json',
            'history_3.annotation.json',
          ] as any;
        }
        return [] as any;
      });
      vi.mocked(fs.readJson).mockImplementation(async (filepath: any) => {
        const fp = String(filepath);
        if (fp.includes('history_1')) {
          return { historyFile: 'history_1.json', timestamp: '2025-08-16T10:30:00Z', status: 'success', tags: [], notes: '' };
        }
        if (fp.includes('history_2')) {
          return { historyFile: 'history_2.json', timestamp: '2025-08-16T11:30:00Z', status: 'partial', tags: [], notes: '' };
        }
        if (fp.includes('history_3')) {
          return { historyFile: 'history_3.json', timestamp: '2025-08-16T12:30:00Z', status: 'failure', tags: [], notes: '' };
        }
        return {};
      });

      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].execution_outcomes).toEqual({
        success: 1,
        partial: 1,
        failure: 1
      });
    });
  });

  describe('calculateDataCompleteness with empty entries', () => {
    it('should return zeros for empty entries', async () => {
      mockHistoryManager.listHistory.mockResolvedValue([]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.metadata.data_completeness).toEqual({
        with_annotations: 0,
        with_output_capture: 0,
        with_environment_data: 0
      });
    });

    it('should calculate annotation percentage', async () => {
      const entries: HistoryEntry[] = [
        { timestamp: '2025-08-16T10:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_1.json' },
        { timestamp: '2025-08-16T11:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_2.json' },
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);

      // Only one annotation for two entries
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (String(dir) === mockConfig.annotationDir) {
          return ['history_1.annotation.json'] as any;
        }
        return [] as any;
      });
      vi.mocked(fs.readJson).mockImplementation(async (filepath: any) => {
        if (String(filepath).includes('history_1')) {
          return { historyFile: 'history_1.json', timestamp: '2025-08-16T10:30:00Z', status: 'success', tags: [], notes: '' };
        }
        return {};
      });

      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      // 1 annotation for 2 entries = 50%
      expect(result.metadata.data_completeness.with_annotations).toBe(50);
    });
  });

  describe('calculateUsageStatistics with enhanced entries', () => {
    it('should calculate average duration from enhanced entries', async () => {
      const entries: EnhancedHistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_1.json',
          execution: {
            start_time: '2025-08-16T10:00:00Z',
            end_time: '2025-08-16T10:01:00Z',
            duration: '5000ms',
            exit_code: 0,
            command: 'test'
          }
        },
        {
          timestamp: '2025-08-16T11:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2.json',
          execution: {
            start_time: '2025-08-16T11:00:00Z',
            end_time: '2025-08-16T11:01:00Z',
            duration: '3000ms',
            exit_code: 0,
            command: 'test'
          }
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      // (5000 + 3000) / 2 = 4000
      expect(result.prompts[0].usage_statistics.avg_duration).toBe('4000ms');
    });

    it('should calculate average active time', async () => {
      const entries: EnhancedHistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_1.json',
          execution: {
            start_time: '2025-08-16T10:00:00Z',
            end_time: '2025-08-16T10:01:00Z',
            duration: '5000ms',
            exit_code: 0,
            command: 'test',
            active_time: '2000ms'
          }
        },
        {
          timestamp: '2025-08-16T11:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2.json',
          execution: {
            start_time: '2025-08-16T11:00:00Z',
            end_time: '2025-08-16T11:01:00Z',
            duration: '3000ms',
            exit_code: 0,
            command: 'test',
            active_time: '1000ms'
          }
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      // (2000 + 1000) / 2 = 1500
      expect(result.prompts[0].usage_statistics.avg_active_time).toBe('1500ms');
    });

    it('should calculate average user input count', async () => {
      const entries: EnhancedHistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_1.json',
          execution: {
            start_time: '2025-08-16T10:00:00Z',
            end_time: '2025-08-16T10:01:00Z',
            duration: '5000ms',
            exit_code: 0,
            command: 'test',
            user_input_count: 3
          }
        },
        {
          timestamp: '2025-08-16T11:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2.json',
          execution: {
            start_time: '2025-08-16T11:00:00Z',
            end_time: '2025-08-16T11:01:00Z',
            duration: '3000ms',
            exit_code: 0,
            command: 'test',
            user_input_count: 5
          }
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      // (3 + 5) / 2 = 4.0
      expect(result.prompts[0].usage_statistics.avg_user_inputs).toBe('4.0');
    });

    it('should show N/A when no execution data available', async () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_1.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].usage_statistics.avg_duration).toBe('N/A');
      expect(result.prompts[0].usage_statistics.avg_active_time).toBe('N/A');
      expect(result.prompts[0].usage_statistics.avg_user_inputs).toBe('N/A');
    });
  });

  describe('getAnnotations - JSON format', () => {
    it('should read JSON annotation files', async () => {
      const entries: HistoryEntry[] = [
        { timestamp: '2025-08-16T10:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_1.json' }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);

      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (String(dir) === mockConfig.annotationDir) {
          return ['history_1.annotation.json'] as any;
        }
        return [] as any;
      });
      vi.mocked(fs.readJson).mockImplementation(async (filepath: any) => {
        if (String(filepath).includes('history_1.annotation.json')) {
          return {
            historyFile: 'history_1.json',
            timestamp: '2025-08-16T10:30:00Z',
            status: 'success',
            tags: ['test'],
            notes: 'Passed all tests'
          };
        }
        return {};
      });

      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].user_annotations).toHaveLength(1);
      expect(result.prompts[0].user_annotations[0].status).toBe('success');
      expect(result.prompts[0].user_annotations[0].notes).toBe('Passed all tests');
    });
  });

  describe('getAnnotations - legacy markdown format', () => {
    it('should parse markdown annotations with YAML frontmatter', async () => {
      const entries: HistoryEntry[] = [
        { timestamp: '2025-08-16T10:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_1.json' }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);

      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (String(dir) === mockConfig.annotationDir) {
          return ['history_1.annotation.md'] as any;
        }
        return [] as any;
      });
      vi.mocked(fs.readFile).mockImplementation(async (filepath: any) => {
        if (String(filepath).includes('history_1.annotation.md')) {
          return `---
historyFile: history_1.json
timestamp: "2025-08-16T10:30:00Z"
status: failure
tags:
  - bug
---

## Notes

Build failed due to missing dependency`;
        }
        return '';
      });

      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].user_annotations).toHaveLength(1);
      expect(result.prompts[0].user_annotations[0].status).toBe('failure');
      expect(result.prompts[0].user_annotations[0].notes).toBe('Build failed due to missing dependency');
    });
  });

  describe('getAnnotations - no annotationDir', () => {
    it('should return empty when annotationDir is not configured', async () => {
      mockConfig.annotationDir = undefined;
      reviewDataBuilder = new ReviewDataBuilder(mockConfig);

      const entries: HistoryEntry[] = [
        { timestamp: '2025-08-16T10:00:00Z', templatePath: 'prompts/test.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'history_1.json' }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'test.md', path: 'prompts/test.md', relativePath: 'test.md', title: 'Test', tags: [], content: '# Test', frontmatter: {} }
      ]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].user_annotations).toHaveLength(0);
    });
  });

  describe('buildPromptReviewData - prompt not found', () => {
    it('should use templatePath fallback when prompt file deleted', async () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/deleted-prompt.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_deleted.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      // PuptService returns empty (prompt not found)
      mockPuptService.getPromptsAsAdapted.mockReturnValue([]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].name).toBe('deleted-prompt');
      expect(result.prompts[0].path).toBe('prompts/deleted-prompt.md');
      expect(result.prompts[0].content).toBe('');
    });

    it('should use fallback path when PuptService init throws', async () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/error-prompt.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_error.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.init.mockRejectedValue(new Error('Init failed'));

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].path).toBe('prompts/error-prompt.md');
    });
  });

  describe('extractPromptName fallback to filename parsing', () => {
    it('should extract prompt name from filename when templatePath missing', async () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: '',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T10-00-00Z_my-prompt.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].name).toBe('my-prompt');
    });

    it('should return "unknown" when filename does not match pattern', async () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: '',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'some-random-file.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.prompts[0].name).toBe('unknown');
    });
  });

  describe('calculateMetadata', () => {
    it('should include correct analysis period, prompt count, and execution count', async () => {
      const now = new Date();
      const entries: HistoryEntry[] = [
        { timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), templatePath: 'prompts/a.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'h1.json' },
        { timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), templatePath: 'prompts/b.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'h2.json' },
        { timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), templatePath: 'prompts/a.md', templateContent: '', variables: {}, finalPrompt: '', filename: 'h3.json' },
      ];

      mockHistoryManager.listHistory.mockResolvedValue(entries);
      mockPuptService.getPromptsAsAdapted.mockReturnValue([
        { filename: 'a.md', path: 'prompts/a.md', relativePath: 'a.md', title: 'A', tags: [], content: '# A', frontmatter: {} },
        { filename: 'b.md', path: 'prompts/b.md', relativePath: 'b.md', title: 'B', tags: [], content: '# B', frontmatter: {} },
      ]);

      const result = await reviewDataBuilder.buildReviewData({ since: '7d' });
      expect(result.metadata.analysis_period).toBe('7d');
      expect(result.metadata.total_prompts).toBe(2);
      expect(result.metadata.total_executions).toBe(3);
    });

    it('should default analysis period to 30d when not specified', async () => {
      mockHistoryManager.listHistory.mockResolvedValue([]);

      const result = await reviewDataBuilder.buildReviewData({});
      expect(result.metadata.analysis_period).toBe('30d');
    });
  });
});
