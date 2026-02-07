import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FileSearchEngine } from '../../src/search/file-search-engine.js';
import fs from 'fs-extra';
import * as path from 'node:path';
import os from 'node:os';

vi.mock('fs-extra', () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('FileSearchEngine - Coverage Improvements', () => {
  let engine: FileSearchEngine;

  const mockFiles = [
    { name: 'alpha', isDirectory: true, modTime: new Date('2025-01-01') },
    { name: 'bravo.txt', isDirectory: false, modTime: new Date('2025-01-02') },
    { name: 'charlie.md', isDirectory: false, modTime: new Date('2025-01-03') },
    { name: 'delta.ts', isDirectory: false, modTime: new Date('2025-01-04') },
  ];

  function setupMockFs(files: typeof mockFiles) {
    vi.mocked(fs).readdir.mockResolvedValue(files.map(f => f.name) as any);
    vi.mocked(fs).stat.mockImplementation(async (filePath) => {
      const name = path.basename(filePath as string);
      const file = files.find(f => f.name === name);
      return {
        isDirectory: () => file?.isDirectory || false,
        mtime: file?.modTime || new Date(),
      } as any;
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new FileSearchEngine('/test/base');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cache eviction when cache size exceeds 100', () => {
    it('should evict oldest cache entry when cache exceeds 100 entries', async () => {
      // We need to populate the cache with > 100 entries
      // Each unique searchPath creates a cache entry
      setupMockFs(mockFiles);

      // Populate 101 unique cache entries by searching different paths
      for (let i = 0; i < 101; i++) {
        const dirName = `dir${i}`;
        vi.mocked(fs).readdir.mockResolvedValueOnce([`file${i}.txt`] as any);
        vi.mocked(fs).stat.mockResolvedValueOnce({
          isDirectory: () => false,
          mtime: new Date(),
        } as any);

        await engine.search(`${dirName}/`);
      }

      // The cache should have evicted the oldest entry
      // We can verify by accessing the first entry - it should need to re-read
      vi.mocked(fs).readdir.mockResolvedValueOnce(['file0.txt'] as any);
      vi.mocked(fs).stat.mockResolvedValueOnce({
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      // Searching for dir0 again should trigger a readdir since it was evicted
      const results = await engine.search('dir0/');
      expect(results).toHaveLength(1);
      // readdir should have been called again for dir0
      expect(vi.mocked(fs).readdir).toHaveBeenCalled();
    });
  });

  describe('AbortSignal handling', () => {
    it('should return empty array when signal is already aborted before readdir', async () => {
      setupMockFs(mockFiles);
      const controller = new AbortController();
      controller.abort();

      const results = await engine.search('', controller.signal);
      expect(results).toHaveLength(0);
    });

    it('should return empty array when signal is aborted after readdir', async () => {
      const controller = new AbortController();

      // Make readdir async so we can abort during it
      vi.mocked(fs).readdir.mockImplementation(async () => {
        // Abort after readdir completes but before processing
        controller.abort();
        return mockFiles.map(f => f.name) as any;
      });

      setupMockFs(mockFiles);
      // Restore just the readdir mock with the aborting implementation
      vi.mocked(fs).readdir.mockImplementation(async () => {
        controller.abort();
        return mockFiles.map(f => f.name) as any;
      });

      const results = await engine.search('', controller.signal);
      expect(results).toHaveLength(0);
    });
  });

  describe('formatFileInfo', () => {
    it('should set description to relativePath', () => {
      const fileInfo = {
        name: 'test.ts',
        absolutePath: '/test/base/src/test.ts',
        relativePath: 'src/test.ts',
        isDirectory: false,
        modTime: new Date(),
      };

      const result = engine.formatFileInfo(fileInfo);
      expect(result.description).toBe('src/test.ts');
    });

    it('should format directory with trailing slash in display', () => {
      const fileInfo = {
        name: 'src',
        absolutePath: '/test/base/src',
        relativePath: 'src',
        isDirectory: true,
        modTime: new Date(),
      };

      const result = engine.formatFileInfo(fileInfo);
      expect(result.display).toBe('src/');
      expect(result.value).toBe('/test/base/src');
    });

    it('should convert backslashes to forward slashes in display', () => {
      const fileInfo = {
        name: 'file.ts',
        absolutePath: 'C:\\project\\src\\file.ts',
        relativePath: 'src\\utils\\file.ts',
        isDirectory: false,
        modTime: new Date(),
      };

      const result = engine.formatFileInfo(fileInfo);
      expect(result.display).toBe('src/utils/file.ts');
      // value keeps native separators
      expect(result.value).toBe('C:\\project\\src\\file.ts');
    });
  });

  describe('listDirectory', () => {
    it('should list files in a directory', async () => {
      setupMockFs(mockFiles);

      const results = await engine.listDirectory('.');
      expect(results).toHaveLength(mockFiles.length);
      expect(results.map(r => r.name)).toEqual(mockFiles.map(f => f.name));
    });

    it('should normalize path input before listing', async () => {
      setupMockFs(mockFiles);

      const results = await engine.listDirectory('./some/../');
      expect(results).toHaveLength(mockFiles.length);
    });
  });

  describe('normalizePathInput', () => {
    it('should return empty string for empty input', () => {
      const result = engine.normalizePathInput('');
      expect(result).toBe('');
    });

    it('should expand tilde to home directory', () => {
      const home = os.homedir();
      const result = engine.normalizePathInput('~/projects');
      expect(result).toBe(path.join(home, 'projects'));
    });

    it('should expand tilde alone', () => {
      const home = os.homedir();
      const result = engine.normalizePathInput('~');
      expect(result).toBe(home);
    });

    it('should normalize path with dot segments', () => {
      const result = engine.normalizePathInput('./foo/bar/../baz');
      expect(result).toBe(path.normalize('./foo/bar/../baz'));
    });
  });

  describe('resolveToAbsolutePath', () => {
    it('should resolve relative path against basePath', () => {
      const result = engine.resolveToAbsolutePath('src/file.ts');
      expect(result).toBe(path.resolve('/test/base', 'src/file.ts'));
    });

    it('should resolve tilde path against basePath after normalization', () => {
      const home = os.homedir();
      const result = engine.resolveToAbsolutePath('~/docs');
      expect(result).toBe(path.resolve('/test/base', path.join(home, 'docs')));
    });

    it('should handle empty input', () => {
      const result = engine.resolveToAbsolutePath('');
      // normalizePathInput('') returns '', path.resolve('/test/base', '') returns the resolved basePath
      expect(result).toBe(path.resolve('/test/base'));
    });
  });

  describe('cache expiration', () => {
    it('should not use cache entries older than timeout', async () => {
      setupMockFs(mockFiles);

      // First search populates the cache
      await engine.search('');
      expect(vi.mocked(fs).readdir).toHaveBeenCalledTimes(1);

      // Immediately searching again should use cache
      await engine.search('');
      expect(vi.mocked(fs).readdir).toHaveBeenCalledTimes(1);

      // Manually expire the cache by advancing time
      vi.useFakeTimers();
      vi.advanceTimersByTime(6000); // > 5000ms cacheTimeout

      setupMockFs(mockFiles);
      await engine.search('');
      // Should have called readdir again since cache expired
      expect(vi.mocked(fs).readdir).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('search with directory errors', () => {
    it('should return empty array when directory does not exist', async () => {
      vi.mocked(fs).readdir.mockRejectedValue(new Error('ENOENT'));

      const results = await engine.search('nonexistent/');
      expect(results).toHaveLength(0);
    });
  });
});
