import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhancedHistoryManager } from '../../src/history/enhanced-history-manager.js';
import { calculateActiveExecutionTime, extractUserInputLines } from '../../src/services/output-capture-service.js';

const { mockExecAsync } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
}));

vi.mock('fs-extra');
vi.mock('child_process');
vi.mock('util', async (importOriginal) => {
  const original = await importOriginal<typeof import('util')>();
  return {
    ...original,
    promisify: vi.fn(() => mockExecAsync),
  };
});
vi.mock('../../src/services/output-capture-service.js', () => ({
  calculateActiveExecutionTime: vi.fn(),
  extractUserInputLines: vi.fn(),
}));

describe('Enhanced History', () => {
  let historyDir: string;
  let historyManager: EnhancedHistoryManager;

  beforeEach(async () => {
    historyDir = path.join(os.tmpdir(), 'pt-test-history');
    
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.ensureDir).mockResolvedValue();
    vi.mocked(fs.readdir).mockResolvedValue([]);
    vi.mocked(fs.writeJson).mockResolvedValue();
    
    historyManager = new EnhancedHistoryManager(historyDir);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should capture execution environment metadata', async () => {
    const mockGitInfo = {
      branch: 'feature/test',
      commit: 'abc123def',
      isDirty: false,
      gitDir: '/home/user/project/.git'
    };

    mockExecAsync.mockImplementation(async (cmd: string) => {
      if (cmd === 'git rev-parse --abbrev-ref HEAD') {
        return { stdout: `${mockGitInfo.branch  }\n`, stderr: '' };
      }
      if (cmd === 'git rev-parse HEAD') {
        return { stdout: `${mockGitInfo.commit  }\n`, stderr: '' };
      }
      if (cmd === 'git status --porcelain') {
        return { stdout: '', stderr: '' };
      }
      if (cmd === 'git rev-parse --absolute-git-dir') {
        return { stdout: `${mockGitInfo.gitDir  }\n`, stderr: '' };
      }
      throw new Error('Unknown command');
    });

    const startTime = new Date();
    await historyManager.savePrompt({
      templatePath: 'test-prompt',
      templateContent: 'Prompt content',
      variables: new Map([['var1', 'value1']]),
      finalPrompt: 'Generated output',
      startTime
    });

    const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
    const historyEntry = writeCall[1];

    expect(historyEntry.environment).toBeDefined();
    expect(historyEntry.environment.working_directory).toBe(process.cwd());
    expect(historyEntry.environment.git_dir).toBe(mockGitInfo.gitDir);
    expect(historyEntry.environment.git_branch).toBe(mockGitInfo.branch);
    expect(historyEntry.environment.git_commit).toBe(mockGitInfo.commit);
    expect(historyEntry.environment.git_dirty).toBe(false);
    expect(historyEntry.environment.node_version).toBe(process.version);
    expect(historyEntry.environment.os).toBe(process.platform);
  });

  it('should track execution duration', async () => {
    const startTime = new Date('2025-08-16T10:00:00Z');
    const endTime = new Date('2025-08-16T10:00:30Z'); // 30 seconds later
    
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    
    await historyManager.savePrompt({
      templatePath: 'test-prompt',
      templateContent: 'Prompt content',
      variables: new Map(),
      finalPrompt: 'Generated output',
      startTime,
      endTime
    });

    const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
    const historyEntry = writeCall[1];

    expect(historyEntry.execution).toBeDefined();
    expect(historyEntry.execution.start_time).toBe(startTime.toISOString());
    expect(historyEntry.execution.end_time).toBe(endTime.toISOString());
    expect(historyEntry.execution.duration).toBe('30s');
  });

  it('should store git branch, commit, and git_dir info', async () => {
    const mockGitInfo = {
      branch: 'main',
      commit: '123456789abcdef',
      isDirty: true,
      gitDir: '/home/user/project/.git'
    };

    mockExecAsync.mockImplementation(async (cmd: string) => {
      if (cmd === 'git rev-parse --abbrev-ref HEAD') {
        return { stdout: `${mockGitInfo.branch  }\n`, stderr: '' };
      }
      if (cmd === 'git rev-parse HEAD') {
        return { stdout: `${mockGitInfo.commit  }\n`, stderr: '' };
      }
      if (cmd === 'git status --porcelain') {
        return { stdout: 'M src/file.ts\n', stderr: '' };
      }
      if (cmd === 'git rev-parse --absolute-git-dir') {
        return { stdout: `${mockGitInfo.gitDir  }\n`, stderr: '' };
      }
      throw new Error('Unknown command');
    });

    await historyManager.savePrompt({
      templatePath: 'test-prompt',
      templateContent: 'Prompt content',
      variables: new Map(),
      finalPrompt: 'Generated output'
    });

    const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
    const historyEntry = writeCall[1];

    expect(historyEntry.environment.git_branch).toBe(mockGitInfo.branch);
    expect(historyEntry.environment.git_commit).toBe(mockGitInfo.commit);
    expect(historyEntry.environment.git_dirty).toBe(true);
    expect(historyEntry.environment.git_dir).toBe(mockGitInfo.gitDir);
  });

  it('should handle missing git info gracefully', async () => {
    // Simulate not being in a git repository
    mockExecAsync.mockRejectedValue(new Error('Not a git repository'));

    await historyManager.savePrompt({
      templatePath: 'test-prompt',
      templateContent: 'Prompt content',
      variables: new Map(),
      finalPrompt: 'Generated output'
    });

    const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
    const historyEntry = writeCall[1];

    expect(historyEntry.environment).toBeDefined();
    expect(historyEntry.environment.git_branch).toBeUndefined();
    expect(historyEntry.environment.git_commit).toBeUndefined();
    expect(historyEntry.environment.git_dirty).toBeUndefined();
    expect(historyEntry.environment.git_dir).toBeUndefined();
    // But other environment data should still be captured
    expect(historyEntry.environment.working_directory).toBe(process.cwd());
    expect(historyEntry.environment.node_version).toBe(process.version);
    expect(historyEntry.environment.os).toBe(process.platform);
  });

  describe('empty prompt handling', () => {
    it('should return empty string without saving when finalPrompt is empty', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: ''
      });

      expect(result).toBe('');
      expect(fs.writeJson).not.toHaveBeenCalled();
    });

    it('should return empty string without saving when finalPrompt is whitespace only', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: '   \n\t  '
      });

      expect(result).toBe('');
      expect(fs.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('savePrompt with executionTime but no JSON output file', () => {
    it('should use executionTime as duration when no JSON outputFile is provided', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:30Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime,
        executionTime: 5000
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(historyEntry.execution).toBeDefined();
      expect(historyEntry.execution.duration).toBe('5000ms');
    });

    it('should use executionTime as duration when outputFile is not a JSON file', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:30Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime,
        executionTime: 7500,
        outputFile: '/tmp/output.txt'
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(historyEntry.execution.duration).toBe('7500ms');
      expect(historyEntry.execution.output_file).toBe('/tmp/output.txt');
    });
  });

  describe('savePrompt with JSON output file', () => {
    it('should calculate active execution time and user input count from JSON file', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      vi.mocked(calculateActiveExecutionTime).mockResolvedValue(2_500_000_000n); // 2500ms in nanoseconds
      vi.mocked(extractUserInputLines).mockResolvedValue(['yes', 'input1', 'input2']);

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:30Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime,
        outputFile: '/tmp/output.json'
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(calculateActiveExecutionTime).toHaveBeenCalledWith('/tmp/output.json');
      expect(extractUserInputLines).toHaveBeenCalledWith('/tmp/output.json');
      expect(historyEntry.execution.active_time).toBe('2500ms');
      expect(historyEntry.execution.user_input_count).toBe(3);
      // duration should be computed from startTime/endTime, not overridden
      expect(historyEntry.execution.duration).toBe('30s');
    });

    it('should fall back to executionTime when active time calculation fails', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      vi.mocked(calculateActiveExecutionTime).mockRejectedValue(new Error('File not found'));

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:30Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime,
        executionTime: 4000,
        outputFile: '/tmp/output.json'
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(historyEntry.execution.active_time).toBe('4000ms');
      // duration stays as computed from startTime/endTime
      expect(historyEntry.execution.duration).toBe('30s');
    });

    it('should have no active_time when calculation fails and no executionTime provided', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      vi.mocked(calculateActiveExecutionTime).mockRejectedValue(new Error('File not found'));

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:30Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime,
        outputFile: '/tmp/output.json'
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(historyEntry.execution.active_time).toBeUndefined();
      expect(historyEntry.execution.user_input_count).toBeUndefined();
    });
  });

  describe('savePrompt with outputFile and outputSize', () => {
    it('should include output_file and output_size in execution data', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:10Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime,
        outputFile: '/tmp/my-output.txt',
        outputSize: 4096
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(historyEntry.execution.output_file).toBe('/tmp/my-output.txt');
      expect(historyEntry.execution.output_size).toBe(4096);
    });

    it('should not include output_file when not provided', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const startTime = new Date('2025-08-16T10:00:00Z');
      const endTime = new Date('2025-08-16T10:00:10Z');

      await historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output',
        startTime,
        endTime
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const historyEntry = writeCall[1];

      expect(historyEntry.execution.output_file).toBeUndefined();
      expect(historyEntry.execution.output_size).toBeUndefined();
    });
  });

  describe('savePrompt error handling', () => {
    it('should throw a wrapped error when fs.writeJson fails', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      vi.mocked(fs.writeJson).mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output'
      })).rejects.toThrow('Failed to save prompt to history: EACCES: permission denied');
    });

    it('should wrap non-Error throws in the error message', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      vi.mocked(fs.writeJson).mockRejectedValue('disk full');

      await expect(historyManager.savePrompt({
        templatePath: 'test-prompt',
        templateContent: 'Prompt content',
        variables: new Map(),
        finalPrompt: 'Generated output'
      })).rejects.toThrow('Failed to save prompt to history: disk full');
    });
  });
});