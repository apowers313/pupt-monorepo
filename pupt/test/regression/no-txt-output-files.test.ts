import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { OutputCaptureService } from '../../src/services/output-capture-service.js';

describe('No TXT Output Files Regression Test', () => {
  // Skip on Windows CI due to missing PTY binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
  let outputDir: string;
  let service: OutputCaptureService;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'no-txt-test-'));
    service = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 10 * 1024 * 1024
    });
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  it.skipIf(skipOnWindowsCI)('should only create JSON output files, not TXT files', async () => {
    const prompt = 'Hello World';
    const outputFile = path.join(outputDir, 'test-output.json');
    
    const result = await service.captureCommand(
      'echo',
      ['test'],
      prompt,
      outputFile
    );
    
    expect(result.exitCode).toBe(0);
    expect(result.outputFile).toBe(outputFile);
    
    // Check that JSON file was created
    expect(await fs.pathExists(outputFile)).toBe(true);
    
    // Check that NO txt file was created
    const txtFile = outputFile.replace(/\.json$/, '.txt');
    expect(await fs.pathExists(txtFile)).toBe(false);
    
    // Verify directory only contains JSON files
    const files = await fs.readdir(outputDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    expect(txtFiles).toHaveLength(0);
    
    // Verify we have exactly one JSON file
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    expect(jsonFiles).toHaveLength(1);
  });

  it.skipIf(skipOnWindowsCI)('should handle multiple captures without creating TXT files', async () => {
    const commands = [
      { cmd: 'echo', args: ['test1'], prompt: 'prompt1' },
      { cmd: 'echo', args: ['test2'], prompt: 'prompt2' },
      { cmd: 'echo', args: ['test3'], prompt: 'prompt3' }
    ];
    
    for (let i = 0; i < commands.length; i++) {
      const { cmd, args, prompt } = commands[i];
      const outputFile = path.join(outputDir, `output-${i}.json`);
      
      const result = await service.captureCommand(cmd, args, prompt, outputFile);
      expect(result.exitCode).toBe(0);
    }
    
    // Verify no TXT files were created
    const files = await fs.readdir(outputDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    expect(txtFiles).toHaveLength(0);
    
    // Verify we have exactly 3 JSON files
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    expect(jsonFiles).toHaveLength(3);
  });
});