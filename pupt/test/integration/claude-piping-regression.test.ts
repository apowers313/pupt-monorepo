import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

/**
 * Regression test suite for Claude stdin handling behavior.
 *
 * Background: Claude CLI requires raw mode access to stdin for its Ink-based
 * interactive UI. Earlier versions had paste detection issues, but newer versions
 * (using Ink) are stricter about requiring a real TTY stdin.
 *
 * Solution: Claude is always spawned directly with PTY, ensuring stdin is a real
 * TTY rather than a pipe. Prompts are written to the PTY after process creation,
 * which allows Claude to maintain raw mode access while still receiving input.
 *
 * These tests ensure this behavior doesn't regress.
 */

// Helper to read JSON output as text
async function readJsonOutputAsText(jsonFile: string): Promise<string> {
  const chunks = await fs.readJson(jsonFile) as Array<{timestamp: string, direction: string, data: string}>;
  return chunks.filter(c => c.direction === 'output').map(c => c.data).join('');
}
describe('Claude Piping Regression Tests', () => {
  let outputDir: string;
  let service: OutputCaptureService;
  let claudeAvailable: boolean;
  let cleanupMock: () => void;
  
  // Skip on Windows CI due to missing PTY binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
  
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
    it.skipIf(skipOnWindowsCI)('should write prompt to Claude with real TTY stdin in TTY mode', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-tty-no-paste.json');
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
        
        const output = await readJsonOutputAsText(outputFile);

        // Critical assertions:
        // 1. Should NOT contain paste detection indicator
        expect(output).not.toContain('[Pasted text');

        // 2. With direct PTY write, Claude should process the prompt correctly
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

    it.skipIf(skipOnWindowsCI)('should NOT create temp files when running Claude in TTY mode', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-no-temp.json');
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

        const result = await service.captureCommand(
          'claude',
          [],
          prompt,
          outputFile
        );

        expect(result.exitCode).toBe(0);

        // Check that no new temp files were created
        const filesAfter = await fs.readdir(tempDir);
        const ptFilesAfter = filesAfter.filter(f => f.startsWith('pt-prompt-'));

        // Should NOT have created temp files (direct PTY write instead of shell piping)
        expect(ptFilesAfter.length).toBe(ptFilesBefore.length);

      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);
  });

  describe('Non-TTY Mode Behavior', () => {
    it.skipIf(skipOnWindowsCI)('should use direct PTY write for Claude in non-TTY mode', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-non-tty.json');
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
        const output = await readJsonOutputAsText(outputFile);
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
      const outputFile = path.join(outputDir, 'cat-direct-write.json');
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
          const output = await readJsonOutputAsText(outputFile);
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
    it.skipIf(skipOnWindowsCI)('should handle Claude with arguments correctly', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-with-args.json');
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
        
        const output = await readJsonOutputAsText(outputFile);
        expect(output).not.toContain('[Pasted text');
        expect(output).toMatch(/12/);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);

    it.skipIf(skipOnWindowsCI)('should handle empty prompt with Claude', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-empty-prompt.json');
      
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

    it.skipIf(skipOnWindowsCI)('should handle special characters in Claude prompts', async () => {
      if (!claudeAvailable) {
        console.log('Claude not available, skipping test');
        return;
      }

      const outputFile = path.join(outputDir, 'claude-special-chars.json');
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
        
        const output = await readJsonOutputAsText(outputFile);
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
    it.skipIf(skipOnWindowsCI)('should handle Claude correctly on Windows', async () => {
      if (process.platform !== 'win32' || !claudeAvailable) {
        // Skip test
        return;
      }

      const outputFile = path.join(outputDir, 'claude-windows.json');
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
        
        const output = await readJsonOutputAsText(outputFile);
        expect(output).not.toContain('[Pasted text');
        expect(output).toMatch(/10/);
        
      } finally {
        process.stdin.isTTY = originalStdinTTY;
        process.stdout.isTTY = originalStdoutTTY;
        process.stdin.setRawMode = originalSetRawMode;
      }
    }, 30000);

    it('should handle Claude correctly on Unix', async () => {
      if (process.platform === 'win32' || !claudeAvailable) {
        // Skip test
        return;
      }

      const outputFile = path.join(outputDir, 'claude-unix.json');
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
        
        const output = await readJsonOutputAsText(outputFile);
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