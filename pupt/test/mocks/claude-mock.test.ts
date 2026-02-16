import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Claude Mock', () => {
  // Skip on Windows CI due to missing PTY binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
  let cleanupMock: () => void;

  beforeAll(() => {
    cleanupMock = setupClaudeMock();
  });

  afterAll(() => {
    cleanupMock();
  });

  it.skipIf(skipOnWindowsCI)('should respond to math questions in non-TTY mode', async () => {
    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      const child = spawn('claude', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
        shell: process.platform === 'win32' // Use shell on Windows to find .cmd files
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });

      // Send input
      child.stdin.write('What is 2 + 2?');
      child.stdin.end();
    });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('4');
    expect(result.stderr).toBe('');
  });

  it.skipIf(skipOnWindowsCI)('should handle piped input in TTY mode', async () => {
    const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
      // Use shell to simulate TTY piping
      const shell = process.platform === 'win32' ? 'cmd' : 'sh';
      const shellArgs = process.platform === 'win32' 
        ? ['/c', 'echo "What is 5 + 5?" | claude']
        : ['-c', 'echo "What is 5 + 5?" | claude'];

      const child = spawn(shell, shellArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env
      });

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, code });
      });
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('10');
  });

  it.skipIf(skipOnWindowsCI)('should handle special echo exactly command', async () => {
    const testString = '"Test $PATH and `backticks` and \'quotes\'"';
    const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
      const child = spawn('claude', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
        shell: process.platform === 'win32' // Use shell on Windows to find .cmd files
      });

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, code });
      });

      // Send input
      child.stdin.write(`Echo exactly: ${testString}`);
      child.stdin.end();
    });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(testString);
  });
});