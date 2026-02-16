import { promises as fs } from 'node:fs';
import os from 'node:os';
import * as path from 'node:path';

import * as inquirerPrompts from '@inquirer/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let testDir: string;

vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

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

// Mock PuptService
vi.mock('../../src/services/pupt-service.js', () => ({
  PuptService: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    getPromptsAsAdapted: vi.fn().mockReturnValue([]),
    findPrompt: vi.fn().mockReturnValue(undefined),
    getPrompts: vi.fn().mockReturnValue([]),
    getPrompt: vi.fn(),
    getPromptPath: vi.fn(),
    getWarnings: vi.fn().mockReturnValue([]),
    wrapWithEnvironment: vi.fn().mockImplementation((dp: any) => dp),
  })),
}));

// Mock collectInputs
vi.mock('../../src/services/input-collector.js', () => ({
  collectInputs: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('../../src/services/module-entry-builder.js', () => ({
  buildModuleEntries: vi.fn(async () => []),
}));

import { runCommand } from '../../src/commands/run.js';

describe('User Input Protection from Handlebars Processing', () => {
  let promptsDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create temp directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    promptsDir = path.join(testDir, 'prompts');
    await fs.mkdir(promptsDir);

    // Write config.json to testDir (the mocked global config dir)
    const config = {
      version: '8.0.0',
      promptDirs: [promptsDir],
      defaultCmd: 'echo',
      libraries: [],
    };
    await fs.writeFile(
      path.join(testDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  });

  afterEach(async () => {
    // On Windows, files might still be in use, so retry removal
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
        break;
      } catch (error) {
        if (i === maxRetries - 1) {throw error;}
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it('should handle user discussing {{file}} helper without errors', async () => {
    // Set up PuptService mock for this test
    const { PuptService } = await import('../../src/services/pupt-service.js');
    const { collectInputs } = await import('../../src/services/input-collector.js');

    const mockSource = {
      name: 'improve-helper',
      description: 'Improve helper discussion',
      tags: ['improvement'],
      library: '',
      element: {} as any,
      render: vi.fn().mockReturnValue({
        text: 'I want to discuss improvements to the {{file}} helper.\n\nThe current implementation needs these enhancements:\nSupport for glob patterns like {{file "*.js"}}',
        metadata: {},
        postExecution: []
      }),
      getInputIterator: vi.fn().mockReturnValue({
        start: vi.fn(),
        current: vi.fn().mockReturnValue(null),
        submit: vi.fn(),
        advance: vi.fn(),
        isDone: vi.fn().mockReturnValue(true),
        getValues: vi.fn().mockReturnValue(new Map([
          ['helper', '{{file}}'],
          ['enhancements', 'Support for glob patterns like {{file "*.js"}}']
        ])),
      }),
    };

    // Mock collectInputs to return user's values
    vi.mocked(collectInputs).mockResolvedValue(new Map([
      ['helper', '{{file}}'],
      ['enhancements', 'Support for glob patterns like {{file "*.js"}}']
    ]));

    vi.mocked(PuptService).mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      getPromptsAsAdapted: vi.fn().mockReturnValue([{
        path: path.join(promptsDir, 'improve-helper.prompt'),
        relativePath: 'improve-helper.prompt',
        filename: 'improve-helper.prompt',
        title: 'improve-helper',
        tags: ['improvement'],
        content: 'Improve helper discussion',
        frontmatter: {},
        _source: mockSource,
      }]),
      findPrompt: vi.fn().mockReturnValue(mockSource),
      getPrompts: vi.fn().mockReturnValue([mockSource]),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
      getWarnings: vi.fn().mockReturnValue([]),
      wrapWithEnvironment: vi.fn().mockImplementation((dp: any) => dp),
    } as any));

    // Mock InteractiveSearch to select our prompt
    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'improve-helper',
      path: path.join(promptsDir, 'improve-helper.prompt'),
      content: 'Improve helper discussion',
      tags: ['improvement'],
      _source: mockSource,
    });

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
    expect(capturedPrompt).toContain('{{file}}');
    expect(capturedPrompt).toContain('{{file "*.js"}}');

    // Verify no processing errors
    expect(capturedPrompt).not.toContain('Error');
    expect(capturedPrompt).not.toContain('file helper requires');
    expect(capturedPrompt).not.toContain('Missing helper');
  });

  it('should handle complex handlebars syntax in user input', async () => {
    const complexTemplate = `
{{#if user}}
  Hello {{user.name}}!
  {{#each user.items}}
    - {{this}}
  {{/each}}
{{/if}}
`;

    const { PuptService } = await import('../../src/services/pupt-service.js');
    const { collectInputs } = await import('../../src/services/input-collector.js');

    const mockSource = {
      name: 'template-example',
      description: 'Template Examples',
      tags: [],
      library: '',
      element: {} as any,
      render: vi.fn().mockReturnValue({
        text: `Provide a template example: ${complexTemplate}`,
        metadata: {},
        postExecution: []
      }),
      getInputIterator: vi.fn().mockReturnValue({
        start: vi.fn(),
        current: vi.fn().mockReturnValue(null),
        submit: vi.fn(),
        advance: vi.fn(),
        isDone: vi.fn().mockReturnValue(true),
        getValues: vi.fn().mockReturnValue(new Map([
          ['template', complexTemplate]
        ])),
      }),
    };

    vi.mocked(collectInputs).mockResolvedValue(new Map([
      ['template', complexTemplate]
    ]));

    vi.mocked(PuptService).mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      getPromptsAsAdapted: vi.fn().mockReturnValue([{
        path: path.join(promptsDir, 'template-example.prompt'),
        relativePath: 'template-example.prompt',
        filename: 'template-example.prompt',
        title: 'template-example',
        tags: [],
        content: 'Template Examples',
        frontmatter: {},
        _source: mockSource,
      }]),
      findPrompt: vi.fn().mockReturnValue(mockSource),
      getPrompts: vi.fn().mockReturnValue([mockSource]),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
      getWarnings: vi.fn().mockReturnValue([]),
      wrapWithEnvironment: vi.fn().mockImplementation((dp: any) => dp),
    } as any));

    vi.mocked(inquirerPrompts.search).mockResolvedValueOnce({
      title: 'template-example',
      path: path.join(promptsDir, 'template-example.prompt'),
      content: 'Template Examples',
      tags: [],
      _source: mockSource,
    });

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
