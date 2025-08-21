import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import crypto from 'crypto';

export class TestEnvironment {
  private tempDir: string = '';
  
  async setup(): Promise<void> {
    this.tempDir = await fs.mkdtemp(path.join(tmpdir(), 'pt-test-'));
  }
  
  async cleanup(): Promise<void> {
    if (this.tempDir) {
      await fs.remove(this.tempDir);
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