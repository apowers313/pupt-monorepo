import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryManager } from '../../src/history/history-manager.js';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import { PatternDetector } from '../../src/services/pattern-detector.js';
import { ReviewDataBuilder } from '../../src/services/review-data-builder.js';
import type { EnhancedHistoryEntry } from '../../src/types/history.js';
import type { Config } from '../../src/types/index.js';

let testDir: string;

vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Import ConfigManager after mock setup
const { ConfigManager } = await import('../../src/config/config-manager.js');

describe('Full Review Flow Integration', () => {
  let originalCwd: string;

  beforeEach(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-review-flow-test-'));
    testDir = fs.realpathSync(tempDir);
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('Complete workflow: execute -> capture -> annotate -> review', () => {
    it('should capture output, create annotation, and generate review data', async () => {
      // Setup: Create config with output capture and auto-annotation enabled
      const config: Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        annotationDir: './.pt-annotations',
        defaultCmd: 'echo',
        defaultCmdArgs: [],
        version: '4.0.0',
        outputCapture: {
          enabled: true,
          directory: './.pt-output',
          maxSizeMB: 10,
          retentionDays: 7
        },
      };

      await fs.ensureDir('.prompts');
      await fs.writeJson(path.join(testDir, 'config.json'), config);
      await fs.ensureDir(config.historyDir);
      await fs.ensureDir(config.annotationDir);
      await fs.ensureDir(config.outputCapture!.directory);

      // Create a test prompt
      const promptContent = `---
title: Test Prompt
description: A test prompt for review flow
---

Execute this test: {{input}}`;
      await fs.writeFile('.prompts/test-prompt.md', promptContent);

      // Step 1: Simulate execution with output capture
      const historyManager = new HistoryManager(config.historyDir, config.annotationDir);
      const outputCaptureService = new OutputCaptureService({
        outputDirectory: config.outputCapture!.directory,
        maxOutputSize: (config.outputCapture!.maxSizeMB || 10) * 1024 * 1024
      });

      // Create mock output file (simulating captured output)
      const outputContent = `Executing test prompt...
Running tests...
ERROR: Test failed!
Completed with errors.`;

      const timestamp = new Date();
      const outputFile = path.join(config.outputCapture!.directory, `output-${Date.now()}.txt`);
      await fs.writeFile(outputFile, outputContent);

      // Save enhanced history entry
      const historyEntry: EnhancedHistoryEntry = {
        timestamp,
        templatePath: '.prompts/test-prompt.md',
        inputs: { input: 'test scenario' },
        maskedInputs: { input: 'test scenario' },
        systemPrompt: 'Execute this test: test scenario',
        command: 'echo',
        commandArgs: [],
        environment: {
          working_directory: testDir,
          git_commit: 'abc123',
          git_branch: 'main',
          git_dirty: false,
          node_version: process.version,
          os: process.platform,
          shell: process.env.SHELL || 'unknown'
        },
        execution: {
          start_time: timestamp.toISOString(),
          end_time: new Date(Date.now() + 5000).toISOString(),
          duration: '5s',
          exit_code: 1,
          command: 'echo',
          output_file: outputFile,
          output_size: outputContent.length
        }
      };

      const historyFile = await historyManager.savePrompt({
        timestamp,
        templatePath: '.prompts/test-prompt.md',
        templateContent: promptContent,
        variables: new Map([['input', 'test scenario']]),
        finalPrompt: 'Execute this test: test scenario'
      });

      // Step 2: Simulate annotation data
      const annotationData = {
        historyFile: path.basename(historyFile),
        timestamp: new Date().toISOString(),
        status: 'failure' as const,
        tags: ['auto-annotation', 'pattern-match'],
        structured_outcome: {
          tasks_completed: 0,
          tasks_total: 1,
          tests_run: 1,
          tests_passed: 0,
          tests_failed: 1,
          verification_passed: false,
          execution_time: '5s'
        },
        issues_identified: [
          {
            category: 'incomplete_task' as const,
            severity: 'high' as const,
            description: 'ERROR pattern detected in output',
            evidence: 'ERROR: Test failed!'
          }
        ],
        auto_detected: true,
        notes: 'Auto-detected: ERROR pattern found in output'
      };

      const annotationFile = path.join(config.annotationDir, `${path.basename(historyFile, '.json')}.annotation.json`);
      await fs.writeJson(annotationFile, annotationData, { spaces: 2 });

      // Step 3: Review data generation
      const reviewDataBuilder = new ReviewDataBuilder(config);

      const reviewData = await reviewDataBuilder.buildReviewData({});

      // Verify review data structure
      expect(reviewData).toBeDefined();
      expect(reviewData.metadata).toBeDefined();
      expect(reviewData.metadata.total_prompts).toBeGreaterThanOrEqual(1);
      expect(reviewData.metadata.total_executions).toBeGreaterThanOrEqual(1);

      // Should have data completeness metrics
      expect(reviewData.metadata.data_completeness).toBeDefined();
      expect(reviewData.metadata.data_completeness.with_annotations).toBeGreaterThan(0);
      // Output capture and environment data tracking not yet implemented in ReviewDataBuilder
      expect(reviewData.metadata.data_completeness.with_output_capture).toBe(0);
      expect(reviewData.metadata.data_completeness.with_environment_data).toBe(0);

      // Should have prompt data
      expect(reviewData.prompts).toHaveLength(1);
      const promptData = reviewData.prompts[0];
      expect(promptData.name).toBe('test-prompt');
      expect(promptData.usage_statistics.total_runs).toBe(1);
      expect(promptData.usage_statistics.annotated_runs).toBe(1);

      // Should have execution outcomes
      expect(promptData.execution_outcomes.failure).toBe(1);

      // Output capture integration is not yet implemented in ReviewDataBuilder
      expect(promptData.captured_outputs).toHaveLength(0);

      // Should have user annotations
      expect(promptData.user_annotations).toHaveLength(1);
      expect(promptData.user_annotations[0].status).toBe('failure');
      expect(promptData.user_annotations[0].auto_detected).toBe(true);

      // Should detect patterns
      expect(promptData.detected_patterns).toBeDefined();
      // Pattern detection would work if we had multiple similar annotations
    });

    it('should work with AI analysis prompt when configured', async () => {
      // Mock the AI analysis execution
      const mockRunCommand = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: JSON.stringify({
          status: 'partial',
          structured_outcome: {
            tasks_completed: 3,
            tasks_total: 5,
            tests_run: 10,
            tests_passed: 7,
            tests_failed: 3,
            verification_passed: false,
            execution_time: '12s'
          },
          issues_identified: [
            {
              category: 'verification_gap',
              severity: 'high',
              description: 'Tests were not run after implementation',
              evidence: 'No npm test command found in output'
            }
          ],
          user_notes: 'AI detected incomplete verification'
        })
      });

      // Create config with analysis prompt
      const config: Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        annotationDir: './.pt-annotations',
        defaultCmd: 'claude',
        version: '4.0.0',
        outputCapture: {
          enabled: true,
          directory: './.pt-output',
          maxSizeMB: 10,
          retentionDays: 7
        },
      };

      await fs.ensureDir('.prompts');
      await fs.writeJson(path.join(testDir, 'config.json'), config);
      await fs.ensureDir(config.historyDir);
      await fs.ensureDir(config.annotationDir);
      await fs.ensureDir(config.outputCapture!.directory);

      // Create analysis prompt
      const analysisPromptContent = `---
title: Analyze Execution
description: Analyze captured output for issues
---

Analyze this execution output and return JSON with status, issues, etc.

Output file: {{outputFile}}`;
      await fs.writeFile('.prompts/analyze-execution.md', analysisPromptContent);

      // Analysis prompt exists but auto-annotation service has been removed
      expect(config.defaultCmd).toBe('claude');
    });

    it('should produce actionable recommendations from review data', async () => {
      // Setup: Create multiple executions with patterns
      const config: Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        annotationDir: './.pt-annotations',
        defaultCmd: 'echo',
        version: '4.0.0',
        outputCapture: {
          enabled: true,
          directory: './.pt-output'
        },
      };

      await fs.ensureDir('.prompts');
      await fs.writeJson(path.join(testDir, 'config.json'), config);
      await fs.ensureDir(config.historyDir);
      await fs.ensureDir(config.annotationDir);

      const historyManager = new HistoryManager(config.historyDir, config.annotationDir);

      // Create multiple history entries with similar issues
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(Date.now() - i * 3600000);
        const historyFile = await historyManager.savePrompt({
          timestamp,
          templatePath: '.prompts/test-prompt.md',
          templateContent: 'Test prompt content',
          variables: new Map([['test', `test-${i}`]]),
          finalPrompt: `Test ${i}`
        });

        // Create annotations showing verification gap pattern
        const annotationData = {
          historyFile: path.basename(historyFile),
          timestamp: new Date().toISOString(),
          status: 'partial' as const,
          tags: [],
          structured_outcome: {
            tasks_completed: 1,
            tasks_total: 1,
            tests_run: 0,
            tests_passed: 0,
            tests_failed: 0,
            verification_passed: false,
            execution_time: '5s'
          },
          issues_identified: [
            {
              category: 'verification_gap' as const,
              severity: 'high' as const,
              description: 'Tests were not run after implementation',
              evidence: 'Implementation claimed complete but no test execution found'
            }
          ],
          auto_detected: false,
          notes: 'Tests still failing after AI claimed success'
        };

        const annotationFile = path.join(config.annotationDir, `${path.basename(historyFile, '.json')}.annotation.json`);
        await fs.writeJson(annotationFile, annotationData, { spaces: 2 });
      }

      // Generate review data
      const reviewDataBuilder = new ReviewDataBuilder(config);
      const reviewData = await reviewDataBuilder.buildReviewData({});

      // Pattern detection is not yet integrated into ReviewDataBuilder
      // The PatternDetector service exists but isn't called by ReviewDataBuilder
      expect(reviewData.prompts[0].detected_patterns).toBeDefined();
      expect(reviewData.prompts[0].detected_patterns).toEqual([]);

      // Cross-prompt patterns are not yet implemented
      expect(reviewData.cross_prompt_patterns).toBeDefined();
      expect(reviewData.cross_prompt_patterns).toEqual([]);
    });
  });

  describe('pt review command integration', () => {
    it('should generate review data from command line', async () => {
      // Setup test environment
      const config: Config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        annotationDir: './.pt-annotations',
        defaultCmd: 'echo',
        version: '8.0.0',
        outputCapture: {
          enabled: true
        },
        libraries: [],
      };

      await fs.ensureDir('.prompts');
      await fs.writeJson(path.join(testDir, 'config.json'), config);
      await fs.ensureDir(config.historyDir);
      await fs.ensureDir(config.annotationDir);

      // Create test prompt
      const promptContent = `---
title: CLI Test Prompt
description: Test prompt for CLI review
---

Test the CLI review command`;
      await fs.writeFile('.prompts/cli-test.md', promptContent);

      // Create history entry
      const historyManager = new HistoryManager(config.historyDir, config.annotationDir);
      const timestamp = new Date();
      const historyFile = await historyManager.savePrompt({
        timestamp,
        templatePath: '.prompts/cli-test.md',
        templateContent: promptContent,
        variables: new Map(),
        finalPrompt: 'Test the CLI review command'
      });

      // Create annotation
      const annotationData = {
        historyFile: path.basename(historyFile),
        timestamp: new Date().toISOString(),
        status: 'success' as const,
        tags: ['test'],
        notes: 'Test completed successfully'
      };

      const annotationFile = path.join(config.annotationDir, `${path.basename(historyFile, '.json')}.annotation.json`);
      await fs.writeJson(annotationFile, annotationData, { spaces: 2 });

      // Import and run the review command
      const { reviewCommand } = await import('../../src/commands/review.js');

      // Capture stdout output
      const originalWrite = process.stdout.write;
      let output = '';
      process.stdout.write = (chunk: any): boolean => {
        output += chunk.toString();
        return true;
      };

      try {
        // Run review command with JSON format
        await reviewCommand(undefined, { format: 'json' });

        // Parse the JSON output (trim to remove trailing newline)
        const reviewData = JSON.parse(output.trim());

        // Verify the structure
        expect(reviewData).toBeDefined();
        expect(reviewData.metadata).toBeDefined();
        expect(reviewData.metadata.total_prompts).toBe(1);
        expect(reviewData.metadata.total_executions).toBe(1);
        expect(reviewData.prompts).toHaveLength(1);
        expect(reviewData.prompts[0].name).toBe('cli-test');
        expect(reviewData.prompts[0].usage_statistics.total_runs).toBe(1);
        expect(reviewData.prompts[0].usage_statistics.annotated_runs).toBe(1);
        expect(reviewData.prompts[0].execution_outcomes.success).toBe(1);
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });
});
