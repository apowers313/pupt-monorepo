import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCommand } from '../../src/commands/run.js';
import { join } from 'path';
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

// Mock interactive search
vi.mock('../../src/ui/interactive-search.js', () => ({
  InteractiveSearch: vi.fn().mockImplementation(() => ({
    selectPrompt: vi.fn()
  }))
}));

describe('ReviewFile Post-Run Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let mockSpawn: any;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'pt-reviewfile-postrun-'));

    // Create config
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./.prompts'],
        defaultCmd: 'echo',
        defaultCmdOptions: {},
        autoReview: true
      })
    );

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

  async function setupPuptServiceMock(
    promptName: string,
    renderedText: string,
    reviewFiles: Array<{ type: string; path: string; name?: string }> = []
  ) {
    const { PuptService } = await import('../../src/services/pupt-service.js');
    const mockSource = {
      name: promptName,
      description: promptName,
      tags: [],
      library: '',
      element: {} as any,
      render: vi.fn().mockReturnValue({
        text: renderedText,
        metadata: {},
        postExecution: reviewFiles,
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
        path: join(testDir, '.prompts', `${promptName}.prompt`),
        relativePath: `${promptName}.prompt`,
        filename: `${promptName}.prompt`,
        title: promptName,
        tags: [],
        content: promptName,
        frontmatter: {},
        _source: mockSource,
      }]),
      findPrompt: vi.fn().mockReturnValue(mockSource),
      getPrompts: vi.fn().mockReturnValue([mockSource]),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
    } as any));

    // Mock InteractiveSearch to select the prompt
    const { InteractiveSearch } = await import('../../src/ui/interactive-search.js');
    vi.mocked(InteractiveSearch).mockImplementation(() => ({
      selectPrompt: vi.fn().mockResolvedValue({
        path: join(testDir, '.prompts', `${promptName}.prompt`),
        relativePath: `${promptName}.prompt`,
        filename: `${promptName}.prompt`,
        title: promptName,
        tags: [],
        content: promptName,
        frontmatter: {},
        _source: mockSource,
      })
    } as any));

    return { mockSource };
  }

  describe('pt run command', () => {
    it('should prompt to review files after successful command execution', async () => {
      // Create the output file that will be reviewed
      await writeFile(join(testDir, 'report.txt'), 'Report content');
      const reportPath = join(testDir, 'report.txt');

      setupPuptServiceMock(
        'generate-report',
        `Generate a report and save to ${reportPath}`,
        [{ type: 'reviewFile', path: reportPath, name: 'outputFile' }]
      );

      // Mock user declining the defaultCmdOptions and confirming review
      vi.mocked(confirm)
        .mockResolvedValueOnce(true);  // Review file? Yes

      // Mock editor detection and launch
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue();

      // Run the command
      await runCommand([], {});

      // Verify the command was executed
      expect(mockSpawn).toHaveBeenCalledWith('echo', [], expect.any(Object));

      // Verify review was offered (confirm called for review)
      expect(confirm).toHaveBeenCalled();
    });

    it('should handle multiple reviewFile inputs', async () => {
      // Create test files
      await writeFile(join(testDir, 'input.txt'), 'Input content');
      await writeFile(join(testDir, 'output.txt'), 'Output content');
      const inputPath = join(testDir, 'input.txt');
      const outputPath = join(testDir, 'output.txt');

      setupPuptServiceMock(
        'process-files',
        `Process ${inputPath} and save to ${outputPath}`,
        [
          { type: 'reviewFile', path: inputPath, name: 'inputFile' },
          { type: 'reviewFile', path: outputPath, name: 'outputFile' },
        ]
      );

      // Mock user confirming review for first, declining second
      vi.mocked(confirm)
        .mockResolvedValueOnce(true)  // Review input file
        .mockResolvedValueOnce(false); // Skip output file

      // Mock editor
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue();

      // Run the command
      await runCommand([], {});

      // Verify the command ran successfully
      expect(mockSpawn).toHaveBeenCalled();
      // Verify confirm was called for both files
      expect(confirm).toHaveBeenCalledTimes(2);
    });

    it('should skip review if user declines', async () => {
      await writeFile(join(testDir, 'report.txt'), 'Content');
      const reportPath = join(testDir, 'report.txt');

      setupPuptServiceMock(
        'report',
        `Generate report to ${reportPath}`,
        [{ type: 'reviewFile', path: reportPath, name: 'outputFile' }]
      );

      // Mock user declining review
      vi.mocked(confirm)
        .mockResolvedValueOnce(false); // Review file? No

      // Run the command
      await runCommand([], {});

      // Verify review prompt was shown
      expect(confirm).toHaveBeenCalled();

      // Verify editor was NOT opened
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should handle non-existent files gracefully', async () => {
      const nonExistentPath = join(testDir, 'non-existent.txt');

      setupPuptServiceMock(
        'create',
        `Create new file at ${nonExistentPath}`,
        [{ type: 'reviewFile', path: nonExistentPath, name: 'newFile' }]
      );

      // Run the command
      await runCommand([], {});

      // Should not have offered review since file doesn't exist
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should respect autoReview=false setting', async () => {
      // Update config to disable autoReview
      await writeFile(
        join(testDir, '.pt-config.json'),
        JSON.stringify({
          promptDirs: ['./.prompts'],
          defaultCmd: 'echo',
          defaultCmdOptions: {},
          autoReview: false
        })
      );

      await writeFile(join(testDir, 'report.txt'), 'Content');
      const reportPath = join(testDir, 'report.txt');

      setupPuptServiceMock(
        'report',
        'Generate report',
        [{ type: 'reviewFile', path: reportPath, name: 'outputFile' }]
      );

      // Mock user confirming review
      vi.mocked(confirm).mockResolvedValueOnce(true);

      // Run the command
      await runCommand([], {});

      // autoReview=false means user can confirm review but editor shows path only
      // Verify no editor was opened
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should handle editor not found gracefully', async () => {
      await writeFile(join(testDir, 'report.txt'), 'Content');
      const reportPath = join(testDir, 'report.txt');

      setupPuptServiceMock(
        'report',
        'Generate report',
        [{ type: 'reviewFile', path: reportPath, name: 'outputFile' }]
      );

      // Mock user confirming review
      vi.mocked(confirm).mockResolvedValueOnce(true);

      // Mock no editor found
      vi.mocked(editorLauncher.findEditor).mockResolvedValue(null);

      // Run the command
      await runCommand([], {});

      // Verify the command ran successfully
      expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('should continue after editor launch error', async () => {
      await writeFile(join(testDir, 'file1.txt'), 'Content 1');
      await writeFile(join(testDir, 'file2.txt'), 'Content 2');
      const file1Path = join(testDir, 'file1.txt');
      const file2Path = join(testDir, 'file2.txt');

      setupPuptServiceMock(
        'process',
        'Process files',
        [
          { type: 'reviewFile', path: file1Path, name: 'file1' },
          { type: 'reviewFile', path: file2Path, name: 'file2' },
        ]
      );

      // Mock user confirming review for both
      vi.mocked(confirm)
        .mockResolvedValueOnce(true)  // Review file 1? Yes
        .mockResolvedValueOnce(true); // Review file 2? Yes

      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      // First editor launch throws error, second succeeds
      vi.mocked(editorLauncher.openInEditor)
        .mockRejectedValueOnce(new Error('Editor failed'))
        .mockResolvedValueOnce();

      // Run the command - should not throw
      await runCommand([], {});

      // Verify the command ran successfully
      expect(confirm).toHaveBeenCalledTimes(2);
    });
  });
});
