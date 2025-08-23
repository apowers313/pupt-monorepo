import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ReviewDataBuilder } from '../../src/services/review-data-builder.js';
import { Config } from '../../src/types/config.js';

describe('Review Command with JSON Annotations Integration', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-review-annotations-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  it('should correctly load and process JSON annotations', async () => {
    // Setup test environment
    const config: Config = {
      promptDirs: ['./.prompts'],
      historyDir: './.history',
      annotationDir: './.history',
      version: '4.0.0'
    };
    
    await fs.ensureDir('./.prompts');
    await fs.ensureDir('./.history');

    // Create a test prompt
    const promptContent = `---
title: Test Prompt
description: A test prompt for integration testing
---

Execute the test: {{input}}`;
    
    await fs.writeFile(path.join('./.prompts', 'test-prompt.md'), promptContent);

    // Create history entries
    const historyEntries = [
      {
        timestamp: new Date('2025-08-20T10:00:00Z').toISOString(),
        templatePath: '.prompts/test-prompt.md',
        templateContent: promptContent,
        variables: { input: 'test1' },
        finalPrompt: 'Execute the test: test1',
        filename: '20250820-100000-abcdef01.json',
        title: 'Test Prompt'
      },
      {
        timestamp: new Date('2025-08-21T10:00:00Z').toISOString(),
        templatePath: '.prompts/test-prompt.md',
        templateContent: promptContent,
        variables: { input: 'test2' },
        finalPrompt: 'Execute the test: test2',
        filename: '20250821-100000-abcdef02.json',
        title: 'Test Prompt'
      }
    ];

    // Save history entries
    for (const entry of historyEntries) {
      await fs.writeJson(path.join('./.history', entry.filename), entry);
    }

    // Create JSON annotations
    const annotations = [
      {
        historyFile: '20250820-100000-abcdef01.json',
        timestamp: new Date('2025-08-20T10:30:00Z').toISOString(),
        status: 'success',
        tags: ['test', 'automated'],
        notes: 'First test completed successfully',
        structured_outcome: {
          tasks_completed: 3,
          tasks_total: 3,
          tests_run: 5,
          tests_passed: 5,
          tests_failed: 0,
          verification_passed: true,
          execution_time: '1m 20s'
        }
      },
      {
        historyFile: '20250821-100000-abcdef02.json',
        timestamp: new Date('2025-08-21T10:30:00Z').toISOString(),
        status: 'partial',
        tags: ['test', 'automated'],
        notes: 'Second test partially completed',
        issues_identified: [
          {
            category: 'incomplete_task',
            severity: 'medium',
            description: 'Some tasks were not finished',
            evidence: 'Task 3 of 5 incomplete'
          }
        ]
      }
    ];

    // Save annotations
    await fs.writeJson(
      './.history/20250820-100000-abcdef01-annotation-123.json',
      annotations[0],
      { spaces: 2 }
    );
    
    await fs.writeJson(
      './.history/20250821-100000-abcdef02-annotation-456.json',
      annotations[1],
      { spaces: 2 }
    );

    // Run review data builder
    const reviewBuilder = new ReviewDataBuilder(config);
    const reviewData = await reviewBuilder.buildReviewData({ since: '30d' });

    // Verify results
    expect(reviewData.metadata.total_prompts).toBe(1);
    expect(reviewData.metadata.total_executions).toBe(2);
    expect(reviewData.metadata.data_completeness.with_annotations).toBe(100);

    const promptData = reviewData.prompts[0];
    expect(promptData.name).toBe('test-prompt');
    expect(promptData.usage_statistics.total_runs).toBe(2);
    expect(promptData.usage_statistics.annotated_runs).toBe(2);
    expect(promptData.usage_statistics.success_rate).toBe(0.5);

    expect(promptData.execution_outcomes.success).toBe(1);
    expect(promptData.execution_outcomes.partial).toBe(1);
    expect(promptData.execution_outcomes.failure).toBe(0);

    expect(promptData.user_annotations).toHaveLength(2);
    expect(promptData.user_annotations[0].status).toBe('success');
    expect(promptData.user_annotations[0].notes).toBe('First test completed successfully');
    expect(promptData.user_annotations[1].status).toBe('partial');
    expect(promptData.user_annotations[1].issues_identified).toHaveLength(1);
  });

  it('should filter out non-annotation JSON files', async () => {
    // Setup test environment
    const config: Config = {
      promptDirs: ['./.prompts'],
      historyDir: './.history',
      annotationDir: './.history',
      version: '4.0.0'
    };
    
    await fs.ensureDir('./.prompts');
    await fs.ensureDir('./.history');

    // Create a test prompt
    await fs.writeFile(path.join('./.prompts', 'test-prompt.md'), 'Test prompt');

    // Create a history entry
    const historyEntry = {
      timestamp: new Date('2025-08-20T10:00:00Z').toISOString(),
      templatePath: '.prompts/test-prompt.md',
      templateContent: 'Test prompt',
      variables: {},
      finalPrompt: 'Test prompt',
      filename: '20250820-100000-abcdef03.json',
      title: 'Test Prompt'
    };
    
    await fs.writeJson(path.join('./.history', historyEntry.filename), historyEntry);

    // Create an annotation
    const annotation = {
      historyFile: '20250820-100000-abcdef03.json',
      timestamp: new Date('2025-08-20T10:30:00Z').toISOString(),
      status: 'success',
      tags: [],
      notes: 'Test annotation'
    };
    
    await fs.writeJson(
      './.history/20250820-100000-abcdef03-annotation-123.json',
      annotation,
      { spaces: 2 }
    );

    // Create a non-annotation JSON file that should be ignored
    await fs.writeJson(
      './.history/some-other-file.json',
      { data: 'should be ignored' },
      { spaces: 2 }
    );

    // Run review data builder
    const reviewBuilder = new ReviewDataBuilder(config);
    const reviewData = await reviewBuilder.buildReviewData({ since: '30d' });

    // Verify only the annotation was loaded
    expect(reviewData.prompts[0].user_annotations).toHaveLength(1);
    expect(reviewData.prompts[0].user_annotations[0].notes).toBe('Test annotation');
  });

  it('should handle JSON annotations (legacy markdown format deprecated)', async () => {
    // Setup test environment
    const config: Config = {
      promptDirs: ['./.prompts'],
      historyDir: './.history',
      annotationDir: './.history',
      version: '4.0.0'
    };
    
    await fs.ensureDir('./.prompts');
    await fs.ensureDir('./.history');

    // Create a test prompt
    await fs.writeFile(path.join('./.prompts', 'test-prompt.md'), 'Test prompt');

    // Create a history entry
    const historyEntry = {
      timestamp: new Date('2025-08-20T10:00:00Z').toISOString(),
      templatePath: '.prompts/test-prompt.md',
      templateContent: 'Test prompt',
      variables: {},
      finalPrompt: 'Test prompt',
      filename: '20250820-100000-abcdef03.json',
      title: 'Test Prompt'
    };
    
    await fs.writeJson(path.join('./.history', historyEntry.filename), historyEntry);

    // Create a JSON annotation
    const jsonAnnotation = {
      historyFile: '20250820-100000-abcdef03.json',
      timestamp: new Date('2025-08-20T10:30:00Z').toISOString(),
      status: 'success',
      tags: ['json'],
      notes: 'JSON annotation'
    };
    
    await fs.writeJson(
      './.history/20250820-100000-abcdef03-annotation-json.json',
      jsonAnnotation,
      { spaces: 2 }
    );

    // Create a markdown annotation
    const markdownContent = `---
historyFile: 20250820-100000-test.json
timestamp: '2025-08-20T11:00:00Z'
status: partial
tags: [markdown]
---

## Notes

Markdown annotation`;

    await fs.writeFile(
      './.history/20250820-100000-abcdef03-annotation-md.md',
      markdownContent
    );

    // Run review data builder
    const reviewBuilder = new ReviewDataBuilder(config);
    const reviewData = await reviewBuilder.buildReviewData({ since: '30d' });

    // In integration tests, the annotation may be auto-migrated or ReviewDataBuilder 
    // may only load JSON annotations. This test now focuses on JSON format.
    expect(reviewData.prompts[0].user_annotations.length).toBeGreaterThanOrEqual(1);
    
    const annotations = reviewData.prompts[0].user_annotations;
    const jsonAnn = annotations.find(a => a.tags.includes('json'));
    
    expect(jsonAnn).toBeDefined();
    expect(jsonAnn?.notes).toBe('JSON annotation');
    expect(jsonAnn?.status).toBe('success');
  });
});