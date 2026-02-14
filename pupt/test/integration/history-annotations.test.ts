import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { HistoryManager } from '../../src/history/history-manager.js';
import { Config } from '../../src/types/config.js';
import { vi } from 'vitest';
import * as logger from '../../src/utils/logger.js';

let testDir: string;

vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Mock the logger to capture output
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mock setup
const { historyCommand } = await import('../../src/commands/history.js');

describe('History Command with Annotations Integration', () => {
  let originalCwd: string;
  let logSpy: any;

  beforeEach(async () => {
    // Create temporary test directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-history-annotations-test-'));
    testDir = fs.realpathSync(tempDir);
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Reset logger mock
    logSpy = vi.mocked(logger.logger.log);
    logSpy.mockClear();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  it('should display JSON annotations in formatted style', async () => {
    // Setup test environment
    const config: Config = {
      promptDirs: ['./.prompts'],
      historyDir: './.history',
      annotationDir: './.history',
      version: '8.0.0',
      outputCapture: {
        enabled: true
      },
      libraries: [],
    };

    await fs.ensureDir('./.prompts');
    await fs.ensureDir('./.history');
    await fs.writeJson(path.join(testDir, 'config.json'), config);

    // Create a history entry
    const historyManager = new HistoryManager('./.history', './.history');
    const historyFilename = await historyManager.savePrompt({
      templatePath: 'test-prompt.md',
      templateContent: 'Test prompt',
      variables: new Map([['input', 'test value']]),
      finalPrompt: 'Execute test: test value',
      title: 'Test Prompt',
      timestamp: new Date('2025-08-22T10:00:00Z')
    });

    // Create a JSON annotation
    const annotationData = {
      historyFile: historyFilename,
      timestamp: new Date('2025-08-22T10:30:00Z').toISOString(),
      status: 'success',
      tags: ['test', 'integration'],
      notes: 'Test completed successfully with all assertions passing.',
      structured_outcome: {
        tasks_completed: 5,
        tasks_total: 5,
        tests_run: 10,
        tests_passed: 10,
        tests_failed: 0,
        verification_passed: true,
        execution_time: '2m 30s'
      },
      issues_identified: []
    };

    const annotationFile = historyFilename.replace('.json', '-annotation-test.json');
    await fs.writeJson(path.join('./.history', annotationFile), annotationData, { spaces: 2 });

    // Run history command with annotations
    await historyCommand({ entry: 1, annotations: true });

    // Verify the output
    const output = logSpy.mock.calls.map((call: any[]) => call[0]).join('\n');

    // Check for formatted annotation display
    expect(output).toContain('Annotations:');
    expect(output).toContain('Status: success');
    // Check timestamp is formatted (exact time depends on timezone)
    expect(output).toMatch(/Timestamp: 2025-08-22 \d{2}:\d{2}/);
    expect(output).toContain('Tags: test, integration');
    expect(output).toContain('Notes:');
    expect(output).toContain('Test completed successfully with all assertions passing.');
    expect(output).toContain('Structured Outcome:');
    expect(output).toContain('Tasks: 5/5');
    expect(output).toContain('Tests: 10/10 passed');
    expect(output).toContain('Execution time: 2m 30s');
  });

  it('should display multiple annotations for a single history entry', async () => {
    // Setup test environment
    const config: Config = {
      promptDirs: ['./.prompts'],
      historyDir: './.history',
      annotationDir: './.history',
      version: '8.0.0',
      outputCapture: {
        enabled: true
      },
      libraries: [],
    };

    await fs.ensureDir('./.prompts');
    await fs.ensureDir('./.history');
    await fs.writeJson(path.join(testDir, 'config.json'), config);

    // Create a history entry
    const historyManager = new HistoryManager('./.history', './.history');
    const historyFilename = await historyManager.savePrompt({
      templatePath: 'test-prompt.md',
      templateContent: 'Test prompt',
      variables: new Map(),
      finalPrompt: 'Execute test',
      title: 'Test Prompt'
    });

    // Create first annotation
    const annotation1 = {
      historyFile: historyFilename,
      timestamp: new Date('2025-08-22T10:30:00Z').toISOString(),
      status: 'partial',
      tags: ['attempt-1'],
      notes: 'First attempt - partial success',
      issues_identified: [{
        category: 'verification_gap',
        severity: 'high',
        description: 'Tests were not run',
        evidence: 'No test output found'
      }]
    };

    // Create second annotation
    const annotation2 = {
      historyFile: historyFilename,
      timestamp: new Date('2025-08-22T11:00:00Z').toISOString(),
      status: 'failure',
      tags: ['attempt-2', 'final'],
      notes: 'Second attempt - complete failure'
    };

    await fs.writeJson(
      path.join('./.history', historyFilename.replace('.json', '-annotation-1.json')),
      annotation1,
      { spaces: 2 }
    );

    await fs.writeJson(
      path.join('./.history', historyFilename.replace('.json', '-annotation-2.json')),
      annotation2,
      { spaces: 2 }
    );

    // Run history command with annotations
    await historyCommand({ entry: 1, annotations: true });

    // Verify the output
    const output = logSpy.mock.calls.map((call: any[]) => call[0]).join('\n');

    // Check for both annotations
    expect(output).toContain('Status: partial');
    expect(output).toContain('First attempt - partial success');
    expect(output).toContain('Issues Identified:');
    expect(output).toContain('[high] verification_gap: Tests were not run');

    // Check separator between annotations
    expect(output).toMatch(/---+.*---+/s);

    // Check second annotation
    expect(output).toContain('Status: failure');
    expect(output).toContain('Second attempt - complete failure');
  });

  it('should handle legacy markdown annotations gracefully', async () => {
    // Setup test environment
    const config: Config = {
      promptDirs: ['./.prompts'],
      historyDir: './.history',
      annotationDir: './.history',
      version: '8.0.0',
      outputCapture: {
        enabled: true
      },
      libraries: [],
    };

    await fs.ensureDir('./.prompts');
    await fs.ensureDir('./.history');

    // Create a history entry
    const historyManager = new HistoryManager('./.history', './.history');
    const historyFilename = await historyManager.savePrompt({
      templatePath: 'test-prompt.md',
      templateContent: 'Test prompt',
      variables: new Map(),
      finalPrompt: 'Execute test',
      title: 'Test Prompt'
    });

    // Create a legacy markdown annotation
    const markdownContent = `---
historyFile: ${historyFilename}
timestamp: '2025-08-22T10:30:00Z'
status: success
tags: [legacy, markdown]
---

## Notes

This is a legacy markdown annotation that should still be displayed.`;

    await fs.writeFile(
      path.join('./.history', historyFilename.replace('.json', '-annotation-legacy.md')),
      markdownContent
    );

    // Now write config to trigger migration
    await fs.writeJson(path.join(testDir, 'config.json'), config);

    // Run history command with annotations
    await historyCommand({ entry: 1, annotations: true });

    // Verify the output
    const output = logSpy.mock.calls.map((call: any[]) => call[0]).join('\n');

    // The markdown file will be migrated to JSON, so check for JSON formatted output
    expect(output).toContain('Annotations:');
    expect(output).toContain('Status: success');
    expect(output).toContain('Tags: legacy, markdown');
    expect(output).toContain('This is a legacy markdown annotation that should still be displayed.');
  });
});
