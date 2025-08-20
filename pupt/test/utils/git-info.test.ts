import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGitInfo, formatDuration } from '../../src/utils/git-info.js';
import { exec } from 'child_process';
import { promisify } from 'util';

vi.mock('child_process');

describe('Git Info Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGitInfo', () => {
    it('should return git branch, commit, and clean status', async () => {
      const mockExecAsync = vi.mocked(promisify(exec));
      
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd === 'git rev-parse --abbrev-ref HEAD') {
          return { stdout: 'main\n', stderr: '' };
        }
        if (cmd === 'git rev-parse HEAD') {
          return { stdout: 'abc123def456\n', stderr: '' };
        }
        if (cmd === 'git status --porcelain') {
          return { stdout: '', stderr: '' };
        }
        throw new Error('Unknown command');
      });

      const info = await getGitInfo();

      expect(info.branch).toBe('main');
      expect(info.commit).toBe('abc123def456');
      expect(info.isDirty).toBe(false);
    });

    it('should detect dirty git status', async () => {
      const mockExecAsync = vi.mocked(promisify(exec));
      
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd === 'git rev-parse --abbrev-ref HEAD') {
          return { stdout: 'feature/test\n', stderr: '' };
        }
        if (cmd === 'git rev-parse HEAD') {
          return { stdout: '123456\n', stderr: '' };
        }
        if (cmd === 'git status --porcelain') {
          return { stdout: 'M src/file.ts\nA new-file.js\n', stderr: '' };
        }
        throw new Error('Unknown command');
      });

      const info = await getGitInfo();

      expect(info.branch).toBe('feature/test');
      expect(info.commit).toBe('123456');
      expect(info.isDirty).toBe(true);
    });

    it('should handle non-git directories gracefully', async () => {
      const mockExecAsync = vi.mocked(promisify(exec));
      mockExecAsync.mockRejectedValue(new Error('Not a git repository'));

      const info = await getGitInfo();

      expect(info.branch).toBeUndefined();
      expect(info.commit).toBeUndefined();
      expect(info.isDirty).toBeUndefined();
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      const start = new Date('2025-08-16T10:00:00Z');
      const end = new Date('2025-08-16T10:00:45Z');
      
      expect(formatDuration(start, end)).toBe('45s');
    });

    it('should format minutes and seconds correctly', () => {
      const start = new Date('2025-08-16T10:00:00Z');
      const end = new Date('2025-08-16T10:01:30Z');
      
      expect(formatDuration(start, end)).toBe('1m 30s');
    });

    it('should format exact minutes correctly', () => {
      const start = new Date('2025-08-16T10:00:00Z');
      const end = new Date('2025-08-16T10:02:00Z');
      
      expect(formatDuration(start, end)).toBe('2m');
    });

    it('should format hours and minutes correctly', () => {
      const start = new Date('2025-08-16T10:00:00Z');
      const end = new Date('2025-08-16T11:15:00Z');
      
      expect(formatDuration(start, end)).toBe('1h 15m');
    });

    it('should format exact hours correctly', () => {
      const start = new Date('2025-08-16T10:00:00Z');
      const end = new Date('2025-08-16T12:00:00Z');
      
      expect(formatDuration(start, end)).toBe('2h');
    });

    it('should handle sub-second durations', () => {
      const start = new Date('2025-08-16T10:00:00.000Z');
      const end = new Date('2025-08-16T10:00:00.500Z');
      
      expect(formatDuration(start, end)).toBe('0s');
    });
  });
});