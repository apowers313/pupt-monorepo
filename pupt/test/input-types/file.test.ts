import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { listFiles, sortFilesByModTime, filterFilesByPattern } from '../../src/utils/file-utils.js';

vi.mock('fs');

describe('File Input Type - File Listing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listFiles', () => {
    it('should list files in a directory', () => {
      const mockFiles = [
        { name: 'file1.ts', isDirectory: () => false },
        { name: 'file2.js', isDirectory: () => false },
        { name: 'dir1', isDirectory: () => true },
      ];

      vi.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles as any);
      vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
        const name = path.basename(filePath as string);
        const dirent = mockFiles.find(f => f.name === name);
        return {
          isDirectory: () => dirent?.isDirectory() || false,
          mtime: new Date('2024-01-01'),
        } as any;
      });

      const files = listFiles('./test-dir');

      expect(files).toHaveLength(3);
      expect(files[0]).toMatchObject({
        name: 'file1.ts',
        path: path.join('./test-dir', 'file1.ts'),
        isDirectory: false,
      });
      expect(files[2]).toMatchObject({
        name: 'dir1',
        path: path.join('./test-dir', 'dir1'),
        isDirectory: true,
      });
    });

    it('should handle empty directories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

      const files = listFiles('./empty-dir');

      expect(files).toHaveLength(0);
    });

    it('should handle non-existent directories', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => listFiles('./non-existent')).toThrow();
    });

    it('should include hidden files', () => {
      const mockFiles = [
        { name: '.hidden', isDirectory: () => false },
        { name: 'visible.txt', isDirectory: () => false },
      ];

      vi.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      const files = listFiles('./test-dir', { includeHidden: true });

      expect(files).toHaveLength(2);
      expect(files.some(f => f.name === '.hidden')).toBe(true);
    });

    it('should exclude hidden files by default', () => {
      const mockFiles = [
        { name: '.hidden', isDirectory: () => false },
        { name: 'visible.txt', isDirectory: () => false },
      ];

      vi.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      const files = listFiles('./test-dir');

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('visible.txt');
    });
  });

  describe('sortFilesByModTime', () => {
    it('should sort files by modification time (newest first)', () => {
      const files = [
        {
          name: 'old.txt',
          path: '/old.txt',
          isDirectory: false,
          mtime: new Date('2023-01-01'),
        },
        {
          name: 'new.txt',
          path: '/new.txt',
          isDirectory: false,
          mtime: new Date('2024-01-01'),
        },
        {
          name: 'middle.txt',
          path: '/middle.txt',
          isDirectory: false,
          mtime: new Date('2023-06-01'),
        },
      ];

      const sorted = sortFilesByModTime(files);

      expect(sorted[0].name).toBe('new.txt');
      expect(sorted[1].name).toBe('middle.txt');
      expect(sorted[2].name).toBe('old.txt');
    });

    it('should put directories first regardless of modification time', () => {
      const files = [
        {
          name: 'new-file.txt',
          path: '/new-file.txt',
          isDirectory: false,
          mtime: new Date('2024-01-01'),
        },
        {
          name: 'old-dir',
          path: '/old-dir',
          isDirectory: true,
          mtime: new Date('2023-01-01'),
        },
      ];

      const sorted = sortFilesByModTime(files);

      expect(sorted[0].name).toBe('old-dir');
      expect(sorted[1].name).toBe('new-file.txt');
    });
  });

  describe('filterFilesByPattern', () => {
    it('should filter files by glob pattern', () => {
      const files = [
        { name: 'test.ts', path: '/test.ts', isDirectory: false, mtime: new Date() },
        { name: 'test.js', path: '/test.js', isDirectory: false, mtime: new Date() },
        { name: 'README.md', path: '/README.md', isDirectory: false, mtime: new Date() },
        { name: 'src', path: '/src', isDirectory: true, mtime: new Date() },
      ];

      const filtered = filterFilesByPattern(files, '*.ts');

      expect(filtered).toHaveLength(2); // 1 matching file + 1 directory
      expect(filtered.some(f => f.name === 'test.ts')).toBe(true);
      expect(filtered.some(f => f.name === 'src')).toBe(true); // Directory always included
    });

    it('should handle multiple patterns', () => {
      const files = [
        { name: 'test.ts', path: '/test.ts', isDirectory: false, mtime: new Date() },
        { name: 'test.js', path: '/test.js', isDirectory: false, mtime: new Date() },
        { name: 'test.py', path: '/test.py', isDirectory: false, mtime: new Date() },
        { name: 'README.md', path: '/README.md', isDirectory: false, mtime: new Date() },
      ];

      const filtered = filterFilesByPattern(files, '*.{ts,js}');

      expect(filtered).toHaveLength(2);
      expect(filtered.map(f => f.name)).toContain('test.ts');
      expect(filtered.map(f => f.name)).toContain('test.js');
    });

    it('should always include directories', () => {
      const files = [
        { name: 'test.txt', path: '/test.txt', isDirectory: false, mtime: new Date() },
        { name: 'src', path: '/src', isDirectory: true, mtime: new Date() },
      ];

      const filtered = filterFilesByPattern(files, '*.md');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('src');
    });

    it('should return all files when pattern is empty', () => {
      const files = [
        { name: 'test.ts', path: '/test.ts', isDirectory: false, mtime: new Date() },
        { name: 'test.js', path: '/test.js', isDirectory: false, mtime: new Date() },
      ];

      const filtered = filterFilesByPattern(files, '');

      expect(filtered).toHaveLength(2);
    });
  });
});