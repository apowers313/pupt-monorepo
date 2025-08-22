import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine } from '../../src/template/template-engine.js';
import { Prompt } from '../../src/types/prompt.js';
import * as inquirerPrompts from '@inquirer/prompts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  checkbox: vi.fn(),
  editor: vi.fn(),
  password: vi.fn(),
}));

vi.mock('../../src/prompts/input-types/file-search-prompt.js', () => ({
  fileSearchPrompt: vi.fn(),
}));

vi.mock('../../src/prompts/input-types/review-file-prompt.js', () => ({
  reviewFilePrompt: vi.fn(),
}));

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new TemplateEngine();
  });

  it('should process static helpers', async () => {
    const template = 'Today is {{date}} at {{time}}';
    const result = await engine.processTemplate(template, {});

    expect(result).toMatch(/Today is \d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should process input helpers and cache values', async () => {
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('MyProject');

    // First test simple replacement
    const simpleTemplate = 'Project: {{input "projectName" "Enter project name:"}}';
    const simpleResult = await engine.processTemplate(simpleTemplate, {});
    expect(simpleResult).toBe('Project: MyProject');

    // Then test with variable reference
    const template = `
Project: {{input "projectName" "Enter project name:"}}
Path: /src/{{projectName}}/index.ts
    `.trim();

    // Reset engine for second test
    engine = new TemplateEngine();
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('MyProject');

    const result = await engine.processTemplate(template, {});

    expect(inquirerPrompts.input).toHaveBeenCalledTimes(2);
    expect(result).toContain('Project: MyProject');
    expect(result).toContain('Path: /src/MyProject/index.ts');
  });

  it('should handle select helpers', async () => {
    vi.mocked(inquirerPrompts.select).mockResolvedValueOnce('typescript');

    const template = 'Language: {{select "language" "Choose language:"}}';
    const result = await engine.processTemplate(template, {
      variables: [
        {
          name: 'language',
          type: 'select',
          choices: ['javascript', 'typescript'],
        },
      ],
    });

    expect(result).toBe('Language: typescript');
  });

  it('should use variable definitions from frontmatter', async () => {
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('TestComponent');

    const prompt: Partial<Prompt> = {
      content: 'Component: {{input "componentName"}}',
      variables: [
        {
          name: 'componentName',
          type: 'input',
          message: 'Component name?',
          default: 'MyComponent',
        },
      ],
    };

    const result = await engine.processTemplate(prompt.content!, prompt);

    expect(inquirerPrompts.input).toHaveBeenCalledWith({
      message: 'Component name?',
      default: 'MyComponent',
    });
    expect(result).toBe('Component: TestComponent');
  });

  it('should mask sensitive values', async () => {
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('secret-key-123');

    const template = 'API Key: {{input "apiKey" "Enter API key:"}}';
    const result = await engine.processTemplate(template, {});

    expect(result).toBe('API Key: secret-key-123');

    // Check that context stores masked value for history
    const context = engine.getContext();
    expect(context.get('apiKey')).toBe('secret-key-123');
    expect(context.getMasked('apiKey')).toBe('***');
  });

  it('should handle raw blocks to preserve handlebars syntax', async () => {
    const template = `
This is how to use a custom helper: {{#raw}}{{customFile "example.txt"}}{{/raw}}
And here's a real input helper: {{input "name" "Enter name:"}}
More examples: {{#raw}}{{helper1}} and {{helper2 "arg"}}{{/raw}}
    `.trim();

    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('John');

    const result = await engine.processTemplate(template, {});

    expect(result).toBe(`
This is how to use a custom helper: {{customFile "example.txt"}}
And here's a real input helper: John
More examples: {{helper1}} and {{helper2 "arg"}}
    `.trim());
  });

  it('should handle raw blocks in documentation', async () => {
    // This test ensures that raw blocks preserve handlebars syntax
    const template = 'Documentation: {{#raw}}{{myHelper "readme.md"}}{{/raw}} explains how to use {{input "tool" "Which tool?"}}';
    
    // Reset mocks and engine
    vi.clearAllMocks();
    engine = new TemplateEngine();
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('prompt-tool');

    const result = await engine.processTemplate(template, {});

    expect(result).toBe('Documentation: {{myHelper "readme.md"}} explains how to use prompt-tool');
    expect(inquirerPrompts.input).toHaveBeenCalledTimes(1); // Only called for the real helper
  });

  describe('deduplication of same variable inputs', () => {
    it('should only prompt once for multiple input helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('test-value');

      const template = `
First: {{input "foo"}}
Second: {{input "foo"}}
Third: {{input "foo" "Custom message"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.input).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
First: test-value
Second: test-value
Third: test-value
      `.trim());
    });

    it('should only prompt once for multiple select helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.select).mockResolvedValueOnce('option1');

      const template = `
Choice 1: {{select "choice" "Pick one"}}
Choice 2: {{select "choice"}}
Choice 3: {{select "choice" "Another message"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.select).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
Choice 1: option1
Choice 2: option1
Choice 3: option1
      `.trim());
    });

    it('should only prompt once for multiple password helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.password).mockResolvedValueOnce('secret123');

      const template = `
Password: {{password "apiKey"}}
Confirm: {{password "apiKey" "Confirm API key"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.password).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
Password: secret123
Confirm: secret123
      `.trim());
    });

    it('should only prompt once for multiple editor helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.editor).mockResolvedValueOnce('edited content');

      const template = `
Content: {{editor "content"}}
Again: {{editor "content" "Edit again"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.editor).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
Content: edited content
Again: edited content
      `.trim());
    });

    it('should only prompt once for multiple checkbox helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.checkbox).mockResolvedValueOnce(['opt1', 'opt2']);

      const template = `
Selected: {{multiselect "options"}}
Again: {{multiselect "options" "Select again"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.checkbox).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
Selected: opt1,opt2
Again: opt1,opt2
      `.trim());
    });

    it('should only prompt once for multiple confirm helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.confirm).mockResolvedValueOnce(true);

      const template = `
Proceed: {{confirm "proceed"}}
Again: {{confirm "proceed" "Really proceed?"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.confirm).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
Proceed: true
Again: true
      `.trim());
    });

    it('should handle different variable names independently', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce('foo-value')
        .mockResolvedValueOnce('bar-value');

      const template = `
Foo: {{input "foo"}}
Bar: {{input "bar"}}
Foo again: {{input "foo"}}
Bar again: {{input "bar"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.input).toHaveBeenCalledTimes(2);
      expect(result).toBe(`
Foo: foo-value
Bar: bar-value
Foo again: foo-value
Bar again: bar-value
      `.trim());
    });

    it('should handle mixed helper types with same variable name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('test-value');

      const template = `
First as input: {{input "mixed"}}
Second still input: {{input "mixed" "Different message"}}
Third still input: {{input "mixed"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      // Should only call input once since all are input type with same name
      expect(inquirerPrompts.input).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
First as input: test-value
Second still input: test-value
Third still input: test-value
      `.trim());
    });

    it('should handle complex template with multiple deduplicated variables', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      vi.mocked(inquirerPrompts.input)
        .mockResolvedValueOnce('MyProject')
        .mockResolvedValueOnce('John Doe');
      vi.mocked(inquirerPrompts.select).mockResolvedValueOnce('MIT');

      const template = `
# Project: {{input "projectName"}}

Author: {{input "author"}}
License: {{select "license" "Choose license"}}

## {{input "projectName"}} Details

Created by {{input "author"}} under {{select "license"}} license.

Project path: /projects/{{input "projectName"}}/src
Documentation: /projects/{{input "projectName"}}/docs
Author email: {{input "author"}}@example.com
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(inquirerPrompts.input).toHaveBeenCalledTimes(2);
      expect(inquirerPrompts.select).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
# Project: MyProject

Author: John Doe
License: MIT

## MyProject Details

Created by John Doe under MIT license.

Project path: /projects/MyProject/src
Documentation: /projects/MyProject/docs
Author email: John Doe@example.com
      `.trim());
    });

    it('should only prompt once for multiple file helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      const { fileSearchPrompt } = await import('../../src/prompts/input-types/file-search-prompt.js');
      vi.mocked(fileSearchPrompt).mockResolvedValueOnce('/path/to/file.txt');

      const template = `
File: {{file "selectedFile"}}
Same file: {{file "selectedFile" "Pick file again"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(fileSearchPrompt).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
File: /path/to/file.txt
Same file: /path/to/file.txt
      `.trim());
    });

    it('should only prompt once for multiple reviewFile helpers with same name', async () => {
      vi.clearAllMocks();
      engine = new TemplateEngine();
      const { reviewFilePrompt } = await import('../../src/prompts/input-types/review-file-prompt.js');
      vi.mocked(reviewFilePrompt).mockResolvedValueOnce('reviewed content');

      const template = `
Review: {{reviewFile "review"}}
Again: {{reviewFile "review" "Review again"}}
      `.trim();

      const result = await engine.processTemplate(template, {});

      expect(reviewFilePrompt).toHaveBeenCalledTimes(1);
      expect(result).toBe(`
Review: reviewed content
Again: reviewed content
      `.trim());
    });
  });
});
