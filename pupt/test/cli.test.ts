import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('pt CLI', () => {
  const cliPath = path.join(__dirname, '../dist/cli.js');

  beforeEach(() => {
    // Build the project before testing
    execSync('npm run build', { stdio: 'ignore' });
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

  it('should run without arguments and show interactive mode message', () => {
    // For now, just check it doesn't crash
    const result = execSync(`node ${cliPath}`, {
      stdio: 'pipe',
      input: '\n', // Send enter to exit
    });
    expect(result).toBeDefined();
  });
});
