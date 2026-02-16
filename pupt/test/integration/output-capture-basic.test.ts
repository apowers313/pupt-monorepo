import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import { EnhancedHistoryManager } from '../../src/history/enhanced-history-manager.js';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('Output Capture Basic Integration', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `pt-test-output-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });
  
  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should create output capture service', () => {
    const service = new OutputCaptureService({
      outputDirectory: tempDir,
      maxOutputSize: 1024
    });
    
    expect(service).toBeDefined();
  });

  it('should save history with output file reference', async () => {
    const historyDir = path.join(tempDir, '.history');
    const outputFile = path.join(tempDir, 'output.txt');
    
    const historyManager = new EnhancedHistoryManager(historyDir);
    
    const filename = await historyManager.savePrompt({
      templatePath: 'test.md',
      templateContent: 'Test content',
      variables: new Map(),
      finalPrompt: 'Test prompt',
      startTime: new Date(),
      endTime: new Date(),
      command: 'echo',
      exitCode: 0,
      outputFile,
      outputSize: 100
    });
    
    expect(filename).toBeTruthy();
    
    // Read the saved history entry
    const historyPath = path.join(historyDir, filename);
    const savedEntry = await fs.readJson(historyPath);
    
    expect(savedEntry.execution).toBeDefined();
    expect(savedEntry.execution.output_file).toBe(outputFile);
    expect(savedEntry.execution.output_size).toBe(100);
  });

  it('should handle cleanup of old outputs', async () => {
    const service = new OutputCaptureService({
      outputDirectory: tempDir
    });
    
    // Create some test files
    const oldFile = path.join(tempDir, 'old-output.txt');
    const newFile = path.join(tempDir, 'new-output.txt');
    
    await fs.writeFile(oldFile, 'old content');
    await fs.writeFile(newFile, 'new content');
    
    // Make old file appear old by modifying its mtime
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40); // 40 days old
    await fs.utimes(oldFile, oldDate, oldDate);
    
    // Run cleanup with 30 day retention
    await service.cleanupOldOutputs(30);
    
    // Old file should be removed, new file should remain
    expect(await fs.pathExists(oldFile)).toBe(false);
    expect(await fs.pathExists(newFile)).toBe(true);
  });
});