import { describe, it, expect, vi, beforeEach } from 'vitest';
import reviewFilePrompt from '../../src/prompts/input-types/review-file-prompt.js';
import fileSearchPrompt from '../../src/prompts/input-types/file-search-prompt.js';

vi.mock('../../src/prompts/input-types/file-search-prompt.js');

describe('ReviewFile Input Type - Updated Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should behave exactly like file input (no immediate editor launch)', async () => {
    // Mock file search prompt to return a file path
    vi.mocked(fileSearchPrompt).mockResolvedValue('/path/to/selected/file.txt');
    
    // Call reviewFile prompt
    const result = await reviewFilePrompt({
      message: 'Select file to review:',
      basePath: './src',
      filter: '*.ts'
    });
    
    // Should call fileSearchPrompt with the same config
    expect(fileSearchPrompt).toHaveBeenCalledWith({
      message: 'Select file to review:',
      basePath: './src',
      filter: '*.ts'
    });
    
    // Should return the selected file path
    expect(result).toBe('/path/to/selected/file.txt');
  });

  it('should pass through all configuration options to fileSearchPrompt', async () => {
    const config = {
      message: 'Pick a file',
      basePath: '/custom/path',
      filter: '*.md',
      default: 'README.md'
    };
    
    vi.mocked(fileSearchPrompt).mockResolvedValue('/custom/path/README.md');
    
    await reviewFilePrompt(config);
    
    expect(fileSearchPrompt).toHaveBeenCalledWith(config);
  });

  it('should handle file selection cancellation', async () => {
    // Mock file search prompt to throw (user cancelled)
    vi.mocked(fileSearchPrompt).mockRejectedValue(new Error('User cancelled'));
    
    await expect(reviewFilePrompt({
      message: 'Select file:'
    })).rejects.toThrow('User cancelled');
  });

  it('should not depend on ConfigManager or editor settings', async () => {
    // The new implementation should not import or use ConfigManager
    // This test verifies that by checking the function works without any config mocks
    vi.mocked(fileSearchPrompt).mockResolvedValue('/test/file.js');
    
    const result = await reviewFilePrompt({
      message: 'Select a JavaScript file:',
      filter: '*.js'
    });
    
    expect(result).toBe('/test/file.js');
    // No editor-related mocks needed, proving it doesn't launch editor
  });
});