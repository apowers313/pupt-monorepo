import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';
import { reviewFilePrompt } from '../../src/prompts/input-types/review-file-prompt.js';

vi.mock('../../src/prompts/input-types/file-search-prompt.js');

describe('ReviewFile Input Type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('inheritance from file input', () => {
    it('should extend file prompt functionality', async () => {
      // Mock filePrompt to return a selected file
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/selected/file.txt');

      const result = await reviewFilePrompt({
        message: 'Select a file to review:'
      });

      expect(mockFilePrompt).toHaveBeenCalledWith({
        message: 'Select a file to review:'
      });
      expect(result).toBe('/path/to/selected/file.txt');
    });

    it('should pass through all file prompt config options', async () => {
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/selected/file.txt');

      await reviewFilePrompt({
        message: 'Select file:',
        basePath: './src',
        filter: '*.ts',
        default: 'index.ts'
      });

      expect(mockFilePrompt).toHaveBeenCalledWith({
        message: 'Select file:',
        basePath: './src',
        filter: '*.ts',
        default: 'index.ts'
      });
    });
  });

  describe('current behavior', () => {
    it('should behave exactly like file input (no editor launch)', async () => {
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/file.txt');

      const result = await reviewFilePrompt({
        message: 'Select file:'
      });

      expect(result).toBe('/path/to/file.txt');
      // Currently, reviewFile does not launch an editor
      // The review happens after the run command completes
    });

    it('should return the selected file path for post-run review', async () => {
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockResolvedValue('/path/to/output.txt');

      const result = await reviewFilePrompt({
        message: 'Select output file:'
      });

      expect(result).toBe('/path/to/output.txt');
      // The actual review (editor launch) happens in the run command
      // after the command execution completes
    });
  });

  describe('error handling', () => {
    it('should propagate errors from file prompt', async () => {
      const mockFilePrompt = vi.mocked(fileSearchPrompt);
      mockFilePrompt.mockRejectedValue(new Error('File selection cancelled'));

      await expect(reviewFilePrompt({
        message: 'Select file:'
      })).rejects.toThrow('File selection cancelled');
    });
  });
});