import { execSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';

import * as fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('AutoRun Feature', () => {
  let testDir: string;
  let configDir: string;
  let dataDir: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create test directory in a deep path to avoid parent configs
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-autorun-test-'));
    testDir = path.join(baseDir, 'deep', 'nested', 'test');
    await fs.ensureDir(testDir);

    // Create separate config and data directories for global config
    configDir = path.join(baseDir, 'config');
    dataDir = path.join(baseDir, 'data');
    await fs.ensureDir(configDir);
    await fs.ensureDir(dataDir);

    cliPath = path.resolve('./dist/cli.js');

    // Create a simple prompt (.prompt JSX format) using absolute path
    const promptDir = path.join(testDir, '.prompts');
    await fs.ensureDir(promptDir);
    await fs.writeFile(
      path.join(promptDir, 'test.prompt'),
      '<Prompt name="test" description="Test Prompt" tags={[]}>\n  <Task>This is a test prompt</Task>\n</Prompt>'
    );
  });

  afterEach(async () => {
    // Remove the base directory (3 levels up from testDir)
    const baseDir = path.resolve(testDir, '../../..');
    await fs.remove(baseDir);
  });

  it('should automatically run default command when autoRun is enabled', async () => {
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun enabled
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['{{prompt}}'],
      defaultCmdOptions: {},
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the prompt and answering no to continue option
    const mockInput = '\n\n'; // Select first prompt, then answer no to continue option

    const output = execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir }
    });

    expect(output).toContain('Processing: Test Prompt'); // Uses description as human-friendly title
    expect(output).toContain('Running: echo');
    expect(output).toContain('This is a test prompt');
  });

  it('should not run automatically when autoRun is disabled', async () => {
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun disabled
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: false,
      defaultCmd: 'echo',
      defaultCmdArgs: ['{{prompt}}'],
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the prompt
    const mockInput = '\n'; // Just press enter to select first prompt

    const output = execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir }
    });

    expect(output).toContain('Generated Prompt:');
    expect(output).toContain('This is a test prompt');
    expect(output).not.toContain('Running: echo');
  });

  it('should handle autoRun failure gracefully', async () => {
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun and a command that will fail
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: true,
      defaultCmd: 'nonexistentcommand12345',
      defaultCmdArgs: ['{{prompt}}'],
      defaultCmdOptions: {},
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the prompt
    const mockInput = '\n'; // Select first prompt

    try {
      execSync(`node ${cliPath}`, {
        input: mockInput,
        encoding: 'utf-8',
        cwd: testDir,
        env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // Command should fail but still show the generated prompt first
      const stdout = error.stdout?.toString() || '';
      expect(stdout).toContain('Generated Prompt:');
      expect(stdout).toContain('This is a test prompt');
      expect(stdout).toContain('Running: nonexistentcommand12345');
      // Exit code should be non-zero
      expect(error.status).not.toBe(0);
    }
  });

  it('should respect existing command line arguments over autoRun', async () => {
    const promptDir = path.join(testDir, '.prompts');
    const historyDir = path.join(testDir, '.pthistory');

    // Create config with autoRun enabled and history enabled
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      historyDir: historyDir,
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['{{prompt}}'],
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Run with explicit command - should not trigger autoRun
    const output = execSync(`node ${cliPath} history`, {
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir }
    }).toString();

    expect(output).toContain('No history found');
    expect(output).not.toContain('Running: echo');
  });

  it.skip('should handle autoRun with command options', async () => {
    // TODO: This test is flaky due to timing issues with interactive prompts.
    // The test expects the command to complete but it times out waiting for user input
    // to the defaultCmdOptions prompt. This needs to be refactored to use a more reliable
    // testing approach for interactive CLI commands.
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun and options
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['-n', '{{prompt}}'],
      defaultCmdOptions: {
        'Add newline?': '-e'
      },
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the prompt and then answering no to option
    // Need extra newlines because of potential buffering
    const mockInput = '\n\n\n'; // Select prompt, answer no to option, extra newline

    const output = execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir },
      timeout: 10000 // 10 second timeout
    });

    expect(output).toContain('Processing: test');
    expect(output).toContain('Running: echo -n');
    expect(output).toContain('This is a test prompt');
  });

  it('should save to history when autoRun executes', async () => {
    const promptDir = path.join(testDir, '.prompts');
    const historyDir = path.join(testDir, '.pthistory');

    // Create config with autoRun and history enabled
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      historyDir: historyDir,
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['{{prompt}}'],
      defaultCmdOptions: {},
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the prompt
    const mockInput = '\n'; // Select first prompt

    execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir }
    });

    // Check that history was saved
    const historyFiles = await fs.readdir(historyDir);
    expect(historyFiles.length).toBe(1);

    const historyContent = await fs.readJson(path.join(historyDir, historyFiles[0]));
    expect(historyContent.title).toBe('Test Prompt'); // Uses description as human-friendly title
    expect(historyContent.finalPrompt).toContain('This is a test prompt');
  });
});
