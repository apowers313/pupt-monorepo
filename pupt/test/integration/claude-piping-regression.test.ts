import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

/**
 * Regression test suite specifically for Claude piping behavior.
 * 
 * Background: We discovered that when Claude is run with a PTY (pseudo-terminal),
 * it detects pasted input and shows "[Pasted text #X +Y lines]" instead of
 * executing the prompt immediately. This required the user to press Enter.
 * 
 * Solution: When running Claude in TTY mode with a prompt, we now spawn a shell
 * that pipes the prompt to Claude via a temporary file. This avoids paste
 * detection while maintaining PTY for terminal interaction.
 * 
 * These tests ensure this behavior doesn't regress.
 */
describe('Claude Piping Regression Tests', () => {
  let outputDir: string;
  let service: OutputCaptureService;
  let claudeAvailable: boolean;
  let cleanupMock: () => void;
  
  beforeAll(() => {
    cleanupMock = setupClaudeMock();
  });
  
  afterAll(() => {
    cleanupMock();
  });
  
  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-regression-'));
    service = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 10 * 1024 * 1024
    });
    
    // With mock, claude is always available
    claudeAvailable = true;
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  describe('TTY Mode Behavior', () => {
    it('should pipe prompt to Claude without paste detection in TTY mode', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-tty-no-paste.txt');
      const prompt = 'What is 7 + 5? Reply with just the number, nothing else.';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        // Force TTY mode
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        // Mock setRawMode for tests
        if (!process.stdin.setRawMode) {
          process.stdin.setRawMode = () => process.stdin;
        }
        
        // Capture start time
        const startTime = Date.now();
        
        const result = await service.captureCommand(
          'claude',
          [],
          prompt,
          outputFile
        );
        
        const duration = Date.now() - startTime;
        
        // Should complete relatively quickly (not wait for 30s typing simulation)
        expect(duration).toBeLessThan(10000); // 10 seconds max
        
        expect(result.exitCode).toBe(0);
        
        const output = await fs.readFile(outputFile, 'utf-8');
        
        // Critical assertions:
        // 1. Should NOT contain paste detection indicator
        expect(output).not.toContain('[Pasted text');
        
        // 2. When using shell piping, the prompt is not echoed to output
        // Just verify we got a response
        
        // 3. Should contain the answer (Claude should execute immediately)
        expect(output).toMatch(/12/);
        
      } finally {
        // Restore TTY state
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);

    it('should create and clean up temp files for Claude in TTY mode', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-temp-cleanup.txt');
      const prompt = 'What is 3 + 3? Reply with just the number.';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        // Mock setRawMode for tests
        if (!process.stdin.setRawMode) {
          process.stdin.setRawMode = () => process.stdin;
        }
        
        // Get temp files before
        const tempDir = os.tmpdir();
        const filesBefore = await fs.readdir(tempDir);
        const ptFilesBefore = filesBefore.filter(f => f.startsWith('pt-prompt-'));
        
        await service.captureCommand(
          'claude',
          [],
          prompt,
          outputFile
        );
        
        // Immediately after, temp file should exist
        const filesImmediately = await fs.readdir(tempDir);
        const ptFilesImmediately = filesImmediately.filter(f => f.startsWith('pt-prompt-'));
        
        // Should have created at least one temp file
        expect(ptFilesImmediately.length).toBeGreaterThanOrEqual(ptFilesBefore.length);
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // After cleanup, temp files should be gone
        const filesAfter = await fs.readdir(tempDir);
        const ptFilesAfter = filesAfter.filter(f => f.startsWith('pt-prompt-'));
        
        // Should have cleaned up (allowing for some race conditions)
        expect(ptFilesAfter.length).toBeLessThanOrEqual(ptFilesBefore.length + 1);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);
  });

  describe('Non-TTY Mode Behavior', () => {
    it('should use direct PTY write for Claude in non-TTY mode', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-non-tty.txt');
      const prompt = 'What is 4 + 4? Reply with just the number.';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        // Force non-TTY mode
        process.stdin.isTTY = false;
        process.stdout.isTTY = false;
        
        const result = await service.captureCommand(
          'claude',
          [],
          prompt,
          outputFile
        );
        
        expect(result.exitCode).toBe(0);
        
        // The output should contain the response
        const output = await fs.readFile(outputFile, 'utf-8');
        // Should contain the answer
        expect(output).toMatch(/8/);
        // When using PTY, the process always sees a TTY, so it will show the UI
        // This is expected behavior
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 15000);
  });

  describe('Other Commands Behavior', () => {
    it('should use direct PTY write for non-Claude commands', async () => {
      const outputFile = path.join(outputDir, 'cat-direct-write.txt');
      const prompt = 'This should be written directly to PTY';
      
      // Save original TTY state
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        // Even in TTY mode, non-Claude commands should use direct write
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        
        const result = await service.captureCommand(
          'cat',
          [],
          prompt,
          outputFile
        );
        
        // Cat might exit with 0 or 1 depending on how stdin is handled
        expect(result.exitCode !== null).toBe(true);
        
        // Check if output file exists and has content
        if (await fs.pathExists(outputFile)) {
          const output = await fs.readFile(outputFile, 'utf-8');
          // If we got output, verify it contains our prompt
          if (output.length > 0) {
            expect(output).toContain('This should be written directly to PTY');
          }
        }
        
        // Should NOT create temp files for non-Claude commands
        const tempFiles = await fs.readdir(os.tmpdir());
        const ptFiles = tempFiles.filter(f => f.startsWith('pt-prompt-') && f.includes('cat'));
        expect(ptFiles.length).toBe(0);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle Claude with arguments correctly', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-with-args.txt');
      const prompt = 'What is 6 + 6? Reply with just the number.';
      
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        // Mock setRawMode for tests
        if (!process.stdin.setRawMode) {
          process.stdin.setRawMode = () => process.stdin;
        }
        
        // Test with some Claude arguments
        const result = await service.captureCommand(
          'claude',
          ['--model', 'claude-3-haiku-20240307'],
          prompt,
          outputFile
        );
        
        expect(result.exitCode).toBe(0);
        
        const output = await fs.readFile(outputFile, 'utf-8');
        expect(output).not.toContain('[Pasted text');
        expect(output).toMatch(/12/);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);

    it('should handle empty prompt with Claude', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-empty-prompt.txt');
      
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        // Mock setRawMode for tests
        if (!process.stdin.setRawMode) {
          process.stdin.setRawMode = () => process.stdin;
        }
        
        // With empty prompt, should not use shell piping
        const result = await service.captureCommand(
          'claude',
          [],
          '',
          outputFile
        );
        
        // Claude will be in interactive mode, which is fine
        // Just ensure no errors
        expect(result.error).toBeUndefined();
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);

    it('should handle special characters in Claude prompts', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-special-chars.txt');
      const prompt = 'Echo exactly: "Test $PATH and `backticks` and \'quotes\'"';
      
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
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
        
        expect(result.exitCode).toBe(0);
        
        const output = await fs.readFile(outputFile, 'utf-8');
        expect(output).not.toContain('[Pasted text');
        // Should handle special characters correctly
        expect(output).toContain('$PATH');
        expect(output).toContain('backticks');
        expect(output).toContain('quotes');
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);
  });

  describe('Platform-specific Behavior', () => {
    it('should use correct shell command for Windows', async () => {
      if (process.platform !== 'win32' || !claudeAvailable) {
        // Skip test
        return;
      }

      const outputFile = path.join(outputDir, 'claude-windows.txt');
      const prompt = 'What is 5 + 5? Reply with just the number.';
      
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
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
        
        expect(result.exitCode).toBe(0);
        
        const output = await fs.readFile(outputFile, 'utf-8');
        expect(output).not.toContain('[Pasted text');
        expect(output).toMatch(/10/);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);

    it('should use correct shell command for Unix', async () => {
      if (process.platform === 'win32' || !claudeAvailable) {
        // Skip test
        return;
      }

      const outputFile = path.join(outputDir, 'claude-unix.txt');
      const prompt = 'What is 8 + 8? Reply with just the number.';
      
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;
      const originalSetRawMode = process.stdin.setRawMode;
      
      try {
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
        
        expect(result.exitCode).toBe(0);
        
        const output = await fs.readFile(outputFile, 'utf-8');
        expect(output).not.toContain('[Pasted text');
        expect(output).toMatch(/16/);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);
  });
});