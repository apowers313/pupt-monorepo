import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractUserInputLines,
  calculateActiveExecutionTime,
  OutputCaptureService
} from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('OutputCaptureService - Pure Function Coverage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `pt-output-coverage-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('extractUserInputLines', () => {
    it('should extract user input lines from JSON output', async () => {
      const jsonFile = path.join(tempDir, 'test-output.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'Enter your name: ' },
        { timestamp: '2000000000', direction: 'input', data: 'John\n' },
        { timestamp: '3000000000', direction: 'output', data: 'Hello, John!\n' },
        { timestamp: '4000000000', direction: 'input', data: 'exit\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await extractUserInputLines(jsonFile);
      expect(result).toEqual(['John', 'exit']);
    });

    it('should return empty array when no input chunks', async () => {
      const jsonFile = path.join(tempDir, 'no-input.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'Hello, World!\n' },
        { timestamp: '2000000000', direction: 'output', data: 'Goodbye!\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await extractUserInputLines(jsonFile);
      expect(result).toEqual([]);
    });

    it('should filter out empty input lines', async () => {
      const jsonFile = path.join(tempDir, 'empty-input.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'Prompt: ' },
        { timestamp: '2000000000', direction: 'input', data: '\n' },
        { timestamp: '3000000000', direction: 'input', data: '   \n' },
        { timestamp: '4000000000', direction: 'input', data: 'actual input\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await extractUserInputLines(jsonFile);
      expect(result).toEqual(['actual input']);
    });

    it('should handle empty chunks array', async () => {
      const jsonFile = path.join(tempDir, 'empty.json');
      await fs.writeJson(jsonFile, []);

      const result = await extractUserInputLines(jsonFile);
      expect(result).toEqual([]);
    });
  });

  describe('calculateActiveExecutionTime', () => {
    it('should return 0 for empty chunks', async () => {
      const jsonFile = path.join(tempDir, 'empty-calc.json');
      await fs.writeJson(jsonFile, []);

      const result = await calculateActiveExecutionTime(jsonFile);
      expect(result).toBe(0n);
    });

    it('should calculate total time for output-only chunks', async () => {
      const jsonFile = path.join(tempDir, 'output-only.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'line 1\n' },
        { timestamp: '2000000000', direction: 'output', data: 'line 2\n' },
        { timestamp: '3000000000', direction: 'output', data: 'line 3\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await calculateActiveExecutionTime(jsonFile);
      // Time between chunks: (2000000000 - 1000000000) + (3000000000 - 2000000000) = 2000000000
      expect(result).toBe(2000000000n);
    });

    it('should exclude user thinking time for input->output transitions', async () => {
      const jsonFile = path.join(tempDir, 'with-input.json');
      // The threshold is 100_000_000 nanoseconds (0.1 seconds)
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'Enter value: ' },
        { timestamp: '2000000000', direction: 'input', data: 'hello\n' },
        // Large gap after input (5 seconds of user thinking)
        { timestamp: '7000000000', direction: 'output', data: 'You entered: hello\n' },
        { timestamp: '8000000000', direction: 'output', data: 'Done!\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await calculateActiveExecutionTime(jsonFile);
      // Chunk 1 -> 2: 1000000000 (normal time)
      // Chunk 2 -> 3: 5000000000 but it's input->output with gap > threshold,
      //   so we use threshold instead: 100000000
      // Chunk 3 -> 4: 1000000000 (normal time)
      // Total: 1000000000 + 100000000 + 1000000000 = 2100000000
      expect(result).toBe(2100000000n);
    });

    it('should not exclude time when gap is below threshold', async () => {
      const jsonFile = path.join(tempDir, 'small-gap.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'Enter value: ' },
        { timestamp: '1050000000', direction: 'input', data: 'y\n' },
        // Small gap (50ms from input, but lastOutputTime is chunk[0])
        { timestamp: '1100000000', direction: 'output', data: 'Confirmed\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await calculateActiveExecutionTime(jsonFile);
      // Chunk 0 -> 1: timeDiff = 50000000, direction='input', normal processing: +50000000
      //   lastOutputTime stays at 1000000000 (not updated for input)
      // Chunk 1 -> 2: timeDiff = 1100000000 - 1000000000 = 100000000 (from lastOutputTime)
      //   direction='output', prev='input', but 100000000 is NOT > 100000000 (equal, not greater)
      //   so normal processing: +100000000
      // Total: 50000000 + 100000000 = 150000000
      expect(result).toBe(150000000n);
    });

    it('should handle single chunk', async () => {
      const jsonFile = path.join(tempDir, 'single.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'only line\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      const result = await calculateActiveExecutionTime(jsonFile);
      // Only one chunk, no time diffs to compute
      expect(result).toBe(0n);
    });

    it('should handle custom inputWaitThreshold', async () => {
      const jsonFile = path.join(tempDir, 'custom-threshold.json');
      const chunks = [
        { timestamp: '1000000000', direction: 'output', data: 'Prompt: ' },
        { timestamp: '2000000000', direction: 'input', data: 'val\n' },
        // 500ms gap
        { timestamp: '2500000000', direction: 'output', data: 'Result\n' },
      ];
      await fs.writeJson(jsonFile, chunks);

      // With a very small threshold (1ns), the input->output gap should be capped
      const result = await calculateActiveExecutionTime(jsonFile, 1n);
      // Chunk 1 -> 2: 1000000000 (normal)
      // Chunk 2 -> 3: 500000000 but input->output gap > 1n threshold, so use 1n
      // Total: 1000000000 + 1 = 1000000001
      expect(result).toBe(1000000001n);
    });
  });

  describe('cleanupOldOutputs', () => {
    it('should delete old .txt output files beyond retention period', async () => {
      const service = new OutputCaptureService({ outputDirectory: tempDir });

      const oldFile = path.join(tempDir, '20250101-test-output.txt');
      const recentFile = path.join(tempDir, '20250201-test-output.txt');
      const otherFile = path.join(tempDir, 'not-an-output.txt');

      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      await fs.writeFile(oldFile, 'old');
      await fs.writeFile(recentFile, 'recent');
      await fs.writeFile(otherFile, 'other');
      await fs.utimes(oldFile, oldDate, oldDate);

      await service.cleanupOldOutputs(30);

      expect(await fs.pathExists(oldFile)).toBe(false);
      expect(await fs.pathExists(recentFile)).toBe(true);
      expect(await fs.pathExists(otherFile)).toBe(true); // not matching -output.txt pattern
    });

    it('should delete old .json output files beyond retention period', async () => {
      const service = new OutputCaptureService({ outputDirectory: tempDir });

      const oldJson = path.join(tempDir, '20250101-test-output.json');
      const recentJson = path.join(tempDir, '20250201-test-output.json');
      const regularJson = path.join(tempDir, 'config.json');

      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

      await fs.writeFile(oldJson, '[]');
      await fs.writeFile(recentJson, '[]');
      await fs.writeFile(regularJson, '{}');
      await fs.utimes(oldJson, oldDate, oldDate);

      await service.cleanupOldOutputs(30);

      expect(await fs.pathExists(oldJson)).toBe(false);
      expect(await fs.pathExists(recentJson)).toBe(true);
      expect(await fs.pathExists(regularJson)).toBe(true); // not matching -output.json pattern
    });

    it('should not delete files within retention period', async () => {
      const service = new OutputCaptureService({ outputDirectory: tempDir });

      const recentFile = path.join(tempDir, '20250201-test-output.txt');
      await fs.writeFile(recentFile, 'recent');

      await service.cleanupOldOutputs(30);

      expect(await fs.pathExists(recentFile)).toBe(true);
    });

    it('should handle non-existent output directory gracefully', async () => {
      const service = new OutputCaptureService({
        outputDirectory: path.join(tempDir, 'nonexistent-subdir')
      });

      // Should not throw
      await expect(service.cleanupOldOutputs(30)).resolves.toBeUndefined();
    });

    it('should skip cleanup when outputDirectory is not set', async () => {
      // Pass undefined outputDirectory
      const service = new OutputCaptureService({});
      // The constructor defaults to './.history', but let's test the falsy path
      // by directly testing the method behavior - it creates the dir if needed
      await expect(service.cleanupOldOutputs(30)).resolves.toBeUndefined();
    });

    it('should respect custom retention days', async () => {
      const service = new OutputCaptureService({ outputDirectory: tempDir });

      const file10DaysOld = path.join(tempDir, 'ten-days-output.txt');
      const date10Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      await fs.writeFile(file10DaysOld, 'data');
      await fs.utimes(file10DaysOld, date10Days, date10Days);

      // With 5-day retention, a 10-day-old file should be deleted
      await service.cleanupOldOutputs(5);
      expect(await fs.pathExists(file10DaysOld)).toBe(false);
    });

    it('should keep file with custom retention when file is newer than retention', async () => {
      const service = new OutputCaptureService({ outputDirectory: tempDir });

      const file10DaysOld = path.join(tempDir, 'ten-days-output.txt');
      const date10Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      await fs.writeFile(file10DaysOld, 'data');
      await fs.utimes(file10DaysOld, date10Days, date10Days);

      // With 15-day retention, a 10-day-old file should be kept
      await service.cleanupOldOutputs(15);
      expect(await fs.pathExists(file10DaysOld)).toBe(true);
    });
  });
});
