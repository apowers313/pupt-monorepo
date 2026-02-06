import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  listFiles,
  sortFilesByModTime,
  filterFilesByPattern,
  listFilesWithCache,
  resolveFilePath,
  expandPath,
} from '../../src/utils/file-utils.js';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

describe('File Utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-utils-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('listFiles', () => {
    it('should list all files and directories', async () => {
      // Create test structure
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.md'), 'content2');
      await fs.ensureDir(path.join(tempDir, 'subdir'));

      const files = listFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files.map(f => f.name).sort()).toEqual(['file1.txt', 'file2.md', 'subdir'].sort());

      const file1 = files.find(f => f.name === 'file1.txt');
      expect(file1).toBeDefined();
      expect(file1?.isDirectory).toBe(false);
      expect(file1?.path).toBe(path.join(tempDir, 'file1.txt'));
      expect(file1?.mtime).toBeInstanceOf(Date);

      const subdir = files.find(f => f.name === 'subdir');
      expect(subdir).toBeDefined();
      expect(subdir?.isDirectory).toBe(true);
    });

    it('should exclude hidden files by default', async () => {
      await fs.writeFile(path.join(tempDir, 'visible.txt'), 'content');
      await fs.writeFile(path.join(tempDir, '.hidden'), 'secret');
      await fs.ensureDir(path.join(tempDir, '.hidden-dir'));

      const files = listFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('visible.txt');
    });

    it('should include hidden files when option is set', async () => {
      await fs.writeFile(path.join(tempDir, 'visible.txt'), 'content');
      await fs.writeFile(path.join(tempDir, '.hidden'), 'secret');
      await fs.ensureDir(path.join(tempDir, '.hidden-dir'));

      const files = listFiles(tempDir, { includeHidden: true });

      expect(files).toHaveLength(3);
      expect(files.map(f => f.name).sort()).toEqual(['.hidden', '.hidden-dir', 'visible.txt'].sort());
    });

    it('should return empty array for empty directory', async () => {
      const files = listFiles(tempDir);

      expect(files).toEqual([]);
    });

    it('should throw error for non-existent directory', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');

      expect(() => listFiles(nonExistentPath)).toThrow('Directory not found');
    });

    it('should throw original error for non-ENOENT errors', async () => {
      // Create a file (not a directory) to trigger ENOTDIR error
      const filePath = path.join(tempDir, 'regular-file.txt');
      await fs.writeFile(filePath, 'content');

      // Try to list it as if it were a directory - should throw but not wrap the error
      expect(() => listFiles(filePath)).toThrow();
    });

    it('should handle files with special characters in names', async () => {
      await fs.writeFile(path.join(tempDir, 'file with spaces.txt'), 'content');
      await fs.writeFile(path.join(tempDir, 'file-with-dashes.txt'), 'content');
      await fs.writeFile(path.join(tempDir, 'file_with_underscores.txt'), 'content');

      const files = listFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files.map(f => f.name)).toContain('file with spaces.txt');
      expect(files.map(f => f.name)).toContain('file-with-dashes.txt');
      expect(files.map(f => f.name)).toContain('file_with_underscores.txt');
    });

    it('should properly set mtime for all files', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content');

      // Wait a bit to ensure different mtime
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content');

      const files = listFiles(tempDir);

      expect(files).toHaveLength(2);
      files.forEach(file => {
        expect(file.mtime).toBeInstanceOf(Date);
        expect(file.mtime.getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('sortFilesByModTime', () => {
    it('should sort with directories first, then by modification time', async () => {
      // Create files with specific mtimes
      const file1Path = path.join(tempDir, 'old-file.txt');
      const file2Path = path.join(tempDir, 'new-file.txt');
      const dir1Path = path.join(tempDir, 'old-dir');
      const dir2Path = path.join(tempDir, 'new-dir');

      await fs.writeFile(file1Path, 'content');
      await fs.ensureDir(dir1Path);

      // Wait to ensure different mtimes
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.writeFile(file2Path, 'content');
      await fs.ensureDir(dir2Path);

      const files = listFiles(tempDir);
      const sorted = sortFilesByModTime(files);

      // Directories should come first
      expect(sorted[0].isDirectory).toBe(true);
      expect(sorted[1].isDirectory).toBe(true);
      expect(sorted[2].isDirectory).toBe(false);
      expect(sorted[3].isDirectory).toBe(false);

      // Among directories, newer should come first
      expect(sorted[0].name).toBe('new-dir');
      expect(sorted[1].name).toBe('old-dir');

      // Among files, newer should come first
      expect(sorted[2].name).toBe('new-file.txt');
      expect(sorted[3].name).toBe('old-file.txt');
    });

    it('should not mutate original array', () => {
      const files = [
        { name: 'file1', path: '/path1', isDirectory: false, mtime: new Date('2024-01-01') },
        { name: 'file2', path: '/path2', isDirectory: false, mtime: new Date('2024-01-02') },
      ];

      const sorted = sortFilesByModTime(files);

      expect(sorted).not.toBe(files);
      expect(files[0].name).toBe('file1');
      expect(files[1].name).toBe('file2');
    });

    it('should handle empty array', () => {
      const sorted = sortFilesByModTime([]);

      expect(sorted).toEqual([]);
    });

    it('should handle array with only directories', () => {
      const files = [
        { name: 'dir1', path: '/dir1', isDirectory: true, mtime: new Date('2024-01-01') },
        { name: 'dir2', path: '/dir2', isDirectory: true, mtime: new Date('2024-01-03') },
        { name: 'dir3', path: '/dir3', isDirectory: true, mtime: new Date('2024-01-02') },
      ];

      const sorted = sortFilesByModTime(files);

      expect(sorted[0].name).toBe('dir2');
      expect(sorted[1].name).toBe('dir3');
      expect(sorted[2].name).toBe('dir1');
    });

    it('should handle array with only files', () => {
      const files = [
        { name: 'file1', path: '/file1', isDirectory: false, mtime: new Date('2024-01-01') },
        { name: 'file2', path: '/file2', isDirectory: false, mtime: new Date('2024-01-03') },
        { name: 'file3', path: '/file3', isDirectory: false, mtime: new Date('2024-01-02') },
      ];

      const sorted = sortFilesByModTime(files);

      expect(sorted[0].name).toBe('file2');
      expect(sorted[1].name).toBe('file3');
      expect(sorted[2].name).toBe('file1');
    });

    it('should handle files with identical mtimes', () => {
      const sameTime = new Date('2024-01-01');
      const files = [
        { name: 'file1', path: '/file1', isDirectory: false, mtime: sameTime },
        { name: 'file2', path: '/file2', isDirectory: false, mtime: sameTime },
      ];

      const sorted = sortFilesByModTime(files);

      // Should not throw and should return all files
      expect(sorted).toHaveLength(2);
    });
  });

  describe('filterFilesByPattern', () => {
    const createMockFiles = () => [
      { name: 'test.ts', path: '/test.ts', isDirectory: false, mtime: new Date() },
      { name: 'test.js', path: '/test.js', isDirectory: false, mtime: new Date() },
      { name: 'readme.md', path: '/readme.md', isDirectory: false, mtime: new Date() },
      { name: 'src', path: '/src', isDirectory: true, mtime: new Date() },
      { name: 'dist', path: '/dist', isDirectory: true, mtime: new Date() },
    ];

    it('should return all files when pattern is empty', () => {
      const files = createMockFiles();
      const filtered = filterFilesByPattern(files, '');

      expect(filtered).toEqual(files);
    });

    it('should always include directories', () => {
      const files = createMockFiles();
      const filtered = filterFilesByPattern(files, '*.ts');

      const directories = filtered.filter(f => f.isDirectory);
      expect(directories).toHaveLength(2);
      expect(directories.map(d => d.name)).toEqual(['src', 'dist']);
    });

    it('should filter files by extension pattern', () => {
      const files = createMockFiles();
      const filtered = filterFilesByPattern(files, '*.ts');

      const nonDirFiles = filtered.filter(f => !f.isDirectory);
      expect(nonDirFiles).toHaveLength(1);
      expect(nonDirFiles[0].name).toBe('test.ts');
    });

    it('should support wildcard patterns', () => {
      const files = createMockFiles();
      const filtered = filterFilesByPattern(files, 'test.*');

      const nonDirFiles = filtered.filter(f => !f.isDirectory);
      expect(nonDirFiles).toHaveLength(2);
      expect(nonDirFiles.map(f => f.name).sort()).toEqual(['test.js', 'test.ts'].sort());
    });

    it('should support complex glob patterns', () => {
      const files = [
        { name: 'test.spec.ts', path: '/test.spec.ts', isDirectory: false, mtime: new Date() },
        { name: 'test.test.ts', path: '/test.test.ts', isDirectory: false, mtime: new Date() },
        { name: 'app.ts', path: '/app.ts', isDirectory: false, mtime: new Date() },
      ];

      const filtered = filterFilesByPattern(files, '*.spec.ts');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('test.spec.ts');
    });

    it('should handle no matches', () => {
      const files = createMockFiles();
      const filtered = filterFilesByPattern(files, '*.py');

      // Should only include directories
      expect(filtered.every(f => f.isDirectory)).toBe(true);
      expect(filtered).toHaveLength(2);
    });

    it('should handle empty file list', () => {
      const filtered = filterFilesByPattern([], '*.ts');

      expect(filtered).toEqual([]);
    });
  });

  describe('listFilesWithCache', () => {
    it('should cache results and return cached version on second call', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');

      const result1 = listFilesWithCache(tempDir);
      const result2 = listFilesWithCache(tempDir);

      expect(result1).toEqual(result2);
      expect(result1).toBe(result2); // Same reference
    });

    it('should use different cache for different options', async () => {
      await fs.writeFile(path.join(tempDir, 'visible.txt'), 'content');
      await fs.writeFile(path.join(tempDir, '.hidden'), 'secret');

      const result1 = listFilesWithCache(tempDir);
      const result2 = listFilesWithCache(tempDir, { includeHidden: true });

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(2);
    });

    it('should use different cache for different directories', async () => {
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'file-utils-test-2-'));

      try {
        await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
        await fs.writeFile(path.join(tempDir2, 'file2.txt'), 'content2');

        const result1 = listFilesWithCache(tempDir);
        const result2 = listFilesWithCache(tempDir2);

        expect(result1).toHaveLength(1);
        expect(result1[0].name).toBe('file1.txt');
        expect(result2).toHaveLength(1);
        expect(result2[0].name).toBe('file2.txt');
      } finally {
        await fs.remove(tempDir2);
      }
    });

    it('should refresh cache after TTL expires', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');

      const result1 = listFilesWithCache(tempDir);
      expect(result1).toHaveLength(1);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const startTime = Date.now();

      // First call sets cache at startTime
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 6000); // 6 seconds later (past 5s TTL)

      // Add a new file
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content');

      const result2 = listFilesWithCache(tempDir);

      // Should see the new file because cache expired
      expect(result2).toHaveLength(2);

      Date.now = originalNow;
    });

    it('should work with includeHidden option', async () => {
      await fs.writeFile(path.join(tempDir, 'visible.txt'), 'content');
      await fs.writeFile(path.join(tempDir, '.hidden'), 'secret');

      const result = listFilesWithCache(tempDir, { includeHidden: true });

      expect(result).toHaveLength(2);
      expect(result.map(f => f.name).sort()).toEqual(['.hidden', 'visible.txt'].sort());
    });
  });

  describe('resolveFilePath', () => {
    it('should return absolute path unchanged', () => {
      const absolutePath = '/home/user/file.txt';
      const result = resolveFilePath(absolutePath, '/some/base/path');

      expect(result).toBe(absolutePath);
    });

    it('should resolve relative path against base path', () => {
      const relativePath = 'file.txt';
      const basePath = '/home/user/project';
      const result = resolveFilePath(relativePath, basePath);

      expect(result).toBe(path.resolve(basePath, relativePath));
    });

    it('should handle parent directory references', () => {
      const relativePath = '../file.txt';
      const basePath = '/home/user/project/src';
      const result = resolveFilePath(relativePath, basePath);

      expect(result).toBe(path.resolve(basePath, relativePath));
    });

    it('should handle current directory references', () => {
      const relativePath = './file.txt';
      const basePath = '/home/user/project';
      const result = resolveFilePath(relativePath, basePath);

      expect(result).toBe(path.resolve(basePath, relativePath));
    });

    it('should handle nested relative paths', () => {
      const relativePath = 'src/utils/file.txt';
      const basePath = '/home/user/project';
      const result = resolveFilePath(relativePath, basePath);

      expect(result).toBe(path.resolve(basePath, relativePath));
    });

    it('should work on Windows-style paths', () => {
      if (process.platform === 'win32') {
        const absolutePath = 'C:\\Users\\test\\file.txt';
        const result = resolveFilePath(absolutePath, 'C:\\base');

        expect(result).toBe(absolutePath);
      }
    });
  });

  describe('expandPath', () => {
    let savedHome: string | undefined;
    let savedUserProfile: string | undefined;

    beforeEach(() => {
      savedHome = process.env.HOME;
      savedUserProfile = process.env.USERPROFILE;
    });

    afterEach(() => {
      if (savedHome !== undefined) {
        process.env.HOME = savedHome;
      } else {
        delete process.env.HOME;
      }
      if (savedUserProfile !== undefined) {
        process.env.USERPROFILE = savedUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
    });

    it('should expand ~ to home directory', () => {
      const homeDir = os.homedir();
      const result = expandPath('~/documents/file.txt');

      expect(result).toBe(path.join(homeDir, 'documents/file.txt'));
    });

    it('should handle ~ alone', () => {
      const homeDir = os.homedir();
      const result = expandPath('~');

      // Should still be ~, not expanded (needs trailing /)
      expect(result).toBe('~');
    });

    it('should expand ~/ to home directory', () => {
      const homeDir = os.homedir();
      const result = expandPath('~/');

      expect(result).toBe(path.join(homeDir, ''));
    });

    it('should not expand paths that do not start with ~/', () => {
      const result = expandPath('/absolute/path');

      expect(result).toBe('/absolute/path');
    });

    it('should not expand relative paths', () => {
      const result = expandPath('relative/path');

      expect(result).toBe('relative/path');
    });

    it('should use HOME environment variable on Unix', () => {
      if (process.platform !== 'win32') {
        process.env.HOME = '/custom/home';
        const result = expandPath('~/file.txt');

        expect(result).toBe('/custom/home/file.txt');
      }
    });

    it('should use USERPROFILE on Windows when HOME is not set', () => {
      if (process.platform === 'win32') {
        delete process.env.HOME;
        process.env.USERPROFILE = 'C:\\Users\\TestUser';
        const result = expandPath('~/file.txt');

        expect(result).toContain('file.txt');
      }
    });

    it('should handle empty HOME/USERPROFILE gracefully', () => {
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      const result = expandPath('~/file.txt');

      // Should still work, using empty string for home
      expect(result).toBe(path.join('', 'file.txt'));
    });

    it('should handle paths with multiple segments after ~/', () => {
      const homeDir = os.homedir();
      const result = expandPath('~/a/b/c/d/file.txt');

      expect(result).toBe(path.join(homeDir, 'a/b/c/d/file.txt'));
    });
  });

  describe('integration: full workflow', () => {
    it('should work with expandPath -> resolveFilePath -> listFiles', async () => {
      // Create a test structure in temp dir
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content');
      await fs.ensureDir(path.join(tempDir, 'subdir'));

      // Simulate using relative path
      const relativePath = path.relative(process.cwd(), tempDir);
      const resolvedPath = resolveFilePath(relativePath, process.cwd());

      const files = listFiles(resolvedPath);

      expect(files).toHaveLength(3);
    });

    it('should work with listFiles -> sortFilesByModTime -> filterFilesByPattern', async () => {
      await fs.writeFile(path.join(tempDir, 'old.ts'), 'content');
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.writeFile(path.join(tempDir, 'new.js'), 'content');
      await fs.ensureDir(path.join(tempDir, 'dir'));

      const files = listFiles(tempDir);
      const sorted = sortFilesByModTime(files);
      const filtered = filterFilesByPattern(sorted, '*.ts');

      expect(filtered).toHaveLength(2); // directory + .ts file
      expect(filtered[0].isDirectory).toBe(true);
      expect(filtered[1].name).toBe('old.ts');
    });
  });
});
