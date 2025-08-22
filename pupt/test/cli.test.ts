import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('pt CLI', () => {
  const cliPath = path.join(__dirname, '../dist/cli.js');
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-cli-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  it('should display version with --version flag', () => {
    const output = execSync(`node ${cliPath} --version`).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should display help with --help flag', () => {
    const output = execSync(`node ${cliPath} --help`).toString();
    expect(output).toContain('Usage:');
    expect(output).toContain('Options:');
  });

  it('should run without arguments and show error when no prompts found', () => {
    // The CLI should show an error when no prompts are found in the default directory
    try {
      execSync(`node ${cliPath}`, {
        stdio: 'pipe',
        input: '\n', // Send enter to exit
        cwd: tempDir, // Run in temp directory with no config or prompts
        env: { ...process.env, HOME: tempDir } // Override HOME to avoid finding user's prompts
      });
      // If it doesn't throw, that's unexpected
      expect.fail('Expected CLI to throw error when no prompts found');
    } catch (error: any) {
      // Verify the error message contains expected content
      const stderr = error.stderr?.toString() || '';
      expect(stderr).toContain('No prompts found');
      expect(stderr).toContain('pt add');
    }
  });
});
