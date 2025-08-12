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
});
