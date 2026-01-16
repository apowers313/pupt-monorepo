import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedHistoryManager } from '../../src/history/enhanced-history-manager.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

vi.mock('fs-extra');
vi.mock('child_process');

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

    vi.mocked(execAsync).mockImplementation(async (cmd: string) => {
      if (cmd === 'git rev-parse --abbrev-ref HEAD') {
        return { stdout: mockGitInfo.branch + '\n', stderr: '' };
      }
      if (cmd === 'git rev-parse HEAD') {
        return { stdout: mockGitInfo.commit + '\n', stderr: '' };
      }
      if (cmd === 'git status --porcelain') {
        return { stdout: '', stderr: '' };
      }
      if (cmd === 'git rev-parse --absolute-git-dir') {
        return { stdout: mockGitInfo.gitDir + '\n', stderr: '' };
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
    const historyEntry = writeCall[1] as any;

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
    
    vi.mocked(execAsync).mockResolvedValue({ stdout: '', stderr: '' });
    
    await historyManager.savePrompt({
      templatePath: 'test-prompt',
      templateContent: 'Prompt content',
      variables: new Map(),
      finalPrompt: 'Generated output',
      startTime,
      endTime
    });

    const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
    const historyEntry = writeCall[1] as any;

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

    vi.mocked(execAsync).mockImplementation(async (cmd: string) => {
      if (cmd === 'git rev-parse --abbrev-ref HEAD') {
        return { stdout: mockGitInfo.branch + '\n', stderr: '' };
      }
      if (cmd === 'git rev-parse HEAD') {
        return { stdout: mockGitInfo.commit + '\n', stderr: '' };
      }
      if (cmd === 'git status --porcelain') {
        return { stdout: 'M src/file.ts\n', stderr: '' };
      }
      if (cmd === 'git rev-parse --absolute-git-dir') {
        return { stdout: mockGitInfo.gitDir + '\n', stderr: '' };
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
    const historyEntry = writeCall[1] as any;

    expect(historyEntry.environment.git_branch).toBe(mockGitInfo.branch);
    expect(historyEntry.environment.git_commit).toBe(mockGitInfo.commit);
    expect(historyEntry.environment.git_dirty).toBe(true);
    expect(historyEntry.environment.git_dir).toBe(mockGitInfo.gitDir);
  });

  it('should handle missing git info gracefully', async () => {
    // Simulate not being in a git repository
    vi.mocked(execAsync).mockRejectedValue(new Error('Not a git repository'));

    await historyManager.savePrompt({
      templatePath: 'test-prompt',
      templateContent: 'Prompt content',
      variables: new Map(),
      finalPrompt: 'Generated output'
    });

    const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
    const historyEntry = writeCall[1] as any;

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
});