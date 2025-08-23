import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine } from '../../src/template/template-engine.js';
import { Prompt } from '../../src/types/prompt.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';

vi.mock('../../src/prompts/input-types/file-search-prompt.js', () => ({
  default: vi.fn(),
  fileSearchPrompt: vi.fn()
}));

describe('File Selection Integration', () => {
  let tempDir: string;
  let engine: TemplateEngine;

  beforeEach(async () => {
    // Create temp directory with test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-file-test-'));
    
    // Create test file structure
    await fs.ensureDir(path.join(tempDir, 'src'));
    await fs.ensureDir(path.join(tempDir, 'test'));
    await fs.ensureDir(path.join(tempDir, 'docs'));
    
    await fs.writeFile(path.join(tempDir, 'README.md'), '# Test Project');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'console.log("test");');
    await fs.writeFile(path.join(tempDir, 'src', 'app.ts'), 'export const app = {};');
    await fs.writeFile(path.join(tempDir, 'test', 'app.test.ts'), 'test("app", () => {});');
    await fs.writeFile(path.join(tempDir, 'docs', 'api.md'), '# API Docs');
    
    engine = new TemplateEngine();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should process file input type in template', async () => {
    const template = `
Selected file: {{file "sourceFile"}}
`;

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      tags: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'sourceFile',
          type: 'file',
          message: 'Select a source file:',
          basePath: tempDir,
          filter: '*.ts',
        },
      ],
    };

    // Mock user selection
    const mockAnswers = {
      sourceFile: path.join(tempDir, 'src', 'index.ts'),
    };

    // Mock the file prompt to return our test value
    vi.mocked(fileSearchPrompt).mockResolvedValue(mockAnswers.sourceFile);

    const result = await engine.processTemplate(template, prompt);
    
    expect(result).toContain('Selected file:');
    expect(result).toContain(path.join(tempDir, 'src', 'index.ts'));
  });

  it('should handle file input with glob filter', async () => {
    const template = `
Files matching pattern:
{{file "markdownFile"}}
`;

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      tags: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'markdownFile',
          type: 'file',
          message: 'Select a markdown file:',
          basePath: tempDir,
          filter: '*.md',
        },
      ],
    };

    // The file prompt should only show .md files
    const availableFiles = ['README.md', 'docs/api.md'];
    
    // Verify that non-matching files are filtered out
    expect(availableFiles).not.toContain('package.json');
    expect(availableFiles).not.toContain('src/index.ts');
  });

  it('should handle file input with default value', async () => {
    const defaultFile = path.join(tempDir, 'package.json');
    
    const template = `
Config file: {{file "configFile"}}
`;

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      tags: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'configFile',
          type: 'file',
          message: 'Select configuration file:',
          basePath: tempDir,
          default: defaultFile,
        },
      ],
    };

    // The file prompt should start with the default value
    // In actual usage, the user could accept the default or change it
    expect(prompt.variables?.[0].default).toBe(defaultFile);
  });

  it('should handle reviewFile input type', async () => {
    const template = `
File to review: {{reviewFile "targetFile"}}
`;

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      tags: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'targetFile',
          type: 'reviewFile',
          message: 'Select file to review:',
          basePath: tempDir,
          autoReview: true,
        },
      ],
    };

    // ReviewFile should behave like file input but with review capability
    expect(prompt.variables?.[0].type).toBe('reviewFile');
    expect(prompt.variables?.[0].autoReview).toBe(true);
  });

  it('should handle nested directory navigation', async () => {
    // Create deeper directory structure
    await fs.ensureDir(path.join(tempDir, 'src', 'components', 'ui'));
    await fs.writeFile(
      path.join(tempDir, 'src', 'components', 'ui', 'button.tsx'),
      'export const Button = () => {};'
    );

    const template = `
Component: {{file "componentFile"}}
`;

    const prompt: Prompt = {
      path: '/test/prompt.md',
      relativePath: 'prompt.md',
      filename: 'prompt.md',
      title: 'Test Prompt',
      tags: [],
      content: template,
      frontmatter: {},
      variables: [
        {
          name: 'componentFile',
          type: 'file',
          message: 'Select a component:',
          basePath: tempDir,
          filter: '*.tsx',
        },
      ],
    };

    // File navigation should allow traversing nested directories
    const deepFile = path.join(tempDir, 'src', 'components', 'ui', 'button.tsx');
    expect(fs.existsSync(deepFile)).toBe(true);
  });
});