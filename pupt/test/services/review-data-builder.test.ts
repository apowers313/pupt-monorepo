import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewDataBuilder } from '../../src/services/review-data-builder.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { PuptService } from '../../src/services/pupt-service.js';
import type { Config } from '../../src/types/config.js';
import type { HistoryEntry } from '../../src/types/history.js';
import type { ParsedAnnotation } from '../../src/types/annotations.js';
import path from 'path';
import fs from 'fs-extra';

vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/services/pupt-service.js');
vi.mock('fs-extra');

describe('ReviewDataBuilder', () => {
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
      annotationDir: './history',
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
      listHistory: vi.fn(),
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

    reviewDataBuilder = new ReviewDataBuilder(mockConfig);
  });

  describe('buildReviewData', () => {
    it('should build comprehensive review data structure', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test-prompt.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T10-00-00Z_test-prompt.json'
        },
        {
          timestamp: '2025-08-16T11:00:00Z',
          templatePath: 'prompts/test-prompt.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T11-00-00Z_test-prompt.json'
        }
      ];

      const mockAnnotations: ParsedAnnotation[] = [
        {
          historyFile: 'history_2025-08-16T10:00:00Z_test-prompt.json',
          annotationPath: path.join(mockConfig.historyDir, 'history_2025-08-16T10:00:00Z_test-prompt.annotation.json'),
          timestamp: '2025-08-16T10:30:00Z',
          status: 'success',
          notes: 'Task completed successfully'
        },
        {
          historyFile: 'history_2025-08-16T11:00:00Z_test-prompt.json',
          annotationPath: path.join(mockConfig.historyDir, 'history_2025-08-16T11:00:00Z_test-prompt.annotation.json'),
          timestamp: '2025-08-16T11:30:00Z',
          status: 'failure',
          notes: 'Tests still failing after implementation'
        }
      ];

      const mockPromptContent = `---
title: Test Prompt
description: A test prompt for review
---

This is a test prompt.`;

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: { test: 'value' }
      }));
      // Mock fs-extra for annotations
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve(['history_2025-08-16T10-00-00Z_test-prompt.annotation.json', 'history_2025-08-16T11-00-00Z_test-prompt.annotation.json'] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readJson).mockImplementation((filepath: any) => {
        if (filepath.includes('.annotation.json')) {
          if (filepath.includes('10-00-00Z')) {
            return Promise.resolve({
              historyFile: 'history_2025-08-16T10-00-00Z_test-prompt.json',
              timestamp: '2025-08-16T10:30:00Z',
              status: 'success',
              tags: [],
              notes: 'Task completed successfully'
            });
          } else {
            return Promise.resolve({
              historyFile: 'history_2025-08-16T11-00-00Z_test-prompt.json',
              timestamp: '2025-08-16T11:30:00Z',
              status: 'failure',
              tags: [],
              notes: 'Tests still failing after implementation'
            });
          }
        }
        return Promise.resolve({});
      });
      mockPuptService.getPromptsAsAdapted.mockReturnValue([{
        filename: 'test-prompt.md',
        path: 'prompts/test-prompt.md',
        relativePath: 'test-prompt.md',
        title: 'Test Prompt',
        tags: [],
        content: mockPromptContent,
        frontmatter: {
          title: 'Test Prompt',
          description: 'A test prompt for review'
        }
      }]);

      const result = await reviewDataBuilder.buildReviewData({});

      expect(result).toMatchObject({
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
        prompts: [
          {
            name: 'test-prompt',
            path: 'prompts/test-prompt.md',
            content: mockPromptContent,
            last_modified: expect.any(String),
            usage_statistics: {
              total_runs: 2,
              annotated_runs: 2,
              success_rate: 0.5,
              avg_duration: 'N/A',
              last_used: '2025-08-16T11:00:00Z'
            },
            execution_outcomes: {
              success: 1,
              partial: 0,
              failure: 1
            },
            environment_correlations: {},
            captured_outputs: [],
            user_annotations: expect.arrayContaining([
              expect.objectContaining({
                historyFile: 'history_2025-08-16T10-00-00Z_test-prompt.json',
                status: 'success',
                notes: 'Task completed successfully'
              }),
              expect.objectContaining({
                historyFile: 'history_2025-08-16T11-00-00Z_test-prompt.json',
                status: 'failure',
                notes: 'Tests still failing after implementation'
              })
            ]),
            detected_patterns: []
          }
        ],
        cross_prompt_patterns: []
      });
    });

    it('should calculate usage statistics correctly', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test-prompt.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T10-00-00Z_test-prompt.json'
        }
      ];

      const mockAnnotations: ParsedAnnotation[] = [
        {
          historyFile: 'history_2025-08-16T10:00:00Z_test-prompt.json',
          annotationPath: path.join(mockConfig.historyDir, 'history_2025-08-16T10:00:00Z_test-prompt.annotation.json'),
          timestamp: '2025-08-16T10:30:00Z',
          status: 'success',
          notes: 'All good'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: {}
      }));
      // Mock fs-extra for annotations
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve(['history_2025-08-16T10-00-00Z_test-prompt.annotation.json'] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readJson).mockImplementation((filepath: any) => {
        if (filepath.includes('.annotation.json')) {
          return Promise.resolve({
            historyFile: 'history_2025-08-16T10-00-00Z_test-prompt.json',
            timestamp: '2025-08-16T10:30:00Z',
            status: 'success',
            tags: [],
            notes: 'All good'
          });
        }
        return Promise.resolve({});
      });
      mockPuptService.getPromptsAsAdapted.mockReturnValue([{
        filename: 'test-prompt.md',
        path: 'prompts/test-prompt.md',
        relativePath: 'test-prompt.md',
        title: 'Test Prompt',
        tags: [],
        content: '# Test',
        frontmatter: {}
      }]);

      const result = await reviewDataBuilder.buildReviewData({});

      expect(result.prompts[0].usage_statistics).toEqual({
        total_runs: 1,
        annotated_runs: 1,
        success_rate: 1.0,
        avg_duration: 'N/A',
        last_used: '2025-08-16T10:00:00Z',
        avg_active_time: 'N/A',
        avg_user_inputs: 'N/A'
      });
    });

    it('should identify patterns across prompts', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/prompt1.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T10:00:00Z_prompt1.json'
        },
        {
          timestamp: '2025-08-16T11:00:00Z',
          templatePath: 'prompts/prompt2.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T11:00:00Z_prompt2.json'
        }
      ];

      const mockAnnotations: ParsedAnnotation[] = [
        {
          historyFile: 'history_2025-08-16T10:00:00Z_prompt1.json',
          annotationPath: path.join(mockConfig.historyDir, 'history_2025-08-16T10:00:00Z_prompt1.annotation.json'),
          timestamp: '2025-08-16T10:30:00Z',
          status: 'partial',
          notes: 'Tests still failing after AI claimed success'
        },
        {
          historyFile: 'history_2025-08-16T11:00:00Z_prompt2.json',
          annotationPath: path.join(mockConfig.historyDir, 'history_2025-08-16T11:00:00Z_prompt2.annotation.json'),
          timestamp: '2025-08-16T11:30:00Z',
          status: 'partial',
          notes: 'Verification showed tests still failing'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: {}
      }));
      // Mock fs-extra for annotations  
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve(['history_2025-08-16T10-00-00Z_prompt1.annotation.json', 'history_2025-08-16T11-00-00Z_prompt2.annotation.json'] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readJson).mockImplementation((filepath: any) => {
        if (filepath.includes('.annotation.json')) {
          if (filepath.includes('prompt1')) {
            return Promise.resolve({
              historyFile: 'history_2025-08-16T10:00:00Z_prompt1.json',
              timestamp: '2025-08-16T10:30:00Z',
              status: 'partial',
              tags: [],
              notes: 'Tests still failing after AI claimed success'
            });
          } else {
            return Promise.resolve({
              historyFile: 'history_2025-08-16T11:00:00Z_prompt2.json',
              timestamp: '2025-08-16T11:30:00Z',
              status: 'partial',
              tags: [],
              notes: 'Verification showed tests still failing'
            });
          }
        }
        return Promise.resolve({});
      });
      mockPuptService.getPromptsAsAdapted.mockReturnValue(
        ['prompt1', 'prompt2', 'old', 'recent', 'test', 'deleted'].map(name => ({
          filename: `${name}.md`,
          path: `prompts/${name}.md`,
          relativePath: `${name}.md`,
          title: name,
          tags: [],
          content: `# ${name}`,
          frontmatter: {}
        }))
      );

      const result = await reviewDataBuilder.buildReviewData({});

      // Should identify verification gap pattern across prompts
      expect(result.cross_prompt_patterns).toHaveLength(0); // Will be implemented in Phase 5
    });
  });

  describe('time filtering', () => {
    it('should support time filtering with --since option', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-10T10:00:00Z', // 6 days ago
          templatePath: 'prompts/old.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-10T10:00:00Z_old.json'
        },
        {
          timestamp: new Date().toISOString(), // today
          templatePath: 'prompts/recent.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_' + new Date().toISOString().replace(/:/g, '-') + '_recent.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: {}
      }));
      // Mock fs-extra for no annotations
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve([] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readFile).mockResolvedValue('');
      mockPuptService.getPromptsAsAdapted.mockReturnValue(
        ['prompt1', 'prompt2', 'old', 'recent', 'test', 'deleted'].map(name => ({
          filename: `${name}.md`,
          path: `prompts/${name}.md`,
          relativePath: `${name}.md`,
          title: name,
          tags: [],
          content: `# ${name}`,
          frontmatter: {}
        }))
      );

      const result = await reviewDataBuilder.buildReviewData({ since: '3d' });

      // Should only include recent entry
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('recent');
    });
  });

  describe('error handling', () => {
    it('should handle missing annotations gracefully', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/test.md',
          promptFile: 'test',
          exitCode: 0,
          outputSize: 1024
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: {}
      }));
      // Mock fs-extra for no annotations
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve([] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readFile).mockResolvedValue(''); // No annotations
      mockPuptService.getPromptsAsAdapted.mockReturnValue([{
        filename: 'test.md',
        path: 'prompts/test.md',
        relativePath: 'test.md',
        title: 'Test',
        tags: [],
        content: '# Test',
        frontmatter: {}
      }]);

      const result = await reviewDataBuilder.buildReviewData({});

      expect(result.prompts[0].user_annotations).toEqual([]);
      expect(result.prompts[0].usage_statistics.annotated_runs).toBe(0);
    });

    it('should handle missing prompt files gracefully', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/deleted.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T10:00:00Z_deleted.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: {}
      }));
      // Mock fs-extra for no annotations
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve([] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readFile).mockResolvedValue('');
      mockPuptService.getPromptsAsAdapted.mockReturnValue([]);

      const result = await reviewDataBuilder.buildReviewData({});

      expect(result.prompts[0]).toMatchObject({
        name: 'deleted',
        path: 'prompts/deleted.md',
        content: ''
      });
    });
  });

  describe('specific prompt filtering', () => {
    it('should filter by specific prompt name when provided', async () => {
      const mockHistoryEntries: HistoryEntry[] = [
        {
          timestamp: '2025-08-16T10:00:00Z',
          templatePath: 'prompts/prompt1.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T10:00:00Z_prompt1.json'
        },
        {
          timestamp: '2025-08-16T11:00:00Z',
          templatePath: 'prompts/prompt2.md',
          templateContent: '',
          variables: {},
          finalPrompt: '',
          filename: 'history_2025-08-16T11:00:00Z_prompt2.json'
        }
      ];

      mockHistoryManager.listHistory.mockResolvedValue(mockHistoryEntries);
      mockHistoryManager.loadHistory.mockImplementation((entry: HistoryEntry) => Promise.resolve({
        ...entry,
        variables: {}
      }));
      // Mock fs-extra for no annotations
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === mockConfig.annotationDir || dir.includes('annotations')) {
          return Promise.resolve([] as any);
        }
        return Promise.resolve([] as any);
      });
      vi.mocked(fs.readFile).mockResolvedValue('');
      mockPuptService.getPromptsAsAdapted.mockReturnValue(
        ['prompt1', 'prompt2', 'old', 'recent', 'test', 'deleted'].map(name => ({
          filename: `${name}.md`,
          path: `prompts/${name}.md`,
          relativePath: `${name}.md`,
          title: name,
          tags: [],
          content: `# ${name}`,
          frontmatter: {}
        }))
      );

      const result = await reviewDataBuilder.buildReviewData({ promptName: 'prompt1' });

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('prompt1');
    });
  });
});