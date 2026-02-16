import { spawn } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterAll,afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

describe('OutputCaptureService - Claude Integration', () => {
  // Skip on Windows CI due to missing PTY binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
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
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'output-capture-test-'));
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

  it.skipIf(skipOnWindowsCI)('should capture claude output with prompt injection', async () => {
    if (!claudeAvailable) {
      console.log('Claude not available, skipping test');
      return;
    }
    
    const prompt = 'What is 5 + 5? Respond with just the number.';
    const outputFile = path.join(outputDir, 'claude-output.txt');
    const jsonOutputFile = outputFile.replace(/\.txt$/, '.json');
    
    console.log('Starting Claude capture test...');
    console.log('Output will be saved to:', outputFile);
    
    const result = await service.captureCommand(
      'claude',
      [],
      prompt,
      outputFile
    );
    
    console.log('Capture result:', result);
    
    // Check the result
    expect(result.exitCode).toBe(0);
    expect(result.outputFile).toBe(jsonOutputFile);
    expect(result.truncated).toBeFalsy();
    
    // Read and check the output
    const chunks = await fs.readJson(jsonOutputFile) as Array<{timestamp: string, direction: string, data: string}>;
    const output = chunks.filter(c => c.direction === 'output').map(c => c.data).join('');
    console.log('Captured output length:', output.length);
    console.log('Output preview:', output.substring(0, 500));
    
    
    // Check if our prompt was captured
    const promptIndex = output.indexOf(prompt);
    console.log('Found prompt at position:', promptIndex);
    expect(promptIndex).toBeGreaterThan(-1);
    
    // Check if we got a response (should contain "10")
    const hasResponse = output.includes('10');
    console.log('Output contains "10":', hasResponse);
    expect(hasResponse).toBe(true);
  }, 30000); // 30 second timeout for Claude interaction
});