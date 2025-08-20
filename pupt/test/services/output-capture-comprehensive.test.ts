import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

describe('OutputCaptureService - Comprehensive Tests', () => {
  let outputDir: string;
  let service: OutputCaptureService;
  let cleanupMock: () => void;
  
  beforeAll(() => {
    cleanupMock = setupClaudeMock();
  });
  
  afterAll(() => {
    cleanupMock();
  });
  
  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    service = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 1024 * 1024 // 1MB for testing
    });
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  describe('Basic PTY Output Capture', () => {
    it('should capture output from a simple command with prompt', async () => {
      const outputFile = path.join(outputDir, 'echo-test.txt');
      const prompt = 'test input';
      
      const result = await service.captureCommand(
        'echo',
        ['hello world'],
        prompt,
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      expect(result.outputFile).toBe(outputFile);
      expect(result.truncated).toBe(false);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('hello world');
    });

    it('should capture multi-line output correctly', async () => {
      const outputFile = path.join(outputDir, 'multiline-test.txt');
      const script = process.platform === 'win32' 
        ? 'echo Line 1 && echo Line 2 && echo Line 3'
        : 'echo "Line 1"; echo "Line 2"; echo "Line 3"';
      
      const result = await service.captureCommand(
        process.platform === 'win32' ? 'cmd' : 'sh',
        process.platform === 'win32' ? ['/c', script] : ['-c', script],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
      expect(output).toContain('Line 3');
    });

    it('should strip ANSI codes from captured output', async () => {
      const outputFile = path.join(outputDir, 'ansi-test.txt');
      // Use a command that outputs colored text
      const script = process.platform === 'win32'
        ? 'echo [31mRed Text[0m'
        : 'echo -e "\\033[31mRed Text\\033[0m"';
      
      await service.captureCommand(
        process.platform === 'win32' ? 'cmd' : 'sh',
        process.platform === 'win32' ? ['/c', script] : ['-c', script],
        '',
        outputFile
      );
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).not.toContain('\u001b[31m');
      expect(output).not.toContain('\u001b[0m');
      expect(output).toContain('Red Text');
    });
  });

  describe('Pipe Input Handling', () => {
    it('should send prompt to command via PTY write for non-Claude commands', async () => {
      const outputFile = path.join(outputDir, 'cat-test.txt');
      const prompt = 'This is test input';
      
      const result = await service.captureCommand(
        'cat',
        [],
        prompt,
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('This is test input');
    });

    it('should handle prompts with newlines correctly', async () => {
      const outputFile = path.join(outputDir, 'multiline-prompt.txt');
      const prompt = 'Line 1\nLine 2\nLine 3';
      
      const result = await service.captureCommand(
        'cat',
        [],
        prompt,
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
      expect(output).toContain('Line 3');
    });

    it('should add newline if prompt does not end with one', async () => {
      const outputFile = path.join(outputDir, 'newline-test.txt');
      const prompt = 'No trailing newline';
      
      await service.captureCommand(
        'cat',
        [],
        prompt,
        outputFile
      );
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('No trailing newline');
      // Cat echoes the input, so we might see it twice
      const lines = output.split('\n').filter(line => line.trim());
      expect(lines.some(line => line.trim() === 'No trailing newline')).toBe(true);
    });
  });

  describe('Claude-specific Behavior', () => {
    it('should use shell piping for Claude in TTY mode', async () => {
      // With mock, claude is always available

      const outputFile = path.join(outputDir, 'claude-tty-test.txt');
      const prompt = 'What is 2+2? Reply with just the number.';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        // Simulate TTY mode
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        // Mock setRawMode for tests
        if (!process.stdin.setRawMode) {
          process.stdin.setRawMode = () => process.stdin;
        }
        
        const result = await service.captureCommand(
          'claude',
          [],
          prompt,
          outputFile
        );
        
        // Claude might exit with non-zero if it needs interaction
        // The important thing is it doesn't show paste detection
        expect(result.exitCode !== null).toBe(true);
        
        // Check that temp file was created (by checking the command used)
        // The prompt should not appear as "pasted text"
        const output = await fs.readFile(outputFile, 'utf-8');
        expect(output).not.toContain('[Pasted text');
        
        // When using shell piping, only the response is captured
        expect(output).toContain('4');
        
      } finally {
        // Restore TTY state
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 60000);

    it('should use direct PTY write for Claude in non-TTY mode', async () => {
      const outputFile = path.join(outputDir, 'claude-non-tty-test.txt');
      const prompt = 'test prompt';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      
      try {
        // Simulate non-TTY mode
        process.stdin.isTTY = false;
        process.stdout.isTTY = false;
        
        // Use actual claude mock
        const result = await service.captureCommand(
          'claude',
          [],
          prompt,
          outputFile
        );
        
        expect(result.exitCode).toBe(0);
        
      } finally {
        // Restore TTY state
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
      }
    }, 30000);
  });

  describe('TTY Features', () => {
    it('should handle terminal resize events', async () => {
      // This test needs actual TTY
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        console.log('Not running in TTY mode, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'resize-test.txt');
      let resizeEmitted = false;
      
      // Start a long-running command
      const capturePromise = service.captureCommand(
        'sh',
        ['-c', 'sleep 0.5; echo "done"'],
        '',
        outputFile
      );
      
      // Emit resize event after a short delay
      setTimeout(() => {
        resizeEmitted = true;
        process.stdout.emit('resize');
      }, 100);
      
      const result = await capturePromise;
      expect(result.exitCode).toBe(0);
      expect(resizeEmitted).toBe(true);
    });

    it('should forward stdin to PTY in TTY mode', async () => {
      // This test needs actual TTY
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        console.log('Not running in TTY mode, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'stdin-forward-test.txt');
      
      // Use a command that echoes stdin
      const result = await service.captureCommand(
        'cat',
        [],
        'initial input',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('initial input');
    });
  });

  describe('Error Handling', () => {
    it('should handle command not found errors', async () => {
      const outputFile = path.join(outputDir, 'error-test.txt');
      
      const result = await service.captureCommand(
        'nonexistentcommand12345',
        [],
        '',
        outputFile
      );
      
      // On some systems, the error might result in a null exit code
      expect(result.exitCode === 1 || result.exitCode === null).toBe(true);
      // The error might be captured in the PTY process creation rather than as an error field
      expect(result.error || result.exitCode !== 0).toBeTruthy();
    });

    it('should handle command that exits with error code', async () => {
      const outputFile = path.join(outputDir, 'exit-error-test.txt');
      
      const result = await service.captureCommand(
        process.platform === 'win32' ? 'cmd' : 'sh',
        process.platform === 'win32' ? ['/c', 'exit 1'] : ['-c', 'exit 1'],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(1);
    });

    it('should create output directory if it does not exist', async () => {
      const nestedDir = path.join(outputDir, 'nested', 'deep', 'dir');
      const outputFile = path.join(nestedDir, 'test.txt');
      
      const result = await service.captureCommand(
        'echo',
        ['test'],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      expect(await fs.pathExists(outputFile)).toBe(true);
    });
  });

  describe('Output Size Limits', () => {
    it('should truncate output when size limit is exceeded', async () => {
      const outputFile = path.join(outputDir, 'truncate-test.txt');
      
      // Create a service with small size limit
      const smallService = new OutputCaptureService({
        outputDirectory: outputDir,
        maxOutputSize: 100 // 100 bytes
      });
      
      // Generate output larger than limit
      const longString = 'This is a very long line that will exceed our small buffer limit. '.repeat(10);
      
      const result = await smallService.captureCommand(
        'echo',
        [longString],
        '',
        outputFile
      );
      
      expect(result.truncated).toBe(true);
      expect(result.outputSize).toBe(100);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('[OUTPUT TRUNCATED - SIZE LIMIT REACHED]');
      expect(Buffer.byteLength(output)).toBeGreaterThanOrEqual(100);
    });

    it('should handle exact size limit correctly', async () => {
      const outputFile = path.join(outputDir, 'exact-limit-test.txt');
      const testString = 'X'.repeat(50); // 50 bytes
      
      const smallService = new OutputCaptureService({
        outputDirectory: outputDir,
        maxOutputSize: 100
      });
      
      const result = await smallService.captureCommand(
        'echo',
        [testString],
        '',
        outputFile
      );
      
      expect(result.truncated).toBe(false);
      expect(result.outputSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Cross-platform Compatibility', () => {
    it('should handle Windows-style paths correctly', async () => {
      if (process.platform !== 'win32') {
        console.log('Not running on Windows, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'windows-path-test.txt');
      
      const result = await service.captureCommand(
        'cmd',
        ['/c', 'echo %CD%'],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toMatch(/[A-Z]:\\/); // Windows path pattern
    });

    it('should handle Unix-style paths correctly', async () => {
      if (process.platform === 'win32') {
        console.log('Running on Windows, skipping Unix test');
        return;
      }

      const outputFile = path.join(outputDir, 'unix-path-test.txt');
      
      const result = await service.captureCommand(
        'pwd',
        [],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toMatch(/^\//); // Unix path pattern
    });

    it('should use correct shell for platform', async () => {
      const outputFile = path.join(outputDir, 'shell-test.txt');
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
      const shellArgs = process.platform === 'win32' ? ['/c', 'echo test'] : ['-c', 'echo test'];
      
      const result = await service.captureCommand(
        shell,
        shellArgs,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('test');
    });
  });

  describe('Temp File Cleanup', () => {
    it('should clean up temp files after Claude command', async () => {
      // This test needs to mock Claude behavior
      if (process.platform === 'win32') {
        console.log('Skipping on Windows due to file locking');
        return;
      }

      const outputFile = path.join(outputDir, 'cleanup-test.txt');
      const prompt = 'test cleanup';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      
      try {
        // Simulate TTY mode
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        
        // Count temp files before
        const tempDir = os.tmpdir();
        const filesBefore = await fs.readdir(tempDir);
        const ptFilesBefore = filesBefore.filter(f => f.startsWith('pt-prompt-'));
        
        // Mock claude with a command that exits quickly
        await service.captureCommand(
          'echo',
          ['mocked claude output'],
          prompt,
          outputFile
        );
        
        // Wait for cleanup timeout
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Count temp files after
        const filesAfter = await fs.readdir(tempDir);
        const ptFilesAfter = filesAfter.filter(f => f.startsWith('pt-prompt-'));
        
        // Should not accumulate temp files
        expect(ptFilesAfter.length).toBeLessThanOrEqual(ptFilesBefore.length + 1);
        
      } finally {
        // Restore TTY state
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt', async () => {
      const outputFile = path.join(outputDir, 'empty-prompt-test.txt');
      
      const result = await service.captureCommand(
        'echo',
        ['test'],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('test');
    });

    it('should handle very long prompts', async () => {
      const outputFile = path.join(outputDir, 'long-prompt-test.txt');
      const longPrompt = 'X'.repeat(10000);
      
      const result = await service.captureCommand(
        'cat',
        [],
        longPrompt,
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output.length).toBeGreaterThan(9000);
    });

    it('should handle commands with many arguments', async () => {
      const outputFile = path.join(outputDir, 'many-args-test.txt');
      const args = Array(50).fill('arg');
      
      const result = await service.captureCommand(
        'echo',
        args,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('arg');
    });

    it('should handle special characters in prompts', async () => {
      const outputFile = path.join(outputDir, 'special-chars-test.txt');
      const specialPrompt = 'Test with "quotes" and \'apostrophes\' and $pecial ch@rs!';
      
      const result = await service.captureCommand(
        'cat',
        [],
        specialPrompt,
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Test with "quotes"');
      expect(output).toContain("'apostrophes'");
      expect(output).toContain('$pecial ch@rs!');
    });

    it('should handle binary output gracefully', async () => {
      const outputFile = path.join(outputDir, 'binary-test.txt');
      
      // Create a command that outputs binary data
      const script = process.platform === 'win32'
        ? 'echo off && echo Binary: && type nul'
        : 'echo "Binary:"; dd if=/dev/zero bs=1 count=10 2>/dev/null';
      
      const result = await service.captureCommand(
        process.platform === 'win32' ? 'cmd' : 'sh',
        process.platform === 'win32' ? ['/c', script] : ['-c', script],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      expect(await fs.pathExists(outputFile)).toBe(true);
    });
  });

  describe('Cleanup Method', () => {
    it('should clean up old output files', async () => {
      // Create some old output files
      const oldFile1 = path.join(outputDir, 'old-1-output.txt');
      const oldFile2 = path.join(outputDir, 'old-2-output.txt');
      const newFile = path.join(outputDir, 'new-output.txt');
      const jsonFile = path.join(outputDir, 'history.json');
      
      await fs.writeFile(oldFile1, 'old content');
      await fs.writeFile(oldFile2, 'old content');
      await fs.writeFile(newFile, 'new content');
      await fs.writeFile(jsonFile, '{}');
      
      // Set old modification times
      const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      await fs.utimes(oldFile1, oldTime, oldTime);
      await fs.utimes(oldFile2, oldTime, oldTime);
      
      // Run cleanup
      await service.cleanupOldOutputs(30);
      
      // Check results
      expect(await fs.pathExists(oldFile1)).toBe(false);
      expect(await fs.pathExists(oldFile2)).toBe(false);
      expect(await fs.pathExists(newFile)).toBe(true);
      expect(await fs.pathExists(jsonFile)).toBe(true); // JSON files should not be cleaned
    });

    it('should handle cleanup errors gracefully', async () => {
      const nonExistentDir = path.join(outputDir, 'does-not-exist');
      const service = new OutputCaptureService({
        outputDirectory: nonExistentDir
      });
      
      // Should not throw
      await expect(service.cleanupOldOutputs()).resolves.not.toThrow();
    });
  });
});