import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCommand } from '../../src/commands/run.js';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
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

describe('ReviewFile Post-Run Integration Tests', () => {
  let testDir: string;
  let mockSpawn: any;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'pt-reviewfile-postrun-'));
    
    // Create config file
    await writeFile(
      join(testDir, '.pt-config.json'),
      JSON.stringify({
        promptDirs: ['./prompts'],
        defaultCmd: 'echo',
        autoReview: true
      })
    );
    
    // Create prompts directory
    await mkdir(join(testDir, 'prompts'));
    
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
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true });
    }
  });

  describe('pt run command', () => {
    it('should prompt to review files after successful command execution', async () => {
      // Create a prompt that uses reviewFile
      const promptContent = `---
title: Generate Report
variables:
  - name: outputFile
    type: reviewFile
    message: Select output file for the report
---
Generate a report and save to {{outputFile}}`;
      
      await writeFile(join(testDir, 'prompts', 'generate-report.md'), promptContent);
      
      // Create the output file that will be selected
      await writeFile(join(testDir, 'report.txt'), 'Report content');
      
      // Mock search to return report.txt during file selection
      vi.mocked(search).mockResolvedValueOnce(join(testDir, 'report.txt'));
      
      // Mock search to select our prompt
      vi.mocked(search).mockResolvedValueOnce({
        title: 'Generate Report',
        path: join(testDir, 'prompts', 'generate-report.md'),
        content: promptContent
      });
      
      // Mock user confirming they want to review
      vi.mocked(confirm).mockResolvedValue(true);
      
      // Mock editor detection and launch
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue();
      
      // Run the command
      await runCommand([], {});
      
      // Verify the command was executed
      expect(mockSpawn).toHaveBeenCalledWith('echo', [], expect.any(Object));
      
      // Verify the review prompt was shown
      expect(confirm).toHaveBeenCalledWith({
        message: expect.stringContaining('Would you like to review the file'),
        default: true
      });
      
      // Verify editor was opened with the correct file
      expect(editorLauncher.openInEditor).toHaveBeenCalledWith('code', join(testDir, 'report.txt'));
    });

    it('should handle multiple reviewFile inputs', async () => {
      // Create a prompt with multiple reviewFile inputs
      const promptContent = `---
title: Process Files
variables:
  - name: inputFile
    type: reviewFile
    message: Select input file
  - name: outputFile
    type: reviewFile
    message: Select output file
---
Process {{inputFile}} and save to {{outputFile}}`;
      
      await writeFile(join(testDir, 'prompts', 'process-files.md'), promptContent);
      
      // Create test files
      await writeFile(join(testDir, 'input.txt'), 'Input content');
      await writeFile(join(testDir, 'output.txt'), 'Output content');
      
      // Mock file selections
      vi.mocked(search)
        .mockResolvedValueOnce(join(testDir, 'input.txt'))  // First reviewFile
        .mockResolvedValueOnce(join(testDir, 'output.txt')) // Second reviewFile
        .mockResolvedValueOnce({  // Prompt selection
          title: 'Process Files',
          path: join(testDir, 'prompts', 'process-files.md'),
          content: promptContent
        });
      
      // Mock user confirming review for both files
      vi.mocked(confirm)
        .mockResolvedValueOnce(true)  // Review input file
        .mockResolvedValueOnce(true); // Review output file
      
      // Mock editor
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('vim');
      vi.mocked(editorLauncher.openInEditor).mockResolvedValue();
      
      // Run the command
      await runCommand([], {});
      
      // Verify both review prompts were shown
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(confirm).toHaveBeenNthCalledWith(1, {
        message: expect.stringContaining('inputFile'),
        default: true
      });
      expect(confirm).toHaveBeenNthCalledWith(2, {
        message: expect.stringContaining('outputFile'),
        default: true
      });
      
      // Verify editor was opened for both files
      expect(editorLauncher.openInEditor).toHaveBeenCalledTimes(2);
      expect(editorLauncher.openInEditor).toHaveBeenNthCalledWith(1, 'vim', join(testDir, 'input.txt'));
      expect(editorLauncher.openInEditor).toHaveBeenNthCalledWith(2, 'vim', join(testDir, 'output.txt'));
    });

    it('should skip review if user declines', async () => {
      const promptContent = `---
title: Generate Report
variables:
  - name: outputFile
    type: reviewFile
    message: Select output file
---
Generate report to {{outputFile}}`;
      
      await writeFile(join(testDir, 'prompts', 'report.md'), promptContent);
      await writeFile(join(testDir, 'report.txt'), 'Content');
      
      // Mock selections
      vi.mocked(search)
        .mockResolvedValueOnce(join(testDir, 'report.txt'))
        .mockResolvedValueOnce({
          title: 'Generate Report',
          path: join(testDir, 'prompts', 'report.md'),
          content: promptContent
        });
      
      // Mock user declining review
      vi.mocked(confirm).mockResolvedValue(false);
      
      // Run the command
      await runCommand([], {});
      
      // Verify editor was NOT opened
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should handle non-existent files gracefully', async () => {
      const promptContent = `---
title: Create New File
variables:
  - name: newFile
    type: reviewFile
    message: Select new file location
---
Create new file at {{newFile}}`;
      
      await writeFile(join(testDir, 'prompts', 'create.md'), promptContent);
      
      // Mock file selection to return non-existent file
      vi.mocked(search)
        .mockResolvedValueOnce(join(testDir, 'non-existent.txt'))
        .mockResolvedValueOnce({
          title: 'Create New File',
          path: join(testDir, 'prompts', 'create.md'),
          content: promptContent
        });
      
      // Run the command
      await runCommand([], {});
      
      // Should not prompt for review since file doesn't exist
      expect(confirm).not.toHaveBeenCalled();
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should respect autoReview=false setting', async () => {
      // Update config with autoReview disabled
      await writeFile(
        join(testDir, '.pt-config.json'),
        JSON.stringify({
          promptDirs: ['./prompts'],
          defaultCmd: 'echo',
          autoReview: false
        })
      );
      
      const promptContent = `---
title: Generate Report
variables:
  - name: outputFile
    type: reviewFile
    message: Select output file
---
Generate report`;
      
      await writeFile(join(testDir, 'prompts', 'report.md'), promptContent);
      await writeFile(join(testDir, 'report.txt'), 'Content');
      
      vi.mocked(search)
        .mockResolvedValueOnce(join(testDir, 'report.txt'))
        .mockResolvedValueOnce({
          title: 'Generate Report',
          path: join(testDir, 'prompts', 'report.md'),
          content: promptContent
        });
      
      // User wants to review
      vi.mocked(confirm).mockResolvedValue(true);
      
      // Run the command
      await runCommand([], {});
      
      // Should prompt for review
      expect(confirm).toHaveBeenCalled();
      
      // But should NOT open editor when autoReview is false
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should handle editor not found gracefully', async () => {
      const promptContent = `---
title: Generate Report
variables:
  - name: outputFile
    type: reviewFile
    message: Select output file
---
Generate report`;
      
      await writeFile(join(testDir, 'prompts', 'report.md'), promptContent);
      await writeFile(join(testDir, 'report.txt'), 'Content');
      
      vi.mocked(search)
        .mockResolvedValueOnce(join(testDir, 'report.txt'))
        .mockResolvedValueOnce({
          title: 'Generate Report',
          path: join(testDir, 'prompts', 'report.md'),
          content: promptContent
        });
      
      vi.mocked(confirm).mockResolvedValue(true);
      
      // Mock no editor found
      vi.mocked(editorLauncher.findEditor).mockResolvedValue(null);
      
      // Run the command - should not throw
      await runCommand([], {});
      
      // Should have prompted for review
      expect(confirm).toHaveBeenCalled();
      
      // But should not try to open editor
      expect(editorLauncher.openInEditor).not.toHaveBeenCalled();
    });

    it('should continue after editor launch error', async () => {
      const promptContent = `---
title: Process Files
variables:
  - name: file1
    type: reviewFile
    message: Select first file
  - name: file2
    type: reviewFile
    message: Select second file
---
Process files`;
      
      await writeFile(join(testDir, 'prompts', 'process.md'), promptContent);
      await writeFile(join(testDir, 'file1.txt'), 'Content 1');
      await writeFile(join(testDir, 'file2.txt'), 'Content 2');
      
      vi.mocked(search)
        .mockResolvedValueOnce(join(testDir, 'file1.txt'))
        .mockResolvedValueOnce(join(testDir, 'file2.txt'))
        .mockResolvedValueOnce({
          title: 'Process Files',
          path: join(testDir, 'prompts', 'process.md'),
          content: promptContent
        });
      
      // Confirm review for both
      vi.mocked(confirm).mockResolvedValue(true);
      
      vi.mocked(editorLauncher.findEditor).mockResolvedValue('code');
      
      // First editor launch fails, second succeeds
      vi.mocked(editorLauncher.openInEditor)
        .mockRejectedValueOnce(new Error('Editor failed'))
        .mockResolvedValueOnce();
      
      // Run command - should not throw
      await runCommand([], {});
      
      // Should have tried to open both files
      expect(editorLauncher.openInEditor).toHaveBeenCalledTimes(2);
    });
  });
});