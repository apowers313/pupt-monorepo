import type { Dirent, Stats } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _injectModulesForTesting,
  _resetModulesForTesting,
  createFileSearchEngine,
  type FileInfo,
  FileSearchEngine,
} from '../../../src/services/file-search-engine';

describe('FileSearchEngine', () => {
  let engine: FileSearchEngine;

  // Mock fs functions
  const mockReaddirSync = vi.fn();
  const mockStatSync = vi.fn();

  // Create mock fs module
  const mockFs = {
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
  } as unknown as typeof import('fs');

  const mockFiles = [
    { name: 'design', isDirectory: true, modTime: new Date('2024-01-01') },
    { name: 'demo.txt', isDirectory: false, modTime: new Date('2024-01-02') },
    { name: 'README.md', isDirectory: false, modTime: new Date('2024-01-03') },
    { name: 'file-input.md', isDirectory: false, modTime: new Date('2024-01-04') },
    { name: 'src', isDirectory: true, modTime: new Date('2024-01-05') },
  ];

  function setupMocks(files = mockFiles) {
    mockReaddirSync.mockReturnValue(files.map(f => f.name));
    mockStatSync.mockImplementation((filePath) => {
      const name = path.basename(filePath as string);
      const file = files.find(f => f.name === name);
      return {
        isDirectory: () => file?.isDirectory ?? false,
        mtime: file?.modTime ?? new Date(),
      };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Inject mock modules before creating engine
    _injectModulesForTesting({ path, fs: mockFs, os });
    engine = new FileSearchEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _resetModulesForTesting();
  });

  describe('constructor', () => {
    it('should use current directory as default base path', () => {
      const eng = new FileSearchEngine();
      expect(eng.getBasePath()).toBe(path.resolve('.'));
    });

    it('should accept custom base path', () => {
      const eng = new FileSearchEngine({ basePath: '/tmp' });
      expect(eng.getBasePath()).toBe(path.resolve('/tmp'));
    });

    it('should accept filter option', () => {
      setupMocks();
      const eng = new FileSearchEngine({ filter: '*.md' });
      // Filter is applied during search, not construction
      expect(eng).toBeDefined();
    });

    it('should accept cache configuration', () => {
      const eng = new FileSearchEngine({
        cacheTimeout: 10000,
        maxCacheEntries: 50,
      });
      expect(eng).toBeDefined();
    });
  });

  describe('search', () => {
    it('should return all files when query is empty', async () => {
      setupMocks();
      const results = await engine.search('');

      // Should not include hidden files
      expect(results.length).toBe(mockFiles.length);
      expect(results.map(r => r.name)).toEqual(expect.arrayContaining(mockFiles.map(f => f.name)));
    });

    it('should filter files by prefix match', async () => {
      setupMocks();
      const results = await engine.search('de');

      // 'design' and 'demo.txt' start with 'de'
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.map(r => r.name)).toContain('design');
      expect(results.map(r => r.name)).toContain('demo.txt');
    });

    it('should support fuzzy matching', async () => {
      setupMocks();
      // 'fi' matches 'file-input.md' via fuzzy (f...i sequence)
      const results = await engine.search('fi');

      expect(results.some(r => r.name === 'file-input.md')).toBe(true);
    });

    it('should prioritize prefix matches over fuzzy matches', async () => {
      setupMocks([
        { name: 'design', isDirectory: true, modTime: new Date() },
        { name: 'readme', isDirectory: false, modTime: new Date() }, // fuzzy match for 'de'
      ]);

      const results = await engine.search('de');

      // 'design' starts with 'de', so it should be first
      expect(results[0].name).toBe('design');
    });

    it('should prioritize directories over files with same prefix match', async () => {
      setupMocks([
        { name: 'docs.txt', isDirectory: false, modTime: new Date() },
        { name: 'docs', isDirectory: true, modTime: new Date() },
      ]);

      const results = await engine.search('doc');

      expect(results[0].name).toBe('docs');
      expect(results[0].isDirectory).toBe(true);
    });

    it('should handle directory navigation', async () => {
      const designFiles = [
        { name: 'phase1.md', isDirectory: false, modTime: new Date() },
        { name: 'phase2.md', isDirectory: false, modTime: new Date() },
      ];

      mockReaddirSync.mockImplementation((dirPath) => {
        if ((dirPath as string).includes('design')) {
          return designFiles.map(f => f.name) as unknown as Dirent[];
        }
        return mockFiles.map(f => f.name) as unknown as Dirent[];
      });

      mockStatSync.mockImplementation((filePath) => {
        const name = path.basename(filePath as string);
        const allFiles = [...mockFiles, ...designFiles];
        const file = allFiles.find(f => f.name === name);
        return {
          isDirectory: () => file?.isDirectory ?? false,
          mtime: file?.modTime ?? new Date(),
        } as Stats;
      });

      const results = await engine.search('design/ph');

      expect(results.length).toBe(2);
      expect(results.every(r => r.name.startsWith('phase'))).toBe(true);
    });

    it('should return empty array for non-existent directory', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const results = await engine.search('nonexistent/');

      expect(results).toEqual([]);
    });

    it('should respect abort signal', async () => {
      setupMocks();
      const controller = new AbortController();
      controller.abort();

      const results = await engine.search('de', controller.signal);

      expect(results).toEqual([]);
    });

    it('should skip hidden files', async () => {
      setupMocks([
        { name: '.git', isDirectory: true, modTime: new Date() },
        { name: '.env', isDirectory: false, modTime: new Date() },
        { name: 'visible.txt', isDirectory: false, modTime: new Date() },
      ]);

      const results = await engine.search('');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('visible.txt');
    });

    it('should apply file filter', async () => {
      setupMocks([
        { name: 'doc.md', isDirectory: false, modTime: new Date() },
        { name: 'script.ts', isDirectory: false, modTime: new Date() },
        { name: 'docs', isDirectory: true, modTime: new Date() },
      ]);

      const filteredEngine = new FileSearchEngine({ filter: '*.md' });
      const results = await filteredEngine.search('');

      // Should include .md files and directories (filter doesn't apply to dirs)
      expect(results.map(r => r.name)).toContain('doc.md');
      expect(results.map(r => r.name)).toContain('docs');
      expect(results.map(r => r.name)).not.toContain('script.ts');
    });
  });

  describe('listDirectory', () => {
    it('should list all files in a directory', async () => {
      setupMocks();
      const results = await engine.listDirectory('.');

      expect(results.length).toBe(mockFiles.length);
    });

    it('should normalize path before listing', async () => {
      setupMocks();
      const results = await engine.listDirectory('./');

      expect(results.length).toBe(mockFiles.length);
    });
  });

  describe('parseSearchQuery', () => {
    it('should parse query without path separator', () => {
      const result = engine.parseSearchQuery('demo');

      expect(result.searchPath).toBe('.');
      expect(result.searchTerm).toBe('demo');
    });

    it('should parse query with forward slash', () => {
      const result = engine.parseSearchQuery('design/phase');

      expect(result.searchPath).toBe('design/');
      expect(result.searchTerm).toBe('phase');
    });

    it('should handle empty query', () => {
      const result = engine.parseSearchQuery('');

      expect(result.searchPath).toBe('.');
      expect(result.searchTerm).toBe('');
    });

    it('should handle query ending with separator', () => {
      const result = engine.parseSearchQuery('design/');

      expect(result.searchPath).toBe('design/');
      expect(result.searchTerm).toBe('');
    });

    it('should handle absolute paths', () => {
      const result = engine.parseSearchQuery('/usr/local/bin/');

      expect(result.searchPath).toBe('/usr/local/bin/');
      expect(result.searchTerm).toBe('');
    });

    it('should handle nested paths', () => {
      const result = engine.parseSearchQuery('src/components/Button');

      expect(result.searchPath).toBe('src/components/');
      expect(result.searchTerm).toBe('Button');
    });

    it('should handle backslashes on Windows', () => {
      const result = engine.parseSearchQuery('design\\phase');

      expect(result.searchPath).toBe('design\\');
      expect(result.searchTerm).toBe('phase');
    });
  });

  describe('normalizePathInput', () => {
    it('should return empty string for empty input', () => {
      const result = engine.normalizePathInput('');

      expect(result).toBe('');
    });

    it('should expand home directory', () => {
      const home = os.homedir();
      const result = engine.normalizePathInput('~/Documents');

      expect(result).toBe(path.join(home, 'Documents'));
    });

    it('should normalize path with ..', () => {
      const result = engine.normalizePathInput('./design/../docs');

      expect(result).toBe('docs');
    });

    it('should handle already normalized paths', () => {
      const result = engine.normalizePathInput('design/docs');

      expect(result).toBe(path.normalize('design/docs'));
    });
  });

  describe('resolveToAbsolutePath', () => {
    it('should resolve relative path to absolute', () => {
      const result = engine.resolveToAbsolutePath('design');

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('design');
    });

    it('should handle home directory', () => {
      const result = engine.resolveToAbsolutePath('~/test');

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain(os.homedir());
    });
  });

  describe('formatFileInfo', () => {
    it('should format directory with trailing slash', () => {
      const fileInfo: FileInfo = {
        name: 'design',
        absolutePath: '/home/user/project/design',
        relativePath: 'design',
        isDirectory: true,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);

      expect(formatted.display).toBe('design/');
      expect(formatted.value).toBe('/home/user/project/design');
      expect(formatted.description).toBe('design');
    });

    it('should format file without trailing slash', () => {
      const fileInfo: FileInfo = {
        name: 'README.md',
        absolutePath: '/home/user/project/README.md',
        relativePath: 'README.md',
        isDirectory: false,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);

      expect(formatted.display).toBe('README.md');
      expect(formatted.value).toBe('/home/user/project/README.md');
    });

    it('should use forward slashes in display for nested paths', () => {
      const fileInfo: FileInfo = {
        name: 'file.txt',
        absolutePath: '/home/user/project/src/file.txt',
        relativePath: 'src/file.txt',
        isDirectory: false,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);

      expect(formatted.display).toBe('src/file.txt');
    });

    it('should convert backslashes to forward slashes in display', () => {
      const fileInfo: FileInfo = {
        name: 'file.txt',
        absolutePath: 'C:\\Users\\name\\file.txt',
        relativePath: 'Users\\name\\file.txt',
        isDirectory: false,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);

      expect(formatted.display).toBe('Users/name/file.txt');
    });
  });

  describe('isFileSystemCaseSensitive', () => {
    it('should return correct value based on platform', () => {
      const result = engine.isFileSystemCaseSensitive();

      // Linux is case-sensitive, macOS and Windows are not
      const expected = process.platform !== 'win32' && process.platform !== 'darwin';
      expect(result).toBe(expected);
    });
  });

  describe('cache management', () => {
    it('should cache directory listings', async () => {
      setupMocks();

      // First call
      await engine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await engine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      setupMocks();

      await engine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);

      engine.clearCache();

      await engine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache after timeout', async () => {
      const shortCacheEngine = new FileSearchEngine({ cacheTimeout: 10 });
      setupMocks();

      await shortCacheEngine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      await shortCacheEngine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('setBasePath', () => {
    it('should update base path and clear cache', async () => {
      setupMocks();

      await engine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);

      engine.setBasePath('/tmp');
      expect(engine.getBasePath()).toBe(path.resolve('/tmp'));

      // Cache should be cleared, so next search should call readdirSync
      await engine.search('');
      expect(mockReaddirSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('createFileSearchEngine factory', () => {
    it('should create a FileSearchEngine instance', async () => {
      const eng = await createFileSearchEngine();

      expect(eng).toBeInstanceOf(FileSearchEngine);
    });

    it('should pass config to constructor', async () => {
      const eng = await createFileSearchEngine({ basePath: '/tmp' });

      expect(eng.getBasePath()).toBe(path.resolve('/tmp'));
    });
  });

  describe('FileSearchEngine.create factory', () => {
    it('should create a FileSearchEngine instance', async () => {
      const eng = await FileSearchEngine.create();

      expect(eng).toBeInstanceOf(FileSearchEngine);
    });

    it('should pass config to constructor', async () => {
      const eng = await FileSearchEngine.create({ basePath: '/tmp' });

      expect(eng.getBasePath()).toBe(path.resolve('/tmp'));
    });
  });

  describe('fuzzy matching algorithm', () => {
    it('should match when all characters appear in order', async () => {
      setupMocks([
        { name: 'file-input.md', isDirectory: false, modTime: new Date() },
      ]);

      // 'fim' should match 'file-input.md' (f-i-m sequence exists)
      const results = await engine.search('fim');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('file-input.md');
    });

    it('should not match when characters are out of order', async () => {
      setupMocks([
        { name: 'abc', isDirectory: false, modTime: new Date() },
      ]);

      // 'cba' should not match 'abc'
      const results = await engine.search('cba');

      expect(results.length).toBe(0);
    });

    it('should handle single character searches', async () => {
      setupMocks([
        { name: 'design', isDirectory: true, modTime: new Date() },
        { name: 'src', isDirectory: true, modTime: new Date() },
      ]);

      const results = await engine.search('d');

      expect(results.some(r => r.name === 'design')).toBe(true);
    });
  });

  describe('sorting', () => {
    it('should sort alphabetically within same category', async () => {
      setupMocks([
        { name: 'zebra', isDirectory: false, modTime: new Date() },
        { name: 'alpha', isDirectory: false, modTime: new Date() },
        { name: 'beta', isDirectory: false, modTime: new Date() },
      ]);

      const results = await engine.search('');

      expect(results[0].name).toBe('alpha');
      expect(results[1].name).toBe('beta');
      expect(results[2].name).toBe('zebra');
    });
  });

  describe('filter matching', () => {
    it('should filter by extension with glob pattern', async () => {
      setupMocks([
        { name: 'doc.md', isDirectory: false, modTime: new Date() },
        { name: 'script.ts', isDirectory: false, modTime: new Date() },
        { name: 'readme.md', isDirectory: false, modTime: new Date() },
      ]);

      const filteredEngine = new FileSearchEngine({ filter: '*.md' });
      const results = await filteredEngine.search('');

      expect(results.length).toBe(2);
      expect(results.map(r => r.name)).toContain('doc.md');
      expect(results.map(r => r.name)).toContain('readme.md');
      expect(results.map(r => r.name)).not.toContain('script.ts');
    });

    it('should filter by name substring without glob', async () => {
      setupMocks([
        { name: 'test-file.ts', isDirectory: false, modTime: new Date() },
        { name: 'other.ts', isDirectory: false, modTime: new Date() },
        { name: 'test-util.ts', isDirectory: false, modTime: new Date() },
      ]);

      const filteredEngine = new FileSearchEngine({ filter: 'test' });
      const results = await filteredEngine.search('');

      expect(results.length).toBe(2);
      expect(results.map(r => r.name)).toContain('test-file.ts');
      expect(results.map(r => r.name)).toContain('test-util.ts');
      expect(results.map(r => r.name)).not.toContain('other.ts');
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest cache entry when max entries exceeded', async () => {
      // Create engine with very small cache
      const smallCacheEngine = new FileSearchEngine({ maxCacheEntries: 2 });

      // Mock different directories
      mockReaddirSync.mockImplementation((dirPath) => {
        const dir = path.basename(dirPath as string);
        return [`file-in-${dir}.txt`] as unknown as Dirent[];
      });

      mockStatSync.mockReturnValue({
        isDirectory: () => false,
        mtime: new Date(),
      } as Stats);

      // Fill cache with 2 entries
      await smallCacheEngine.search('dir1/');
      await smallCacheEngine.search('dir2/');

      // This should trigger eviction of the oldest entry
      await smallCacheEngine.search('dir3/');

      // Verify we called readdir for all 3 directories
      expect(mockReaddirSync).toHaveBeenCalledTimes(3);

      // Clear mocks and search again - dir1 should have been evicted
      mockReaddirSync.mockClear();

      // dir2 and dir3 should still be cached
      await smallCacheEngine.search('dir2/');
      await smallCacheEngine.search('dir3/');

      // dir1 should trigger a new read since it was evicted
      await smallCacheEngine.search('dir1/');

      // Only dir1 should have caused a new readdirSync call
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should skip files that cannot be statted', async () => {
      mockReaddirSync.mockReturnValue(['good.txt', 'bad.txt', 'also-good.txt'] as unknown as Dirent[]);

      mockStatSync.mockImplementation((filePath) => {
        const name = path.basename(filePath as string);
        if (name === 'bad.txt') {
          throw new Error('Permission denied');
        }
        return {
          isDirectory: () => false,
          mtime: new Date(),
        } as Stats;
      });

      const results = await engine.search('');

      // Should have 2 results (skipping the one that failed)
      expect(results.length).toBe(2);
      expect(results.map(r => r.name)).toContain('good.txt');
      expect(results.map(r => r.name)).toContain('also-good.txt');
      expect(results.map(r => r.name)).not.toContain('bad.txt');
    });
  });
});
