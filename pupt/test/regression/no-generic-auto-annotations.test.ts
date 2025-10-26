import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestEnvironment } from '../utils/test-environment.js';
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
      onData: vi.fn((callback) => {
        // Simulate command output
        setTimeout(() => {
          callback('Command executed successfully\r\n');
        }, 50);
      }),
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

// Mock child process spawn to prevent actual Claude execution
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn().mockImplementation((cmd, args, options) => {
      // Track spawn calls for assertions
      spawnCalls.push({ cmd, args, options });

      const mockProcess = {
        pid: Math.floor(Math.random() * 100000),
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn()
        },
        stdout: {
          on: vi.fn()
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate Claude failure
            setTimeout(() => callback(1), 100);
          }
        }),
        unref: vi.fn()
      };
      return mockProcess;
    }),
    execFile: actual.execFile
  };
});

// Track spawn calls
let spawnCalls: Array<{ cmd: string; args?: string[]; options?: any }> = [];

describe('Regression: No Generic Auto-Annotations', () => {
  let testEnv: TestEnvironment;
  let promptsDir: string;
  let historyDir: string;
  let annotationDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    spawnCalls = [];
    originalCwd = process.cwd();
    testEnv = new TestEnvironment();
    await testEnv.setup();
    promptsDir = testEnv.getPath('prompts');
    historyDir = testEnv.getPath('.pt-history');
    annotationDir = testEnv.getPath('.pt-annotations');
    await fs.ensureDir(promptsDir);
    await fs.ensureDir(historyDir);
    await fs.ensureDir(annotationDir);
    // Change to test directory so config is loaded from there
    process.chdir(testEnv.getPath('.'));
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await testEnv.cleanup();
  });

  it('should NOT create any annotation when auto-annotation fails', async () => {
    // Create config with auto-annotation enabled
    const config = {
      version: '4.0.0',
      promptDirs: [promptsDir],
      historyDir: historyDir,
      annotationDir: annotationDir,
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
description: A simple test that should trigger auto-annotation
---
This is a test prompt that should execute successfully`;
    await fs.writeFile(path.join(promptsDir, 'test-prompt.md'), testPrompt);

    // Create analysis prompt
    const analysisPrompt = `---
title: Analyze Execution
description: Analysis prompt for auto-annotation
---
Analyze this execution`;
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

    // Wait for any async operations (longer on Windows for file locks to release)
    const waitTime = process.platform === 'win32' ? 500 : 300;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Check that NO annotation files were created
    const annotationFiles = await fs.readdir(annotationDir);
    const jsonAnnotations = annotationFiles.filter(f => f.endsWith('.json'));
    
    expect(jsonAnnotations.length).toBe(0);
    expect(jsonAnnotations).toEqual([]);
  });

  it('should NOT create generic success annotations', async () => {
    // Create config with auto-annotation enabled
    const config = {
      version: '4.0.0',
      promptDirs: [promptsDir],
      historyDir: historyDir,
      annotationDir: annotationDir,
      defaultCmd: 'claude',
      outputCapture: {
        enabled: true,
        directory: historyDir
      },
      autoAnnotate: {
        enabled: true,
        triggers: [], // Empty triggers = run for all prompts
        analysisPrompt: 'analyze-execution'
      }
    };
    await testEnv.writeConfig(config);

    // Create test prompt
    const testPrompt = `---
title: Development Task
description: Fix TypeScript errors
---
Fix the TypeScript errors in the codebase`;
    await fs.writeFile(path.join(promptsDir, 'dev-task.md'), testPrompt);

    // Create analysis prompt
    const analysisPrompt = `---
title: Analyze Execution
---
Analyze the execution and return JSON`;
    await fs.writeFile(path.join(promptsDir, 'analyze-execution.md'), analysisPrompt);

    // Mock prompt selection
    const { InteractiveSearch } = await import('../../src/ui/interactive-search.js');
    const mockSelectPrompt = vi.fn().mockResolvedValue({
      name: 'dev-task',
      title: 'Development Task',
      path: path.join(promptsDir, 'dev-task.md'),
      content: testPrompt
    });
    vi.mocked(InteractiveSearch).mockImplementation(() => ({
      selectPrompt: mockSelectPrompt
    } as any));

    // Mock confirmation dialog
    vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);

    // Run the command
    await runCommand([], {});

    // Wait for async operations (longer on Windows for file locks to release)
    const waitTime = process.platform === 'win32' ? 500 : 300;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Verify that NO annotations were created (since our implementation now throws)
    const annotationFiles = await fs.readdir(annotationDir);
    const jsonAnnotations = annotationFiles.filter(f => f.endsWith('.json'));
    
    // There should be NO annotation files at all
    expect(jsonAnnotations.length).toBe(0);
    
    // If any were created, check they don't contain generic success
    for (const file of jsonAnnotations) {
      const content = await fs.readJson(path.join(annotationDir, file));
      expect(content.notes).not.toBe('Auto-annotation launched in background');
      expect(content.auto_detected).not.toBe(true);
    }
  });

  it('should launch auto-annotation in background without creating immediate annotation', async () => {
    // Spy on logger
    const { logger } = await import('../../src/utils/logger.js');
    const logSpy = vi.spyOn(logger, 'log');

    // Create config with auto-annotation enabled
    const config = {
      version: '4.0.0',
      promptDirs: [promptsDir],
      historyDir: historyDir,
      annotationDir: annotationDir,
      defaultCmd: 'claude',
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

    // Create prompts
    const testPrompt = `---
title: Test Prompt
---
Test content`;
    await fs.writeFile(path.join(promptsDir, 'test-prompt.md'), testPrompt);
    
    const analysisPrompt = `---
title: Analyze
---
Analyze`;
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

    // Mock confirmation
    vi.mocked(inquirerPrompts.confirm).mockResolvedValue(false);

    // Run command
    await runCommand([], {});

    // Wait for async operations with retry logic for CI environments
    // The auto-annotation service spawns processes asynchronously, so we need to wait
    // for the log messages and spawn calls to be captured by our spies
    const maxWaitTime = 5000; // 5 seconds max
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();

    let hasLaunchingMessage = false;
    let hasLaunchedMessage = false;
    let claudeCall: { cmd: string; args?: string[]; options?: any } | undefined;

    // Poll until we get the expected results or timeout
    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      // Check log messages
      const logCalls = logSpy.mock.calls.map(call => call[0]);
      hasLaunchingMessage = logCalls.some(msg =>
        typeof msg === 'string' && msg.includes('Launching auto-annotation analysis with')
      );
      hasLaunchedMessage = logCalls.some(msg =>
        typeof msg === 'string' && msg.includes('Auto-annotation analysis launched in background')
      );

      // Check spawn calls
      claudeCall = spawnCalls.find(call => call.cmd === 'claude');

      // If we have everything, break early
      if (hasLaunchingMessage && hasLaunchedMessage && claudeCall) {
        break;
      }
    }

    expect(hasLaunchingMessage).toBe(true);
    expect(hasLaunchedMessage).toBe(true);

    // Verify spawn was called with claude
    expect(spawnCalls.length).toBeGreaterThan(0);
    expect(claudeCall).toBeDefined();
    expect(claudeCall?.args).toContain('-p');
    expect(claudeCall?.args).toContain('--permission-mode');
    expect(claudeCall?.args).toContain('acceptEdits');
  });
});