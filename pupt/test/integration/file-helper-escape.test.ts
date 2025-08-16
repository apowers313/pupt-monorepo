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

describe('Raw Block Helper for Handlebars Syntax', () => {
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

  it('should automatically protect user input from handlebars processing', async () => {
    // Create a prompt where user enters handlebars syntax
    const promptContent = `---
title: Enter Handlebars Examples
labels: [documentation]
---

Please provide an example of a handlebars helper: {{input "example" "Enter a handlebars helper example:"}}

Your example will be displayed here verbatim.
`;

    await fs.writeFile(
      path.join(promptsDir, 'file-helper-improvements.md'),
      promptContent
    );

    // Mock user interactions
    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'Handlebars Helper Documentation',
      path: path.join(promptsDir, 'file-helper-improvements.md'),
      content: promptContent,
      labels: ['documentation', 'helpers']
    });
    
    // User enters handlebars syntax as input
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('{{file "readme.md"}}');

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
    
    // Verify the user's handlebars input is preserved literally
    expect(capturedPrompt).toContain('Please provide an example of a handlebars helper: {{file "readme.md"}}');
    expect(capturedPrompt).toContain('Your example will be displayed here verbatim.');
    
    // Verify no processing errors occurred
    expect(capturedPrompt).not.toContain('Error');
    expect(capturedPrompt).not.toContain('Missing helper');
    
    // Verify no error messages about missing helpers
    expect(capturedPrompt).not.toContain('Error');
    expect(capturedPrompt).not.toContain('file helper requires');
    expect(capturedPrompt).not.toContain('Missing helper');
  });
});