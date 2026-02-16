import fs from 'fs-extra';
import path from 'path';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { EnhancedHistoryManager } from '../../src/history/enhanced-history-manager.js';
import { EnhancedHistoryEntry,HistoryEntry } from '../../src/types/history.js';

vi.mock('fs-extra');

describe('Enhanced History Backward Compatibility', () => {
  let historyDir: string;
  let historyManager: EnhancedHistoryManager;

  beforeEach(() => {
    historyDir = '/test/history';
    historyManager = new EnhancedHistoryManager(historyDir);
    
    vi.mocked(fs.ensureDir).mockResolvedValue();
    vi.mocked(fs.readdir).mockResolvedValue([]);
  });

  it('should read old history entries without enhanced fields', async () => {
    const oldEntry: Omit<HistoryEntry, 'filename'> = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'prompts/test.md',
      templateContent: 'Test template',
      variables: { var1: 'value1' },
      finalPrompt: 'Test prompt',
      title: 'Test Title'
    };

    const historyFiles = ['20250816-100000-abc12345.json'];
    vi.mocked(fs.readdir).mockResolvedValue(historyFiles);
    vi.mocked(fs.readJson).mockResolvedValue(oldEntry);

    const entries = await historyManager.listHistory();

    expect(entries).toHaveLength(1);
    expect(entries[0].timestamp).toBe(oldEntry.timestamp);
    expect(entries[0].templatePath).toBe(oldEntry.templatePath);
    expect((entries[0]).environment).toBeUndefined();
    expect((entries[0]).execution).toBeUndefined();
  });

  it('should read new enhanced history entries', async () => {
    const enhancedEntry: Omit<EnhancedHistoryEntry, 'filename'> = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'prompts/test.md',
      templateContent: 'Test template',
      variables: { var1: 'value1' },
      finalPrompt: 'Test prompt',
      environment: {
        working_directory: '/home/user/project',
        git_branch: 'main',
        git_commit: 'abc123',
        git_dirty: false,
        node_version: 'v18.0.0',
        os: 'linux'
      },
      execution: {
        start_time: '2025-08-16T10:00:00Z',
        end_time: '2025-08-16T10:00:30Z',
        duration: '30s',
        exit_code: 0,
        command: 'claude'
      }
    };

    const historyFiles = ['20250816-100000-abc12345.json'];
    vi.mocked(fs.readdir).mockResolvedValue(historyFiles);
    vi.mocked(fs.readJson).mockResolvedValue(enhancedEntry);

    const entries = await historyManager.listHistory();

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.environment).toBeDefined();
    expect(entry.environment?.git_branch).toBe('main');
    expect(entry.execution).toBeDefined();
    expect(entry.execution?.duration).toBe('30s');
  });

  it('should handle mixed old and new entries', async () => {
    const oldEntry: Omit<HistoryEntry, 'filename'> = {
      timestamp: '2025-08-16T09:00:00Z',
      templatePath: 'prompts/old.md',
      templateContent: 'Old template',
      variables: {},
      finalPrompt: 'Old prompt'
    };

    const enhancedEntry: Omit<EnhancedHistoryEntry, 'filename'> = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'prompts/new.md',
      templateContent: 'New template',
      variables: {},
      finalPrompt: 'New prompt',
      environment: {
        working_directory: '/home/user/project',
        os: 'linux'
      }
    };

    const historyFiles = ['20250816-090000-12345678.json', '20250816-100000-87654321.json'];
    vi.mocked(fs.readdir).mockResolvedValue(historyFiles);
    vi.mocked(fs.readJson)
      .mockResolvedValueOnce(oldEntry)
      .mockResolvedValueOnce(enhancedEntry);

    const entries = await historyManager.listHistory();

    expect(entries).toHaveLength(2);
    expect((entries[0]).environment).toBeUndefined();
    expect((entries[1]).environment).toBeDefined();
  });
});