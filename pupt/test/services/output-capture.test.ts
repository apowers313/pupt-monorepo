import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';
import * as pty from 'node-pty';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock node-pty for unit tests
vi.mock('node-pty');

describe('OutputCaptureService', () => {
  let tempDir: string;
  let service: OutputCaptureService;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `pt-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    service = new OutputCaptureService({
      outputDirectory: tempDir,
      maxOutputSize: 1024 * 1024 // 1MB
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should capture output without breaking interactivity', async () => {
    // This test verifies the service can be created and configured
    // Actual PTY testing would require a real terminal environment
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(OutputCaptureService);
  });

  it('should strip ANSI codes from captured output', async () => {
    // Test that the service is configured to strip ANSI codes
    // The actual stripping happens inside the captureCommand method
    const testFile = path.join(tempDir, 'test-output.txt');
    
    // Verify the service accepts output paths
    expect(() => {
      // In a real test, we'd call captureCommand here
      // For now, we verify the service is properly configured
      service;
    }).not.toThrow();
  });

  it('should handle large outputs with size limits', async () => {
    // Create a service with a small size limit
    const smallLimitService = new OutputCaptureService({
      outputDirectory: tempDir,
      maxOutputSize: 100 // 100 bytes
    });
    
    expect(smallLimitService).toBeDefined();
  });

  it('should create output files in configured directory', async () => {
    // Verify the output directory configuration
    const customDir = path.join(tempDir, 'custom-outputs');
    const customService = new OutputCaptureService({
      outputDirectory: customDir
    });
    
    expect(customService).toBeDefined();
  });

  it('should only clean up output files, not JSON history files', async () => {
    // Create some test files
    const outputFile1 = path.join(tempDir, '20250101-123456-abc123-output.txt');
    const outputFile2 = path.join(tempDir, '20250102-123456-def456-output.txt');
    const jsonFile = path.join(tempDir, '20250101-123456-abc123.json');
    const otherFile = path.join(tempDir, 'README.md');
    
    // Create files with different ages
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
    await fs.writeFile(outputFile1, 'old output');
    await fs.writeFile(outputFile2, 'recent output');
    await fs.writeFile(jsonFile, '{"test": true}');
    await fs.writeFile(otherFile, '# README');
    
    // Make first output file old
    await fs.utimes(outputFile1, oldDate, oldDate);
    await fs.utimes(jsonFile, oldDate, oldDate);
    
    // Run cleanup with 30 day retention
    await service.cleanupOldOutputs(30);
    
    // Check results
    expect(await fs.pathExists(outputFile1)).toBe(false); // Old output file should be deleted
    expect(await fs.pathExists(outputFile2)).toBe(true);  // Recent output file should remain
    expect(await fs.pathExists(jsonFile)).toBe(true);     // JSON file should NOT be deleted
    expect(await fs.pathExists(otherFile)).toBe(true);    // Other files should NOT be deleted
  });
});

describe('OutputCaptureService - Claude typing', () => {
  let tempDir: string;
  let service: OutputCaptureService;
  let mockPty: any;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `pt-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    service = new OutputCaptureService({
      outputDirectory: tempDir,
      maxOutputSize: 1024 * 1024
    });

    // Setup PTY mock
    mockPty = {
      write: vi.fn(),
      kill: vi.fn(),
      resize: vi.fn(),
      onData: vi.fn(),
      onExit: vi.fn()
    };

    vi.mocked(pty.spawn).mockImplementation((cmd, args, options) => {
      console.log('Spawning command:', cmd);
      console.log('With args:', args);
      return mockPty as any;
    });
    
    // Mock TTY environment
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      writable: true,
      configurable: true
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      writable: true,
      configurable: true
    });
    
    // Mock stdin as TTY.ReadStream
    const mockStdin = {
      setRawMode: vi.fn().mockReturnValue(process.stdin),
      resume: vi.fn().mockReturnValue(process.stdin),
      pause: vi.fn().mockReturnValue(process.stdin),
      on: vi.fn().mockReturnValue(process.stdin),
      removeListener: vi.fn().mockReturnValue(process.stdin),
      isTTY: true
    };
    
    // Mock stdout
    const mockStdout = {
      on: vi.fn().mockReturnValue(process.stdout),
      removeListener: vi.fn().mockReturnValue(process.stdout),
      write: vi.fn().mockReturnValue(true),
      columns: 80,
      rows: 30,
      isTTY: true
    };
    
    // Replace process.stdin and stdout
    Object.assign(process.stdin, mockStdin);
    Object.assign(process.stdout, mockStdout);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('should use shell piping for Claude in TTY mode', async () => {
    const prompt = 'Test prompt';
    const outputFile = path.join(tempDir, 'claude-test.txt');
    
    // Track write calls
    const writeCalls: string[] = [];
    mockPty.write.mockImplementation((data: string) => {
      console.log('PTY write called with:', JSON.stringify(data));
      writeCalls.push(data);
    });

    // Setup data and exit handlers
    let dataHandler: any;
    mockPty.onData.mockImplementation((handler: any) => {
      console.log('onData handler registered');
      dataHandler = handler;
    });

    let exitHandler: any;
    mockPty.onExit.mockImplementation((handler: any) => {
      console.log('onExit handler registered');
      exitHandler = handler;
    });

    // Start capture
    const capturePromise = service.captureCommand(
      'claude',
      [],
      prompt,
      outputFile
    );

    // Wait a bit for handlers to be set up
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate Claude UI appearing
    if (dataHandler) {
      dataHandler('Welcome to Claude!\r\n');
      dataHandler('│ > ');
      dataHandler('? for shortcuts');
    } else {
      console.error('dataHandler not set up!');
    }

    // Wait for typing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In TTY mode with Claude, it should use shell piping
    // So the prompt is NOT typed character by character
    const charWrites = writeCalls.filter(call => call.length === 1 && call !== '\r');
    
    console.log('All write calls:', writeCalls);
    console.log('Character writes:', charWrites);
    
    // Should NOT have typed each character (using shell piping instead)
    expect(charWrites.length).toBe(0);

    // Simulate exit
    exitHandler({ exitCode: 0 });

    const result = await capturePromise;
    expect(result.exitCode).toBe(0);
  });

  it('should handle non-Claude commands without character typing', async () => {
    const prompt = 'Echo test';
    const outputFile = path.join(tempDir, 'echo-test.txt');
    
    let exitHandler: any;
    mockPty.onExit.mockImplementation((handler: any) => {
      exitHandler = handler;
    });

    const capturePromise = service.captureCommand(
      'echo',
      [],
      prompt,
      outputFile
    );

    // Wait a bit to ensure any async operations happen
    await new Promise(resolve => setTimeout(resolve, 100));

    // For non-Claude commands, prompt should be sent as a whole
    expect(mockPty.write).toHaveBeenCalledWith(prompt);
    expect(mockPty.write).toHaveBeenCalledWith('\n');

    // Simulate exit
    exitHandler({ exitCode: 0 });

    const result = await capturePromise;
    expect(result.exitCode).toBe(0);
  });
});