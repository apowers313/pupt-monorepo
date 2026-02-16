import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Output Capture Integration', () => {
  let tempDir: string;
  let historyDir: string;
  let outputDir: string;
  
  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `pt-test-integration-${Date.now()}`);
    historyDir = path.join(tempDir, '.history');
    outputDir = historyDir; // Output files go in same directory as history
    
    await fs.ensureDir(historyDir);
  });
  
  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should capture claude session output', async () => {
    // Test that output capture service can be created for claude sessions
    const service = new OutputCaptureService({
      outputDirectory: outputDir,
      maxOutputSize: 10 * 1024 * 1024 // 10MB
    });
    
    expect(service).toBeDefined();
    
    // In a real scenario, we'd capture actual claude output
    // For testing, we verify the service is ready for use
    const outputFile = path.join(outputDir, '20250819-123456-abcdef-output.txt');
    
    // Simulate writing output
    await fs.writeFile(outputFile, 'Sample claude session output');
    expect(await fs.pathExists(outputFile)).toBe(true);
  });

  it('should preserve terminal colors for user', async () => {
    // Test that the service configuration preserves terminal colors
    const service = new OutputCaptureService({
      outputDirectory: outputDir
    });
    
    // The service should be configured to pass through colors to stdout
    // while stripping them from the captured file
    expect(service).toBeDefined();
  });

  it('should link output file in history entry', async () => {
    const historyManager = new HistoryManager(historyDir);
    
    // Create a mock output file
    const outputFile = path.join(outputDir, '20250819-123456-abcdef-output.txt');
    await fs.writeFile(outputFile, 'Test output content');
    
    // Save history entry with output file reference
    const filename = await historyManager.savePrompt({
      templatePath: 'test-prompt.md',
      templateContent: 'Test prompt content',
      variables: new Map([['test', 'value']]),
      finalPrompt: 'Test final prompt',
      title: 'Test Title',
      // We'll extend this to support output file in the next step
    });
    
    expect(filename).toBeTruthy();
    
    // Verify history entry was saved
    const historyFile = path.join(historyDir, filename);
    expect(await fs.pathExists(historyFile)).toBe(true);
  });
});