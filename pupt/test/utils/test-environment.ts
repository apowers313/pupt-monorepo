import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

export class TestEnvironment {
  private tempDir: string = '';
  
  async setup(): Promise<void> {
    this.tempDir = await fs.mkdtemp(path.join(tmpdir(), 'pt-test-'));
  }
  
  async cleanup(): Promise<void> {
    if (this.tempDir) {
      // On Windows, file handles may not be released immediately
      // Retry cleanup with exponential backoff
      const maxRetries = 3;
      const baseDelay = 100;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await fs.remove(this.tempDir);
          return; // Success
        } catch (error: unknown) {
          const isLastAttempt = attempt === maxRetries - 1;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isEBUSY = errorMessage.includes('EBUSY') || errorMessage.includes('EPERM');

          if (!isEBUSY || isLastAttempt) {
            // Not a locking issue, or we've exhausted retries - rethrow
            throw error;
          }

          // Wait before retrying (exponential backoff)
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
  
  getPath(...paths: string[]): string {
    return path.join(this.tempDir, ...paths);
  }
  
  async writeConfig(config: unknown): Promise<void> {
    const configPath = this.getPath('.pt-config.json');
    await fs.writeJson(configPath, config, { spaces: 2 });
  }
  
  async runCommand(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
      const child = spawn('node', [cliPath, ...args], {
        cwd: this.tempDir,
        env: { ...process.env, NODE_ENV: 'test' },
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
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
        });
      });
    });
  }
}