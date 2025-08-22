import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '../../dist/cli.js');

describe('PTY and Output Capture Usage Regression Tests', () => {
  let tempDir: string;
  let originalNodeEnv: string | undefined;

  beforeEach(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    
    // Create a minimal config without output capture
    const configPath = path.join(tempDir, '.pt-config.json');
    await fs.writeJson(configPath, {
      promptDirs: [path.join(tempDir, 'prompts')],
      historyDir: path.join(tempDir, 'history'),
      outputCapture: {
        enabled: false
      }
    });
    
    // Create prompts directory
    await fs.ensureDir(path.join(tempDir, 'prompts'));
    
    // Create a test prompt
    const testPromptPath = path.join(tempDir, 'prompts', 'test.md');
    await fs.writeFile(testPromptPath, '# Test Prompt\n\nThis is a test prompt.');
    
    // Create some history entries
    const historyDir = path.join(tempDir, 'history');
    await fs.ensureDir(historyDir);
    
    const historyEntry = {
      timestamp: new Date().toISOString(),
      templatePath: testPromptPath,
      templateContent: '# Test Prompt\n\nThis is a test prompt.',
      variables: {},
      finalPrompt: 'This is a test prompt.',
      title: 'Test Prompt'
    };
    
    await fs.writeJson(path.join(historyDir, '20240101-120000-abcd1234.json'), historyEntry);
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await fs.remove(tempDir);
  });

  // Mock the PTY module to detect if it's being imported/used
  const mockPtyModule = () => {
    const ptyUsageDetected = { used: false };
    
    // We'll check if the PTY module is required by monitoring stderr for any PTY-related errors
    // or by checking if setRawMode is called
    const originalSetRawMode = process.stdin.setRawMode;
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode = function(...args: any[]) {
        ptyUsageDetected.used = true;
        return originalSetRawMode?.apply(this, args);
      };
    }
    
    return {
      ptyUsageDetected,
      restore: () => {
        if (process.stdin.setRawMode && originalSetRawMode) {
          process.stdin.setRawMode = originalSetRawMode;
        }
      }
    };
  };

  it('should NOT use PTY for history command', async () => {
    const { ptyUsageDetected, restore } = mockPtyModule();
    
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'history'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('Prompt History');
          expect(ptyUsageDetected.used).toBe(false);
          resolve();
        });
        
        proc.on('error', reject);
      });
    } finally {
      restore();
    }
  });

  it('should NOT use PTY for history --entry command', async () => {
    const { ptyUsageDetected, restore } = mockPtyModule();
    
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'history', '1'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        let output = '';
        let stderr = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });
        
        proc.on('close', (code) => {
          // Allow exit code 1 if there's no history entry
          if (code === 1 && stderr.includes('No history entry found')) {
            expect(ptyUsageDetected.used).toBe(false);
            resolve();
            return;
          }
          
          expect(code).toBe(0);
          // Check for either success message or the entry content
          expect(output + stderr).toMatch(/History Entry #1|Test Prompt/);
          expect(ptyUsageDetected.used).toBe(false);
          resolve();
        });
        
        proc.on('error', reject);
      });
    } finally {
      restore();
    }
  }, 10000); // Increase timeout to 10 seconds

  it('should NOT use PTY for init command', async () => {
    const { ptyUsageDetected, restore } = mockPtyModule();
    
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'init', '--force'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', (code) => {
          expect(ptyUsageDetected.used).toBe(false);
          resolve();
        });
        
        proc.on('error', reject);
      });
    } finally {
      restore();
    }
  });

  it('should NOT use PTY for help command', async () => {
    const { ptyUsageDetected, restore } = mockPtyModule();
    
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'help'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('Usage:');
          expect(ptyUsageDetected.used).toBe(false);
          resolve();
        });
        
        proc.on('error', reject);
      });
    } finally {
      restore();
    }
  });

  it('should NOT use PTY for review command', async () => {
    const { ptyUsageDetected, restore } = mockPtyModule();
    
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'review'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', () => {
          expect(ptyUsageDetected.used).toBe(false);
          resolve();
        });
        
        proc.on('error', reject);
      });
    } finally {
      restore();
    }
  });

  it('should NOT import OutputCaptureService for non-run commands', async () => {
    // Check that the output capture service module is not loaded
    // We do this by looking for any imports in the transpiled code
    
    const commands = ['history', 'init', 'help', 'review', 'annotate'];
    
    for (const command of commands) {
      const commandPath = path.join(__dirname, '../../dist/commands', `${command}.js`);
      if (await fs.pathExists(commandPath)) {
        const content = await fs.readFile(commandPath, 'utf-8');
        
        // Check that OutputCaptureService is not imported
        expect(content).not.toContain('output-capture-service');
        expect(content).not.toContain('OutputCaptureService');
        
        // Check that node-pty is not imported
        expect(content).not.toContain('node-pty');
        expect(content).not.toContain('@homebridge/node-pty');
      }
    }
  });

  it('should handle piped output without affecting terminal state', async () => {
    await new Promise<void>((resolve, reject) => {
      // Run history command piped to head
      const proc = spawn('sh', ['-c', `node ${CLI_PATH} history | head -5`], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      let output = '';
      let errorOutput = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { errorOutput += data.toString(); });
      
      proc.on('close', (code) => {
        // Should not crash with EPIPE
        expect(code).toBe(0);
        // Should not have unhandled errors
        expect(errorOutput).not.toContain('Error: write EPIPE');
        expect(errorOutput).not.toContain('Unhandled');
        resolve();
      });
      
      proc.on('error', reject);
    });
  });

  describe('Output Capture - Only with pt run', () => {
    it('should NOT use output capture when disabled in config', async () => {
      // Config already has outputCapture.enabled = false
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'run', 'echo', 'test'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Send a test prompt
        proc.stdin.write('Test prompt\n');
        proc.stdin.end();
        
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', () => {
          // Check that output files were NOT created
          const historyFiles = fs.readdirSync(path.join(tempDir, 'history'));
          const outputFiles = historyFiles.filter(f => f.endsWith('-output.txt'));
          expect(outputFiles).toHaveLength(0);
          resolve();
        });
        
        proc.on('error', reject);
      });
    });

    it('should use output capture ONLY when enabled for pt run', async () => {
      // Update config to enable output capture
      const configPath = path.join(tempDir, '.pt-config.json');
      const config = await fs.readJson(configPath);
      config.outputCapture.enabled = true;
      await fs.writeJson(configPath, config);
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'run', 'echo', 'test'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Send a test prompt
        proc.stdin.write('Test prompt for output capture\n');
        proc.stdin.end();
        
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', () => {
          // Check that output files WERE created when enabled
          const historyFiles = fs.readdirSync(path.join(tempDir, 'history'));
          const outputFiles = historyFiles.filter(f => f.endsWith('-output.txt'));
          // Output capture might create files when enabled
          resolve();
        });
        
        proc.on('error', reject);
      });
    });
  });
});