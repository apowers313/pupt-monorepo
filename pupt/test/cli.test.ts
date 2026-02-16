import { execSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

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

  describe('unknown command handling', () => {
    it('should show user-friendly error for unknown commands', () => {
      try {
        execSync(`node ${cliPath} unknowncommand`, {
          stdio: 'pipe',
          cwd: tempDir,
          env: { ...process.env, HOME: tempDir }
        });
        expect.fail('Expected CLI to throw error for unknown command');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain("Unknown command: 'unknowncommand'");
        expect(stderr).toContain('Available commands:');
        expect(stderr).toContain('pt help');
      }
    });

    it('should suggest similar commands for typos', () => {
      try {
        execSync(`node ${cliPath} histroy`, {
          stdio: 'pipe',
          cwd: tempDir,
          env: { ...process.env, HOME: tempDir }
        });
        expect.fail('Expected CLI to throw error for typo');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain("Unknown command: 'histroy'");
        expect(stderr).toContain("Did you mean 'history'?");
        expect(stderr).toContain('pt history');
      }
    });

    it('should suggest "init" for "inti" typo', () => {
      try {
        execSync(`node ${cliPath} inti`, {
          stdio: 'pipe',
          cwd: tempDir,
          env: { ...process.env, HOME: tempDir }
        });
        expect.fail('Expected CLI to throw error for typo');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain("Unknown command: 'inti'");
        expect(stderr).toContain("Did you mean 'init'?");
      }
    });

    it('should suggest "annotate" for "anotate" typo', () => {
      try {
        execSync(`node ${cliPath} anotate`, {
          stdio: 'pipe',
          cwd: tempDir,
          env: { ...process.env, HOME: tempDir }
        });
        expect.fail('Expected CLI to throw error for typo');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain("Unknown command: 'anotate'");
        expect(stderr).toContain("Did you mean 'annotate'?");
      }
    });

    it('should not suggest commands for completely unrelated input', () => {
      try {
        execSync(`node ${cliPath} xyz123456`, {
          stdio: 'pipe',
          cwd: tempDir,
          env: { ...process.env, HOME: tempDir }
        });
        expect.fail('Expected CLI to throw error for unknown command');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain("Unknown command: 'xyz123456'");
        expect(stderr).not.toContain("Did you mean");
        expect(stderr).toContain('Available commands:');
      }
    });

    it('should list all available commands in suggestion', () => {
      try {
        execSync(`node ${cliPath} foobar`, {
          stdio: 'pipe',
          cwd: tempDir,
          env: { ...process.env, HOME: tempDir }
        });
        expect.fail('Expected CLI to throw error for unknown command');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain('init');
        expect(stderr).toContain('history');
        expect(stderr).toContain('add');
        expect(stderr).toContain('edit');
        expect(stderr).toContain('run');
        expect(stderr).toContain('annotate');
        expect(stderr).toContain('install');
        expect(stderr).toContain('review');
        expect(stderr).toContain('help');
      }
    });
  });
});
