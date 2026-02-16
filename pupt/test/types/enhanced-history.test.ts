import { describe, expect,it } from 'vitest';

import { EnhancedHistoryEntry } from '../../src/types/history.js';
import { HistoryEntry } from '../../src/types/history.js';

describe('Enhanced History Types', () => {
  it('should validate enhanced history entry schema', () => {
    const enhancedEntry: EnhancedHistoryEntry = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'prompts/test.md',
      templateContent: 'Test template',
      finalPrompt: 'Test prompt',
      variables: { var1: 'value1' },
      filename: 'test-history.json',
      environment: {
        working_directory: '/home/user/project',
        git_commit: 'abc123',
        git_branch: 'main',
        git_dirty: false,
        node_version: 'v18.0.0',
        os: 'linux',
        shell: 'bash'
      },
      execution: {
        start_time: '2025-08-16T10:00:00Z',
        end_time: '2025-08-16T10:00:30Z',
        duration: '30s',
        exit_code: 0,
        command: 'claude',
        output_file: '.history/outputs/2025-08-16T10-00-00Z.txt',
        output_size: 1024
      }
    };

    // Type checking ensures this compiles
    expect(enhancedEntry.environment).toBeDefined();
    expect(enhancedEntry.execution).toBeDefined();
    expect(enhancedEntry.environment?.git_branch).toBe('main');
    expect(enhancedEntry.execution?.duration).toBe('30s');
  });

  it('should maintain backward compatibility', () => {
    // Old history entry should still be valid
    const oldEntry: HistoryEntry = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'prompts/test.md',
      templateContent: 'Test template',
      finalPrompt: 'Test prompt',
      variables: { var1: 'value1' },
      filename: 'test-history.json'
    };

    // Should also be a valid enhanced entry (with optional fields)
    const enhancedEntry: EnhancedHistoryEntry = oldEntry;
    
    expect(enhancedEntry.environment).toBeUndefined();
    expect(enhancedEntry.execution).toBeUndefined();
    expect(enhancedEntry.timestamp).toBe(oldEntry.timestamp);
    expect(enhancedEntry.templatePath).toBe(oldEntry.templatePath);
  });

  it('should allow partial environment data', () => {
    const partialEntry: EnhancedHistoryEntry = {
      timestamp: '2025-08-16T10:00:00Z',
      templatePath: 'prompts/test.md',
      templateContent: 'Test template',
      finalPrompt: 'Test prompt',
      variables: {},
      filename: 'test-history.json',
      environment: {
        working_directory: '/home/user/project',
        os: 'linux'
        // Git info might be missing if not in a git repo
      }
    };

    expect(partialEntry.environment?.git_branch).toBeUndefined();
    expect(partialEntry.environment?.working_directory).toBe('/home/user/project');
  });

  it('should support all execution metadata fields', () => {
    const executionData: NonNullable<EnhancedHistoryEntry['execution']> = {
      start_time: '2025-08-16T10:00:00Z',
      end_time: '2025-08-16T10:00:30Z',
      duration: '30s',
      exit_code: 0,
      command: 'claude',
      output_file: '.history/outputs/2025-08-16T10-00-00Z.txt',
      output_size: 2048
    };

    expect(executionData.duration).toBe('30s');
    expect(executionData.exit_code).toBe(0);
    expect(executionData.output_file).toBeDefined();
  });
});