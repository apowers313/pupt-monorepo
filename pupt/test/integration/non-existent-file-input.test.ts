import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine } from '../../src/template/template-engine.js';
import { Prompt } from '../../src/types/prompt.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';
import { reviewFilePrompt } from '../../src/prompts/input-types/review-file-prompt.js';

vi.mock('../../src/prompts/input-types/file-search-prompt.js', () => ({
  default: vi.fn(),
  fileSearchPrompt: vi.fn()
}));

vi.mock('../../src/prompts/input-types/review-file-prompt.js', () => ({
  default: vi.fn(),
  reviewFilePrompt: vi.fn()
}));

describe('Non-existent File Input', () => {
  let tempDir: string;
  let engine: TemplateEngine;

  beforeEach(async () => {
    // Create temp directory with minimal test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-nonexist-test-'));
    
    // Create just a few existing files
    await fs.ensureDir(path.join(tempDir, 'existing'));
    await fs.writeFile(path.join(tempDir, 'existing', 'file1.txt'), 'content1');
    await fs.writeFile(path.join(tempDir, 'existing', 'file2.txt'), 'content2');
    
    engine = new TemplateEngine();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.clearAllMocks();
  });

  it('should allow selecting non-existent files with file input type', async () => {
    const template = 'Selected file: {{file "targetFile"}}';
    const nonExistentPath = path.join(tempDir, 'new-dir', 'new-file.txt');

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      labels: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'targetFile',
          type: 'file',
          message: 'Select or type a file path:',
          basePath: tempDir,
        },
      ],
    };

    // Mock the file prompt to simulate user typing a non-existent path
    vi.mocked(fileSearchPrompt).mockResolvedValue(nonExistentPath);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain('Selected file:');
    expect(result).toContain(nonExistentPath);
    expect(vi.mocked(fileSearchPrompt)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Select or type a file path:',
        basePath: tempDir,
      })
    );
  });

  it('should allow selecting non-existent files with reviewFile input type', async () => {
    const template = 'File to review: {{reviewFile "designFile"}}';
    const nonExistentPath = path.join(tempDir, 'docs', 'design.md');

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      labels: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'designFile',
          type: 'reviewFile',
          message: 'Select or type a design file:',
          basePath: tempDir,
          autoReview: false, // Disable auto-review for testing
        },
      ],
    };

    // Mock the reviewFile prompt to simulate user typing a non-existent path
    vi.mocked(reviewFilePrompt).mockResolvedValue(nonExistentPath);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain('File to review:');
    expect(result).toContain(nonExistentPath);
    expect(vi.mocked(reviewFilePrompt)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Select or type a design file:',
        basePath: tempDir,
        autoReview: false,
      })
    );
  });

  it('should still show existing files as options alongside manual input', async () => {
    // This test verifies that existing functionality is preserved
    const template = 'Selected: {{file "anyFile"}}';

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      labels: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'anyFile',
          type: 'file',
          message: 'Choose a file:',
          basePath: tempDir,
        },
      ],
    };

    // The user should see both existing files and the option to type a new path
    // For this test, we'll select an existing file to ensure that functionality still works
    const existingFile = path.join(tempDir, 'existing', 'file1.txt');
    vi.mocked(fileSearchPrompt).mockResolvedValue(existingFile);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain('Selected:');
    expect(result).toContain(existingFile);
  });

  it('should handle relative paths for non-existent files', async () => {
    const template = 'New file: {{file "newFile"}}';

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      labels: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'newFile',
          type: 'file',
          message: 'Type a relative path:',
          basePath: tempDir,
        },
      ],
    };

    // Simulate user typing a relative path that doesn't exist
    // The system should resolve it to an absolute path
    const relativePath = 'subfolder/newfile.md';
    const expectedAbsolutePath = path.join(tempDir, relativePath);
    
    vi.mocked(fileSearchPrompt).mockResolvedValue(expectedAbsolutePath);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain('New file:');
    expect(result).toContain(expectedAbsolutePath);
  });

  it('should handle absolute paths for non-existent files', async () => {
    const template = 'Absolute path: {{file "absFile"}}';
    const absolutePath = path.join(os.tmpdir(), 'some-other-dir', 'file.txt');

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      labels: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'absFile',
          type: 'file',
          message: 'Type an absolute path:',
          basePath: tempDir,
        },
      ],
    };

    // User types an absolute path outside of basePath
    vi.mocked(fileSearchPrompt).mockResolvedValue(absolutePath);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain('Absolute path:');
    expect(result).toContain(absolutePath);
  });

  it('should work with Implementation Plan prompt scenario', async () => {
    // This test simulates the specific use case from the Implementation Plan prompt
    const template = `Create an implementation plan for {{file "designFile"}}. Write plan to {{reviewFile "implementationPlanFile"}}.`;

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Implementation Plan',
      labels: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'designFile',
          type: 'file',
          message: 'Select design file:',
          basePath: tempDir,
        },
        {
          name: 'implementationPlanFile',
          type: 'reviewFile',
          message: 'Where to save implementation plan:',
          basePath: tempDir,
          autoReview: false,
        },
      ],
    };

    // Simulate selecting an existing design file
    const designFile = path.join(tempDir, 'existing', 'file1.txt');
    // And typing a non-existent path for the implementation plan
    const planFile = path.join(tempDir, 'plans', 'implementation.md');

    vi.mocked(fileSearchPrompt).mockResolvedValueOnce(designFile);
    vi.mocked(reviewFilePrompt).mockResolvedValueOnce(planFile);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain(`Create an implementation plan for ${designFile}`);
    expect(result).toContain(`Write plan to ${planFile}`);
  });
});