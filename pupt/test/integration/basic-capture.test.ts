import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('OutputCaptureService - Basic Prompt Sending', () => {
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

  it('should send prompt immediately to command stdin', async () => {
    const prompt = 'test input';
    const outputFile = path.join(outputDir, 'stdin-test.txt');
    
    const result = await service.captureCommand(
      'bash',
      ['-c', 'read line && echo "Got: $line"'],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    
    const output = await fs.readFile(outputFile, 'utf-8');
    console.log('Output:', output);
    // PTY echoes the input, so we should see both the input and the output
    const lines = output.trim().split('\n').map(line => line.trim());
    expect(lines).toContain('Got: test input');
  });
});