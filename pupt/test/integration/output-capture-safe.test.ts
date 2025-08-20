import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('OutputCaptureService - Safe Integration Tests', () => {
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

  it('should capture echo output correctly', async () => {
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
    
    const output = await fs.readFile(outputFile, 'utf-8');
    expect(output).toContain('Hello World');
  });

  it('should capture cat output with stdin', async () => {
    const prompt = 'Test input for cat';
    const outputFile = path.join(outputDir, 'cat-output.txt');
    
    const result = await service.captureCommand(
      'cat',
      [],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    
    const output = await fs.readFile(outputFile, 'utf-8');
    expect(output).toContain('Test input for cat');
  });

  it('should respect size limits', async () => {
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
    
    const output = await fs.readFile(outputFile, 'utf-8');
    expect(output).toContain('[OUTPUT TRUNCATED - SIZE LIMIT REACHED]');
  });
});