import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import os from 'os';
import { runCommand } from '../../src/commands/run.js';
import * as inquirerPrompts from '@inquirer/prompts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  checkbox: vi.fn(),
  search: vi.fn(),
  editor: vi.fn(),
  password: vi.fn()
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    }),
    stdin: {
      write: vi.fn(),
      end: vi.fn()
    }
  })),
  execFile: vi.fn()
}));
vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn())
}));

describe('User Input Protection from Handlebars Processing', () => {
  let tempDir: string;
  let promptsDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    promptsDir = path.join(tempDir, 'prompts');
    await fs.mkdir(promptsDir);

    // Create config
    const config = {
      promptDirs: [promptsDir],
      codingTool: 'echo',
      codingToolArgs: []
    };
    await fs.writeFile(
      path.join(tempDir, '.ptrc.json'),
      JSON.stringify(config, null, 2)
    );

    // Change to temp directory
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should handle user discussing {{file}} helper without errors', async () => {
    // This recreates the exact scenario from the user's issue
    const promptContent = `---
title: Improving the file helper
labels: [improvement]
---

I want to discuss improvements to the {{input "helper" "Which helper do you want to improve?"}} helper.

The current implementation needs these enhancements:
{{input "enhancements" "What enhancements do you suggest?"}}
`;

    await fs.writeFile(
      path.join(promptsDir, 'improve-helper.md'),
      promptContent
    );

    // Mock user interactions
    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'Improving the file helper',
      path: path.join(promptsDir, 'improve-helper.md'),
      content: promptContent,
      labels: ['improvement']
    });
    
    // User types "{{file}}" when asked which helper
    vi.mocked(inquirerPrompts.input)
      .mockResolvedValueOnce('{{file}}')
      .mockResolvedValueOnce('Support for glob patterns like {{file "*.js"}}');

    // Capture the output
    let capturedPrompt = '';
    const mockSpawn = vi.mocked((await import('child_process')).spawn);
    mockSpawn.mockImplementationOnce((command: any, args: any) => ({
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      }),
      stdin: {
        write: vi.fn((data: string) => {
          capturedPrompt = data;
        }),
        end: vi.fn()
      },
      stdout: null,
      stderr: null,
      pid: 12345,
      kill: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
      unref: vi.fn(),
      ref: vi.fn(),
      addListener: vi.fn(),
      emit: vi.fn(),
      eventNames: vi.fn(),
      getMaxListeners: vi.fn(),
      listenerCount: vi.fn(),
      listeners: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      rawListeners: vi.fn(),
      removeAllListeners: vi.fn(),
      removeListener: vi.fn(),
      setMaxListeners: vi.fn()
    } as any));

    // Run the command
    await runCommand([], {});
    
    // Verify the user's input is preserved exactly as typed
    expect(capturedPrompt).toContain('I want to discuss improvements to the {{file}} helper');
    expect(capturedPrompt).toContain('Support for glob patterns like {{file "*.js"}}');
    
    // Verify no Handlebars processing errors
    expect(capturedPrompt).not.toContain('Error');
    expect(capturedPrompt).not.toContain('file helper requires');
    expect(capturedPrompt).not.toContain('Missing helper');
  });

  it('should handle complex handlebars syntax in user input', async () => {
    const promptContent = `---
title: Template Examples
---

Provide a template example: {{input "template" "Enter a Handlebars template:"}}
`;

    await fs.writeFile(
      path.join(promptsDir, 'template-example.md'),
      promptContent
    );

    // Mock user interactions
    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'Template Examples',
      path: path.join(promptsDir, 'template-example.md'),
      content: promptContent,
      labels: []
    });
    
    // User enters complex handlebars template
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce(`
{{#if user}}
  Hello {{user.name}}!
  {{#each user.items}}
    - {{this}}
  {{/each}}
{{/if}}
`);

    // Capture the output
    let capturedPrompt = '';
    const mockSpawn = vi.mocked((await import('child_process')).spawn);
    mockSpawn.mockImplementationOnce((command: any, args: any) => ({
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      }),
      stdin: {
        write: vi.fn((data: string) => {
          capturedPrompt = data;
        }),
        end: vi.fn()
      },
      stdout: null,
      stderr: null,
      pid: 12345,
      kill: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
      unref: vi.fn(),
      ref: vi.fn(),
      addListener: vi.fn(),
      emit: vi.fn(),
      eventNames: vi.fn(),
      getMaxListeners: vi.fn(),
      listenerCount: vi.fn(),
      listeners: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      rawListeners: vi.fn(),
      removeAllListeners: vi.fn(),
      removeListener: vi.fn(),
      setMaxListeners: vi.fn()
    } as any));

    // Run the command
    await runCommand([], {});
    
    // Verify the entire template is preserved
    expect(capturedPrompt).toContain('{{#if user}}');
    expect(capturedPrompt).toContain('Hello {{user.name}}!');
    expect(capturedPrompt).toContain('{{#each user.items}}');
    expect(capturedPrompt).toContain('{{this}}');
    expect(capturedPrompt).toContain('{{/each}}');
    expect(capturedPrompt).toContain('{{/if}}');
  });
});