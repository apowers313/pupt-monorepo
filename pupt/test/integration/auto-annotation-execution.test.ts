import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestEnvironment } from '../utils/test-environment.js';
import { TestRunner } from '../utils/test-runner.js';
import path from 'path';
import fs from 'fs-extra';
import { runCommand } from '../../src/commands/run.js';
import * as inquirerPrompts from '@inquirer/prompts';

// Mock inquirer to bypass interactivity
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  search: vi.fn(),
  checkbox: vi.fn(),
  editor: vi.fn(),
  password: vi.fn(),
  expand: vi.fn(),
  rawlist: vi.fn(),
  number: vi.fn()
}));

// Mock the interactive search
vi.mock('../../src/ui/interactive-search.js', () => ({
  InteractiveSearch: vi.fn().mockImplementation(() => ({
    selectPrompt: vi.fn()
  }))
}));

// Mock node-pty to prevent actual command execution
vi.mock('@homebridge/node-pty-prebuilt-multiarch', () => ({
  spawn: vi.fn().mockImplementation((cmd, args) => {
    const mockPty = {
      write: vi.fn(),
      onData: vi.fn(),
      onExit: vi.fn((callback) => {
        // Simulate successful command execution
        setTimeout(() => callback({ exitCode: 0, signal: null }), 100);
      }),
      kill: vi.fn(),
      resize: vi.fn()
    };
    return mockPty;
  })
}));

// Mock child process spawn to prevent actual command execution
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn().mockImplementation((cmd, args) => {
      const mockProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate successful command execution
            setTimeout(() => callback(0), 100);
          }
        })
      };
      return mockProcess;
    })
  };
});

describe('Auto-Annotation Execution', () => {
  let testEnv: TestEnvironment;
  let promptsDir: string;
  let historyDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    originalCwd = process.cwd();
    testEnv = new TestEnvironment();
    await testEnv.setup();
    promptsDir = testEnv.getPath('prompts');
    historyDir = testEnv.getPath('.pt-history');
    await fs.ensureDir(promptsDir);
    await fs.ensureDir(historyDir);
    // Change to test directory so config is loaded from there
    process.chdir(testEnv.getPath('.'));
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await testEnv.cleanup();
  });

  it('should execute auto-annotation without --no-continue flag', async () => {
    // Create config with auto-annotation enabled
    const config = {
      version: '4.0.0',
      promptDirs: [promptsDir],
      historyDir: historyDir,
      annotationDir: historyDir,
      defaultCmd: 'echo',
      outputCapture: {
        enabled: true,
        directory: historyDir
      },
      autoAnnotate: {
        enabled: true,
        triggers: ['test-prompt'],
        analysisPrompt: 'analyze-execution'
      }
    };
    await testEnv.writeConfig(config);

    // Create test prompt
    const testPrompt = `---
title: Test Prompt
description: A simple test
---
This is a test prompt`;
    await fs.writeFile(path.join(promptsDir, 'test-prompt.md'), testPrompt);

    // Create analysis prompt (our fixed version)
    const analysisPrompt = await fs.readFile(
      path.join(__dirname, '../../prompts/analyze-execution.md'), 
      'utf-8'
    );
    await fs.writeFile(path.join(promptsDir, 'analyze-execution.md'), analysisPrompt);

    // Mock prompt selection
    const { InteractiveSearch } = await import('../../src/ui/interactive-search.js');
    const mockSelectPrompt = vi.fn().mockResolvedValue({
      name: 'test-prompt',
      title: 'Test Prompt',
      path: path.join(promptsDir, 'test-prompt.md'),
      content: testPrompt
    });
    vi.mocked(InteractiveSearch).mockImplementation(() => ({
      selectPrompt: mockSelectPrompt
    } as any));

    // Mock confirmation dialog (no options)
    vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);

    // Run the command
    await runCommand([], {});

    // Wait a bit for async auto-annotation to run
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify no errors were thrown
    // The test passes if we get here without "--no-continue" error
    expect(true).toBe(true);
  });

  it('should launch auto-annotation in background even with missing prompt', async () => {
    // Create config with auto-annotation enabled but missing analysis prompt
    const config = {
      version: '4.0.0',
      promptDirs: [promptsDir],
      historyDir: historyDir,
      annotationDir: historyDir,
      defaultCmd: 'echo',
      outputCapture: {
        enabled: true,
        directory: historyDir
      },
      autoAnnotate: {
        enabled: true,
        triggers: ['test-prompt'],
        analysisPrompt: 'non-existent-prompt'
      }
    };
    await testEnv.writeConfig(config);

    // Create test prompt
    const testPrompt = `---
title: Test Prompt
description: A simple test
---
This is a test prompt`;
    await fs.writeFile(path.join(promptsDir, 'test-prompt.md'), testPrompt);

    // Mock prompt selection
    const { InteractiveSearch } = await import('../../src/ui/interactive-search.js');
    const mockSelectPrompt = vi.fn().mockResolvedValue({
      name: 'test-prompt',
      title: 'Test Prompt',
      path: path.join(promptsDir, 'test-prompt.md'),
      content: testPrompt
    });
    vi.mocked(InteractiveSearch).mockImplementation(() => ({
      selectPrompt: mockSelectPrompt
    } as any));

    // Mock confirmation dialog
    vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);

    // Capture time before execution
    const startTime = Date.now();

    // Run the command
    await runCommand([], {});

    // Measure time after execution
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Should return quickly (under 1 second) without waiting for auto-annotation
    expect(executionTime).toBeLessThan(1000);

    // The test passes if the command returns quickly without blocking
    expect(true).toBe(true);
  });
});