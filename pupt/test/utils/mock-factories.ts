import { spawn } from 'child_process';
import { vi } from 'vitest';

import type { Config } from '../../src/types/config.js';
import type { HistoryEntry } from '../../src/types/history.js';
import type { Prompt } from '../../src/types/prompt.js';

export function createMockConfig(overrides: Partial<Config> = {}): Config {
  return {
    promptDirectory: ['./.prompts'],
    historyDirectory: './.pthistory',
    editor: 'code',
    ...overrides
  };
}

export function createMockPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    name: 'test-prompt',
    description: 'A test prompt',
    path: '/path/to/test-prompt.md',
    content: 'Test prompt content',
    metadata: {},
    ...overrides
  };
}

export function createMockHistoryEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'test-id',
    timestamp: new Date().toISOString(),
    promptName: 'test-prompt',
    model: 'test-model',
    variables: {},
    output: 'Test output',
    ...overrides
  };
}

export function createMockConsole() {
  const mockConsole = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    table: vi.fn(),
    restore: () => {
      vi.restoreAllMocks();
    }
  };

  // Spy on the actual console methods
  vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
  vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
  vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
  vi.spyOn(console, 'info').mockImplementation(mockConsole.info);
  vi.spyOn(console, 'table').mockImplementation(mockConsole.table);

  return mockConsole;
}

export function createMockSpawn() {
  const mockSpawn = vi.fn();
  const mockProcess = {
    on: vi.fn((event: string, callback: Function) => {
      if (event === 'close') {
        // Simulate successful close after a short delay
        setTimeout(() => callback(0), 10);
      }
      return mockProcess;
    }),
    stdin: { 
      write: vi.fn(),
      end: vi.fn()
    },
    stdout: { 
      on: vi.fn(),
      pipe: vi.fn()
    },
    stderr: { 
      on: vi.fn(),
      pipe: vi.fn()
    },
    unref: vi.fn(),
    kill: vi.fn()
  };
  
  mockSpawn.mockReturnValue(mockProcess);
  return { mockSpawn, mockProcess };
}

export function createMockInquirer() {
  return {
    prompt: vi.fn().mockResolvedValue({}),
    registerPrompt: vi.fn(),
    ui: {
      BottomBar: vi.fn()
    }
  };
}

export function createMockFileSystem() {
  const files = new Map<string, string>();
  
  return {
    files,
    readFile: vi.fn((path: string) => {
      if (files.has(path)) {
        return Promise.resolve(files.get(path)!);
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, open '${path}'`));
    }),
    writeFile: vi.fn((path: string, content: string) => {
      files.set(path, content);
      return Promise.resolve();
    }),
    access: vi.fn((path: string) => {
      if (files.has(path)) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, access '${path}'`));
    }),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date()
    })
  };
}

export function createMockGit() {
  return {
    clone: vi.fn().mockResolvedValue(undefined),
    checkIsRepo: vi.fn().mockResolvedValue(true),
    status: vi.fn().mockResolvedValue({ isClean: () => true }),
    log: vi.fn().mockResolvedValue({ all: [] }),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined)
  };
}

export function createMockChildProcess() {
  return {
    exec: vi.fn((command: string, callback: Function) => {
      callback(null, '', '');
    }),
    execSync: vi.fn().mockReturnValue(''),
    spawn: createMockSpawn().mockSpawn
  };
}