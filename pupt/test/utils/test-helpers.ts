import { mkdtemp, rm, writeFile, mkdir } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { beforeEach, afterEach, vi } from 'vitest';
import { createMockConsole } from './mock-factories.js';

export interface TestContext {
  tempDir: string;
  cleanup: () => Promise<void>;
}

export function setupTestEnvironment(): TestContext {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pt-test-'));
  });
  
  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  
  return {
    get tempDir() { return tempDir; },
    cleanup: async () => {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  };
}

export function mockConsoleOutput() {
  const mockConsole = createMockConsole();
  
  afterEach(() => {
    mockConsole.restore();
  });
  
  return mockConsole;
}

export async function createTestPromptStructure(baseDir: string) {
  const promptsDir = join(baseDir, 'prompts');
  const historyDir = join(baseDir, '.pthistory');
  
  await mkdir(promptsDir, { recursive: true });
  await mkdir(historyDir, { recursive: true });
  
  // Create some test prompts
  await writeFile(
    join(promptsDir, 'test-prompt.md'),
    `---
name: test-prompt
description: A test prompt
---

This is a test prompt with {{variable}}.`
  );
  
  await writeFile(
    join(promptsDir, 'complex-prompt.md'),
    `---
name: complex-prompt
description: A complex prompt with inputs
inputs:
  - name: name
    type: text
    description: Your name
    required: true
  - name: choice
    type: select
    description: Make a choice
    options:
      - option1
      - option2
---

Hello {{name}}, you chose {{choice}}.`
  );
  
  // Create a config file
  await writeFile(
    join(baseDir, '.ptrc.json'),
    JSON.stringify({
      promptDirectory: ['./prompts'],
      historyDirectory: './.pthistory'
    }, null, 2)
  );
  
  return {
    promptsDir,
    historyDir,
    configPath: join(baseDir, '.ptrc.json')
  };
}

export function mockEnvironmentVariables(vars: Record<string, string>) {
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    Object.assign(process.env, vars);
  });
  
  afterEach(() => {
    // Reset to original state
    Object.keys(vars).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  });
}

export function mockDateNow(timestamp: number) {
  const originalNow = Date.now;
  
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(timestamp);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  return {
    restore: () => {
      Date.now = originalNow;
    }
  };
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

export function captureProcessExit() {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new Error(`Process.exit(${code}) called`);
  });
  
  return {
    exitSpy,
    restore: () => {
      exitSpy.mockRestore();
    }
  };
}

export function suppressConsoleOutput() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
  });
  
  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });
}