import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('OutputCaptureService - Basic Prompt Sending', () => {
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

  it.skipIf(skipOnWindowsCI)('should send prompt immediately to command stdin', async () => {
    const prompt = 'test input';
    const outputFile = path.join(outputDir, 'stdin-test.json');
    
    const result = await service.captureCommand(
      'bash',
      ['-c', 'read line && echo "Got: $line"'],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    
    const jsonOutput = await fs.readJson(outputFile);
    const textContent = jsonOutput
      .filter((chunk: any) => chunk.direction === 'output')
      .map((chunk: any) => chunk.data)
      .join('');
    console.log('Output:', textContent);
    // PTY echoes the input, so we should see both the input and the output
    const lines = textContent.trim().split('\n').map(line => line.trim());
    expect(lines).toContain('Got: test input');
  });
});