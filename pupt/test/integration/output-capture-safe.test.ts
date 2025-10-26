import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('OutputCaptureService - Safe Integration Tests', () => {
  // Skip on Windows CI due to missing PTY binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
  let outputDir: string;
  let service: OutputCaptureService;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'output-capture-test-'));
    service = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 10 * 1024 * 1024
    });
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  it.skipIf(skipOnWindowsCI)('should capture echo output correctly', async () => {
    const prompt = 'Hello World';
    const outputFile = path.join(outputDir, 'echo-output.txt');
    
    const result = await service.captureCommand(
      'echo',
      [],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    expect(result.truncated).toBeFalsy();
    
    const jsonFile = outputFile.replace(/\.txt$/, '.json');
    const chunks = await fs.readJson(jsonFile) as Array<{direction: string, data: string}>;
    const output = chunks.filter(c => c.direction === 'output').map(c => c.data).join('');
    expect(output).toContain('Hello World');
  });

  it.skipIf(skipOnWindowsCI)('should capture cat output with stdin', async () => {
    const prompt = 'Test input for cat';
    const outputFile = path.join(outputDir, 'cat-output.txt');
    
    const result = await service.captureCommand(
      'cat',
      [],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    
    const jsonFile = outputFile.replace(/\.txt$/, '.json');
    const chunks = await fs.readJson(jsonFile) as Array<{direction: string, data: string}>;
    const output = chunks.filter(c => c.direction === 'output').map(c => c.data).join('');
    expect(output).toContain('Test input for cat');
  });

  it.skipIf(skipOnWindowsCI)('should respect size limits', async () => {
    // Create a service with small size limit
    const smallService = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 100 // 100 bytes
    });
    
    // Generate large output
    const largePrompt = 'a'.repeat(1000);
    const outputFile = path.join(outputDir, 'truncated-output.txt');
    
    const result = await smallService.captureCommand(
      'echo',
      [],
      largePrompt,
      outputFile
    );
    
    expect(result.truncated).toBe(true);
    expect(result.outputSize).toBe(100);
    
    const jsonOutputFile = outputFile.replace(/\.txt$/, '.json');
    const jsonOutput = await fs.readJson(jsonOutputFile);
    const textContent = jsonOutput
      .filter((chunk: any) => chunk.direction === 'output')
      .map((chunk: any) => chunk.data)
      .join('');
    expect(textContent).toContain('[OUTPUT TRUNCATED - SIZE LIMIT REACHED]');
  });
});