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

describe('Raw Block Helper Integration', () => {
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

  it('should handle raw blocks to preserve handlebars syntax', async () => {
    // Create a prompt with raw blocks to preserve handlebars syntax
    const promptContent = `---
title: Handlebars Documentation
labels: [docs, helpers]
---

# How to use Handlebars helpers

The file helper syntax is: {{#raw}}{{file "path/to/file.txt"}}{{/raw}}

You can also use:
- {{#raw}}{{input "varName" "prompt"}}{{/raw}} for user input
- {{#raw}}{{select "varName" "prompt" "opt1,opt2"}}{{/raw}} for selection
- {{#raw}}{{date}}{{/raw}} for current date

Real input: {{input "userName" "What's your name?"}}
`;

    await fs.writeFile(
      path.join(promptsDir, 'handlebars-docs.md'),
      promptContent
    );

    // Mock user interactions
    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'Handlebars Documentation',
      path: path.join(promptsDir, 'handlebars-docs.md'),
      content: promptContent,
      labels: ['docs', 'helpers']
    });
    
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('Alice');

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

    await runCommand([], {});

    // Verify the output contains literal helpers (preserved by raw blocks)
    expect(capturedPrompt).toContain('The file helper syntax is: {{file "path/to/file.txt"}}');
    expect(capturedPrompt).toContain('{{input "varName" "prompt"}} for user input');
    expect(capturedPrompt).toContain('{{select "varName" "prompt" "opt1,opt2"}} for selection');
    expect(capturedPrompt).toContain('{{date}} for current date');
    
    // Verify the real input was processed
    expect(capturedPrompt).toContain('Real input: Alice');
    
    // Verify raw blocks worked correctly
    expect(capturedPrompt).not.toContain('Error');
    expect(capturedPrompt).not.toContain('helper requires');
    expect(capturedPrompt).not.toContain('{{#raw}}'); // Raw blocks should be processed
  });

  it('should handle nested raw blocks and edge cases', async () => {
    // Create a prompt with various raw block patterns
    const promptContent = `---
title: Complex Raw Block Test
---

{{#raw}}
Simple: {{helper}}
With args: {{helper "arg1" "arg2"}}
Multiple: {{one}} and {{two}}
{{/raw}}

Mixed: Real {{input "test" "Enter value:"}} and raw {{#raw}}{{fake}}{{/raw}}
`;

    await fs.writeFile(
      path.join(promptsDir, 'complex-escape.md'),
      promptContent
    );

    // Mock user interactions
    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'Complex Raw Block Test',
      path: path.join(promptsDir, 'complex-escape.md'),
      content: promptContent,
      labels: []
    });
    
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('TestValue');

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

    await runCommand([], {});

    // Verify all patterns in raw blocks are preserved
    expect(capturedPrompt).toContain('Simple: {{helper}}');
    expect(capturedPrompt).toContain('With args: {{helper "arg1" "arg2"}}');
    expect(capturedPrompt).toContain('Multiple: {{one}} and {{two}}');
    
    // Verify mixed content works
    expect(capturedPrompt).toContain('Mixed: Real TestValue and raw {{fake}}');
  });
});