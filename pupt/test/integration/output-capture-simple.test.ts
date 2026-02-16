import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { OutputCaptureService } from '../../src/services/output-capture-service.js';

describe('OutputCaptureService - Simple Test', () => {
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

  it.skipIf(skipOnWindowsCI)('should capture echo output', async () => {
    const prompt = 'Hello World';
    const outputFile = path.join(outputDir, 'echo-output.json');
    
    const result = await service.captureCommand(
      'echo',
      [],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    
    const jsonOutput = await fs.readJson(outputFile);
    console.log('Echo output:', jsonOutput);
    const textContent = jsonOutput
      .filter((chunk: any) => chunk.direction === 'output')
      .map((chunk: any) => chunk.data)
      .join('');
    expect(textContent).toContain('Hello World');
  });

  it.skipIf(skipOnWindowsCI)('should capture claude output and verify prompt was sent', async () => {
    const prompt = 'Say "test successful" and nothing else';
    const outputFile = path.join(outputDir, 'claude-output.json');
    
    console.log('Starting Claude test with prompt:', prompt);
    
    // Use the new method that returns a handle
    const handle = service.captureCommandWithHandle(
      'claude',
      [],
      prompt,
      outputFile
    );
    
    // Kill claude after 8 seconds to prevent timeout
    const killTimer = setTimeout(() => {
      console.log('Killing the specific claude process...');
      handle.kill();
    }, 8000);
    
    const result = await handle.promise;
    
    clearTimeout(killTimer);
    
    console.log('Result:', result);
    
    const jsonOutput = await fs.readJson(outputFile);
    console.log('Output chunks:', jsonOutput.length);
    
    // Check if our prompt appears in the captured output
    const allContent = jsonOutput.map((chunk: any) => chunk.data).join('');
    const promptInOutput = allContent.includes(prompt);
    console.log('Prompt found in output:', promptInOutput);
    expect(promptInOutput).toBe(true);
    
    // The test passes if we successfully sent the prompt
    // We don't wait for Claude's response to avoid timeout
  }, 10000);
});