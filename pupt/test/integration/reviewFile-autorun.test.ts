import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCommand } from '../../src/commands/run.js';
import path, { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { confirm, search } from '@inquirer/prompts';
import { editorLauncher } from '../../src/utils/editor.js';

vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  search: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
  editor: vi.fn(),
  password: vi.fn()
}));

vi.mock('../../src/utils/editor.js', () => ({
  editorLauncher: {
    findEditor: vi.fn(),
    openInEditor: vi.fn()
  }
}));

// Mock PuptService
vi.mock('../../src/services/pupt-service.js', () => ({
  PuptService: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    getPromptsAsAdapted: vi.fn().mockReturnValue([]),
    findPrompt: vi.fn().mockReturnValue(undefined),
    getPrompts: vi.fn().mockReturnValue([]),
    getPrompt: vi.fn(),
    getPromptPath: vi.fn(),
  })),
}));

// Mock collectInputs
vi.mock('../../src/services/input-collector.js', () => ({
  collectInputs: vi.fn().mockResolvedValue(new Map()),
}));

describe('ReviewFile AutoRun Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let mockSpawn: any;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'pt-reviewfile-autorun-'));

    // Create prompts directory
    await mkdir(join(testDir, '.prompts'));

    // Mock spawn for echo command
    mockSpawn = vi.mocked(spawn);
    mockSpawn.mockImplementation((cmd: string, args: string[]) => {
      const mockProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn()
        },
        on: vi.fn((event: string, cb: Function) => {
          if (event === 'close') {
            // Simulate successful execution
            setTimeout(() => cb(0), 10);
          }
        })
      };
      return mockProcess;
    });

    // Clear all mocks
    vi.clearAllMocks();

    process.chdir(testDir);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should run autoRun with reviewFile variables', async () => {
    // Create config with autoRun enabled
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./.prompts'],
        defaultCmd: 'echo',
        autoReview: true,
        autoRun: true
      })
    );

    // Create the output file
    await writeFile(join(testDir, 'report.txt'), 'Report content');

    const reportPath = join(testDir, 'report.txt');

    // Set up PuptService mock with _source that has reviewFile in postExecution
    const { PuptService } = await import('../../src/services/pupt-service.js');
    const mockSource = {
      name: 'auto-report',
      description: 'Auto Generate Report',
      tags: [],
      library: '',
      element: {} as any,
      render: vi.fn().mockReturnValue({
        text: `Auto-generated report saved to ${reportPath}`,
        metadata: {},
        postExecution: [{ type: 'reviewFile', path: reportPath, name: 'outputFile' }]
      }),
      getInputIterator: vi.fn().mockReturnValue({
        start: vi.fn(),
        current: vi.fn().mockReturnValue(null),
        submit: vi.fn(),
        advance: vi.fn(),
        isDone: vi.fn().mockReturnValue(true),
        getValues: vi.fn().mockReturnValue(new Map()),
      }),
    };

    vi.mocked(PuptService).mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      getPromptsAsAdapted: vi.fn().mockReturnValue([{
        path: join(testDir, '.prompts', 'auto-report.prompt'),
        relativePath: 'auto-report.prompt',
        filename: 'auto-report.prompt',
        title: 'auto-report',
        tags: [],
        content: 'Auto Generate Report',
        frontmatter: {},
        _source: mockSource,
      }]),
      findPrompt: vi.fn().mockReturnValue(mockSource),
      getPrompts: vi.fn().mockReturnValue([mockSource]),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
    } as any));

    // Run with the processed prompt (simulating autoRun with templateInfo)
    await runCommand([], {
      prompt: `Auto-generated report saved to ${reportPath}`,
      templateInfo: {
        templatePath: join(testDir, '.prompts', 'auto-report.prompt'),
        templateContent: 'Auto Generate Report',
        variables: new Map(),
        finalPrompt: `Auto-generated report saved to ${reportPath}`,
        title: 'auto-report',
        reviewFiles: [{ name: 'outputFile', value: reportPath }],
      },
      isAutoRun: true,
    });

    // Verify the command was executed
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should handle autoRun with multiple reviewFile variables', async () => {
    // Create config with autoRun
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./.prompts'],
        defaultCmd: 'echo',
        autoReview: true,
        autoRun: true
      })
    );

    // Create test files
    await writeFile(join(testDir, 'source.txt'), 'Source content');
    await writeFile(join(testDir, 'dest.txt'), 'Destination content');

    const sourcePath = join(testDir, 'source.txt');
    const destPath = join(testDir, 'dest.txt');

    // Mock editor
    vi.mocked(editorLauncher.findEditor).mockResolvedValue('vim');
    vi.mocked(editorLauncher.openInEditor).mockResolvedValue();

    // Run with the processed prompt (simulating autoRun)
    await runCommand([], {
      prompt: `Process ${sourcePath} to ${destPath}`,
      templateInfo: {
        templatePath: join(testDir, '.prompts', 'auto-process.prompt'),
        templateContent: 'Auto Process Multiple Files',
        variables: new Map(),
        finalPrompt: `Process ${sourcePath} to ${destPath}`,
        title: 'auto-process',
        reviewFiles: [
          { name: 'sourceFile', value: sourcePath },
          { name: 'destFile', value: destPath },
        ],
      },
      isAutoRun: true,
    });

    // Verify the command ran successfully
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should run autoRun when autoReview is disabled', async () => {
    // Create config with autoRun but autoReview disabled
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./.prompts'],
        defaultCmd: 'echo',
        autoReview: false,
        autoRun: true
      })
    );

    await writeFile(join(testDir, 'output.txt'), 'Content');
    const outputPath = join(testDir, 'output.txt');

    vi.mocked(confirm).mockResolvedValue(true);

    // Run with the processed prompt (simulating autoRun)
    await runCommand([], {
      prompt: 'Report without review',
      templateInfo: {
        templatePath: join(testDir, '.prompts', 'no-review.prompt'),
        templateContent: 'No Review Report',
        variables: new Map(),
        finalPrompt: 'Report without review',
        title: 'no-review',
        reviewFiles: [{ name: 'outputFile', value: outputPath }],
      },
      isAutoRun: true,
    });

    // Verify no editor was opened (autoReview is false)
    expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
  });

  it('should handle command failure gracefully in autoRun', async () => {
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./.prompts'],
        defaultCmd: 'false', // Command that always fails
        autoReview: true,
        autoRun: true
      })
    );

    await writeFile(join(testDir, 'output.txt'), 'Content');
    const outputPath = join(testDir, 'output.txt');

    // Mock command to return failure
    mockSpawn.mockImplementation((cmd: string) => {
      const mockProcess = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn()
        },
        on: vi.fn((event: string, cb: Function) => {
          if (event === 'close') {
            // Simulate failed execution
            setTimeout(() => cb(1), 10);
          }
        })
      };
      return mockProcess;
    });

    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
    vi.mocked(editorLauncher.openInEditor).mockResolvedValue();

    // Mock process.exit to prevent test from exiting
    const originalExit = process.exit;
    process.exit = vi.fn() as any;

    // Run with the processed prompt - should handle the error
    await runCommand([], {
      prompt: 'This command will fail',
      templateInfo: {
        templatePath: join(testDir, '.prompts', 'fail.prompt'),
        templateContent: 'Failing Command',
        variables: new Map(),
        finalPrompt: 'This command will fail',
        title: 'fail',
        reviewFiles: [{ name: 'outputFile', value: outputPath }],
      },
      isAutoRun: true,
    });

    // Restore process.exit
    process.exit = originalExit;

    // Verify the command was executed
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should handle non-existent files in autoRun', async () => {
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./.prompts'],
        defaultCmd: 'echo',
        autoReview: true,
        autoRun: true
      })
    );

    const nonExistentPath = join(testDir, 'does-not-exist.txt');

    // Run with the processed prompt (simulating autoRun)
    await runCommand([], {
      prompt: `Create new file at ${nonExistentPath}`,
      templateInfo: {
        templatePath: join(testDir, '.prompts', 'new-file.prompt'),
        templateContent: 'New File Creation',
        variables: new Map(),
        finalPrompt: `Create new file at ${nonExistentPath}`,
        title: 'new-file',
        reviewFiles: [{ name: 'newFile', value: nonExistentPath }],
      },
      isAutoRun: true,
    });

    // Verify no editor was opened because file doesn't exist
    expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
  });
});
