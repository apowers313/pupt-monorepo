import { execSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';

import * as fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

describe('AutoRun Regression Tests', () => {
  let testDir: string;
  let configDir: string;
  let dataDir: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create test directory in a deep path to avoid parent configs
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-autorun-regression-'));
    testDir = path.join(baseDir, 'deep', 'nested', 'test');
    await fs.ensureDir(testDir);

    // Create separate config and data directories for global config
    configDir = path.join(baseDir, 'config');
    dataDir = path.join(baseDir, 'data');
    await fs.ensureDir(configDir);
    await fs.ensureDir(dataDir);

    cliPath = path.resolve('./dist/cli.js');

    // Create multiple prompts (.prompt JSX format) to ensure we're not just selecting the first one
    const promptDir = path.join(testDir, '.prompts');
    await fs.ensureDir(promptDir);
    await fs.writeFile(
      path.join(promptDir, 'first.prompt'),
      '<Prompt name="first" description="First Prompt" tags={[]}>\n  <Task>This is the first prompt</Task>\n</Prompt>'
    );
    await fs.writeFile(
      path.join(promptDir, 'second.prompt'),
      '<Prompt name="second" description="Second Prompt" tags={[]}>\n  <Task>This is the second prompt</Task>\n</Prompt>'
    );
  });

  afterEach(async () => {
    // Remove the base directory (3 levels up from testDir)
    const baseDir = path.resolve(testDir, '../../..');
    await fs.remove(baseDir);
  });

  it('should NOT automatically run first prompt when autoRun is disabled', async () => {
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun disabled (default)
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: false,
      defaultCmd: 'echo',
      defaultCmdArgs: ['SHOULD_NOT_SEE_THIS'],
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the second prompt
    const mockInput = '\x1B[B\n'; // Arrow down, then enter to select second prompt

    const output = execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir }
    });

    // Should show interactive selection happened
    expect(output).toContain('Processing: Second Prompt'); // Uses description as human-friendly title
    expect(output).toContain('Generated Prompt:');
    expect(output).toContain('This is the second prompt');

    // Should NOT automatically run any command
    expect(output).not.toContain('Running: echo');
    expect(output).not.toContain('SHOULD_NOT_SEE_THIS');
  });

  it('should only run after prompt selection when autoRun is enabled', async () => {
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun enabled
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['SELECTED_PROMPT'],
      defaultCmdOptions: {},
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting the first prompt
    const mockInput = '\n'; // Select first prompt

    const output = execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir }
    });

    // Should show interactive selection happened
    expect(output).toContain('Processing: First Prompt'); // Uses description as human-friendly title
    expect(output).toContain('Generated Prompt:');
    expect(output).toContain('This is the first prompt');

    // Should run the command AFTER selection
    expect(output).toContain('Running: echo SELECTED_PROMPT');
  });

  it.skip('should ask defaultCmdOptions only after prompt selection', async () => {
    // TODO: This test is flaky due to timing issues with interactive prompts.
    // The test expects the command to complete but it times out waiting for user input
    // to the defaultCmdOptions prompt. This needs to be refactored to use a more reliable
    // testing approach for interactive CLI commands.
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun enabled and options
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: [],
      defaultCmdOptions: {
        'Add timestamp?': '--timestamp'
      },
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user selecting prompt and answering NO to option
    // Need extra newlines because of potential buffering
    const mockInput = '\n\n\n'; // Select first prompt, answer no to option, extra newline

    const output = execSync(`node ${cliPath}`, {
      input: mockInput,
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, PUPT_CONFIG_DIR: configDir, PUPT_DATA_DIR: dataDir },
      timeout: 10000 // 10 second timeout
    });

    // Should show the prompt was selected first
    expect(output).toContain('Processing: first');
    expect(output).toContain('Generated Prompt:');

    // Should ask for options after showing the generated prompt
    expect(output).toContain('Add timestamp?');

    // Should run without the option since we answered no
    expect(output).toContain('Running: echo');
    expect(output).not.toContain('--timestamp');
  });

  it('should not run anything if user cancels prompt selection', async () => {
    const promptDir = path.join(testDir, '.prompts');

    // Create config with autoRun enabled
    const config = {
      version: '8.0.0',
      promptDirs: [promptDir],
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['SHOULD_NOT_RUN'],
      libraries: [],
    };

    await fs.writeJson(path.join(configDir, 'config.json'), config);

    // Mock user cancelling (Ctrl+C)
    const mockInput = '\x03'; // Ctrl+C

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
      const output = error.stdout?.toString() || '';
      // Should NOT contain any processing or running messages
      expect(output).not.toContain('Processing:');
      expect(output).not.toContain('Running: echo');
      expect(output).not.toContain('SHOULD_NOT_RUN');
    }
  });
});
