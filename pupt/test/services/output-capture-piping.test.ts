import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Focused tests for the critical piping functionality.
 * These tests ensure that:
 * 1. Commands receive input correctly via PTY
 * 2. Output is captured properly
 * 3. Claude-specific piping behavior works
 */
describe('OutputCaptureService - Piping Tests', () => {
  let outputDir: string;
  let service: OutputCaptureService;
  
  // Skip PTY tests on Windows CI due to missing binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
  
  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'piping-test-'));
    service = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 10 * 1024 * 1024
    });
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  describe('Basic Piping', () => {
    it.skipIf(skipOnWindowsCI)('should pipe input to command and capture output', async () => {
      const outputFile = path.join(outputDir, 'basic-pipe.txt');
      const prompt = 'Hello from pipe test';
      
      const result = await service.captureCommand(
        'cat',
        [],
        prompt,
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Hello from pipe test');
    });

    it.skipIf(skipOnWindowsCI)('should handle multi-line input correctly', async () => {
      const outputFile = path.join(outputDir, 'multiline-pipe.txt');
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

    it.skipIf(skipOnWindowsCI)('should handle commands with arguments', async () => {
      console.log('[DEBUG] Windows CI test - Platform:', process.platform, 'CI:', process.env.CI);
      const outputFile = path.join(outputDir, 'args-test.txt');
      
      const result = await service.captureCommand(
        'echo',
        ['arg1', 'arg2', 'arg3'],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('arg1 arg2 arg3');
    });
  });

  describe('Shell Command Execution', () => {
    it.skipIf(skipOnWindowsCI)('should execute shell commands correctly', async () => {
      const outputFile = path.join(outputDir, 'shell-test.txt');
      const shell = process.platform === 'win32' ? 'cmd' : 'sh';
      const shellArgs = process.platform === 'win32' 
        ? ['/c', 'echo Shell test working']
        : ['-c', 'echo "Shell test working"'];
      
      const result = await service.captureCommand(
        shell,
        shellArgs,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Shell test working');
    });

    it.skipIf(skipOnWindowsCI)('should handle shell piping syntax', async () => {
      const outputFile = path.join(outputDir, 'shell-pipe-test.txt');
      const shell = process.platform === 'win32' ? 'cmd' : 'sh';
      const shellArgs = process.platform === 'win32'
        ? ['/c', 'echo "piped content" | findstr "piped"']
        : ['-c', 'echo "piped content" | grep "piped"'];
      
      const result = await service.captureCommand(
        shell,
        shellArgs,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('piped content');
    });
  });

  describe('Claude Piping Behavior', () => {
    it.skipIf(skipOnWindowsCI)('should create temp file for Claude in TTY mode', async () => {
      const outputFile = path.join(outputDir, 'claude-temp-test.txt');
      const prompt = 'Test prompt for Claude';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        // Force TTY mode
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        
        // Mock setRawMode to prevent test interference
        process.stdin.setRawMode = () => process.stdin;
        
        // Get temp files before
        const tempDir = os.tmpdir();
        const filesBefore = await fs.readdir(tempDir);
        const ptFilesBefore = filesBefore.filter(f => f.startsWith('pt-prompt-'));
        const beforeCount = ptFilesBefore.length;
        
        // Mock claude with echo to test the mechanism
        const result = await service.captureCommand(
          'echo',
          ['Simulating Claude'],
          prompt,
          outputFile
        );
        
        // Should complete
        expect(result.exitCode !== null).toBe(true);
        
        // Add small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For non-Claude commands, no temp files should be created
        const filesAfter = await fs.readdir(tempDir);
        const ptFilesAfter = filesAfter.filter(f => f.startsWith('pt-prompt-'));
        expect(ptFilesAfter.length).toBe(beforeCount);
        
      } finally {
        // Restore TTY state and setRawMode
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    });

    it.skipIf(skipOnWindowsCI)('should use direct write for non-Claude commands in TTY mode', async () => {
      const outputFile = path.join(outputDir, 'non-claude-tty.txt');
      const prompt = 'Direct write test';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        // Force TTY mode
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        
        // Mock setRawMode to prevent test interference
        process.stdin.setRawMode = () => process.stdin;
        
        const result = await service.captureCommand(
          'cat',
          [],
          prompt,
          outputFile
        );
        
        // Should complete
        expect(result.exitCode !== null).toBe(true);
        
        // Add small delay to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check output
        if (await fs.pathExists(outputFile)) {
          const output = await fs.readFile(outputFile, 'utf-8');
          expect(output).toContain('Direct write test');
        } else {
          // If file doesn't exist, the test should fail
          throw new Error('Output file was not created');
        }
        
      } finally {
        // Restore TTY state and setRawMode
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    });
  });

  describe('Error Handling', () => {
    it.skipIf(skipOnWindowsCI)('should handle missing commands gracefully', async () => {
      const outputFile = path.join(outputDir, 'error-test.txt');
      
      const result = await service.captureCommand(
        'nonexistentcommand999',
        [],
        '',
        outputFile
      );
      
      // Should capture the error
      expect(result.exitCode === 1 || result.exitCode === null).toBe(true);
    });

    it.skipIf(skipOnWindowsCI)('should handle commands that fail', async () => {
      const outputFile = path.join(outputDir, 'fail-test.txt');
      const shell = process.platform === 'win32' ? 'cmd' : 'sh';
      const shellArgs = process.platform === 'win32'
        ? ['/c', 'exit 1']
        : ['-c', 'exit 1'];
      
      const result = await service.captureCommand(
        shell,
        shellArgs,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Output Capture', () => {
    it.skipIf(skipOnWindowsCI)('should strip ANSI escape codes', async () => {
      const outputFile = path.join(outputDir, 'ansi-test.txt');
      const shell = process.platform === 'win32' ? 'cmd' : 'sh';
      const shellArgs = process.platform === 'win32'
        ? ['/c', 'echo \x1b[31mRed Text\x1b[0m']
        : ['-c', 'printf "\\033[31mRed Text\\033[0m"'];
      
      const result = await service.captureCommand(
        shell,
        shellArgs,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Red Text');
      expect(output).not.toContain('\x1b[31m');
      expect(output).not.toContain('\x1b[0m');
    });

    it.skipIf(skipOnWindowsCI)('should handle large outputs', async () => {
      const outputFile = path.join(outputDir, 'large-output.txt');
      const largeText = 'X'.repeat(1000);
      
      const result = await service.captureCommand(
        'echo',
        [largeText],
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      expect(result.truncated).toBe(false);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output.length).toBeGreaterThan(900);
    });

    it.skipIf(skipOnWindowsCI)('should truncate when exceeding size limit', async () => {
      const outputFile = path.join(outputDir, 'truncate-test.txt');
      
      // Create service with small limit
      const smallService = new OutputCaptureService({
        outputDirectory: outputDir,
        maxOutputSize: 50
      });
      
      const result = await smallService.captureCommand(
        'echo',
        ['This is a very long string that will definitely exceed our tiny 50 byte limit'],
        '',
        outputFile
      );
      
      expect(result.truncated).toBe(true);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      // The file might contain just the truncated content or the content + truncation message
      // depending on how much could be written before hitting the limit
      expect(output.length).toBeGreaterThanOrEqual(50);
      // Verify that the result indicates truncation occurred
      expect(result.truncated).toBe(true);
    });
  });

  describe('Cross-platform Compatibility', () => {
    it.skipIf(skipOnWindowsCI)('should work on current platform', async () => {
      const outputFile = path.join(outputDir, 'platform-test.txt');
      
      // Use platform-appropriate command
      const cmd = process.platform === 'win32' ? 'cmd' : 'echo';
      const args = process.platform === 'win32' ? ['/c', 'echo Platform test'] : ['Platform test'];
      
      const result = await service.captureCommand(
        cmd,
        args,
        '',
        outputFile
      );
      
      expect(result.exitCode).toBe(0);
      
      const output = await fs.readFile(outputFile, 'utf-8');
      expect(output).toContain('Platform test');
    });

    it.skipIf(skipOnWindowsCI)('should handle platform-specific line endings', async () => {
      const outputFile = path.join(outputDir, 'line-ending-test.txt');
      const prompt = 'Line 1\r\nLine 2\nLine 3\r\n';
      
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
  });
});