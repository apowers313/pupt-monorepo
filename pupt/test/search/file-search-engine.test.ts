import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FileSearchEngine } from '../../src/search/file-search-engine.js';
import fs from 'fs-extra';
import * as path from 'path';
import os from 'os';

vi.mock('fs-extra', () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('FileSearchEngine', () => {
  let engine: FileSearchEngine;
  const mockFiles = [
    { name: 'design', isDirectory: true, modTime: new Date() },
    { name: 'demo.txt', isDirectory: false, modTime: new Date() },
    { name: 'README.md', isDirectory: false, modTime: new Date() },
    { name: 'file-input.md', isDirectory: false, modTime: new Date() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new FileSearchEngine('.');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should return all files when query is empty', async () => {
      vi.mocked(fs).readdir.mockResolvedValue(
        mockFiles.map(f => f.name) as any
      );
      vi.mocked(fs).stat.mockImplementation(async (filePath) => {
        const name = path.basename(filePath as string);
        const file = mockFiles.find(f => f.name === name);
        return {
          isDirectory: () => file?.isDirectory || false,
          mtime: file?.modTime || new Date(),
        } as any;
      });

      const results = await engine.search('');
      expect(results).toHaveLength(mockFiles.length);
      expect(results.map(r => r.name)).toEqual(mockFiles.map(f => f.name));
    });

    it('should filter files by prefix match', async () => {
      vi.mocked(fs).readdir.mockResolvedValue(
        mockFiles.map(f => f.name) as any
      );
      vi.mocked(fs).stat.mockImplementation(async (filePath) => {
        const name = path.basename(filePath as string);
        const file = mockFiles.find(f => f.name === name);
        return {
          isDirectory: () => file?.isDirectory || false,
          mtime: file?.modTime || new Date(),
        } as any;
      });

      const results = await engine.search('de');
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toContain('design');
      expect(results.map(r => r.name)).toContain('demo.txt');
    });

    it('should handle directory navigation', async () => {
      const designFiles = [
        { name: 'phase1.md', isDirectory: false, modTime: new Date() },
        { name: 'phase2.md', isDirectory: false, modTime: new Date() },
        { name: 'phase3.md', isDirectory: false, modTime: new Date() },
      ];

      vi.mocked(fs).readdir.mockImplementation(async (dirPath) => {
        const normalizedPath = path.resolve(dirPath as string);
        const designPath = path.resolve('.', 'design');
        
        if (normalizedPath === designPath) {
          return designFiles.map(f => f.name) as any;
        }
        return mockFiles.map(f => f.name) as any;
      });

      vi.mocked(fs).stat.mockImplementation(async (filePath) => {
        const name = path.basename(filePath as string);
        const allFiles = [...mockFiles, ...designFiles];
        const file = allFiles.find(f => f.name === name);
        return {
          isDirectory: () => file?.isDirectory || false,
          mtime: file?.modTime || new Date(),
        } as any;
      });

      const results = await engine.search('design/ph');
      expect(results).toHaveLength(3);
      expect(results.every(r => r.name.startsWith('phase'))).toBe(true);
    });

    it('should prioritize exact prefix matches', async () => {
      vi.mocked(fs).readdir.mockResolvedValue(
        mockFiles.map(f => f.name) as any
      );
      vi.mocked(fs).stat.mockImplementation(async (filePath) => {
        const name = path.basename(filePath as string);
        const file = mockFiles.find(f => f.name === name);
        return {
          isDirectory: () => file?.isDirectory || false,
          mtime: file?.modTime || new Date(),
        } as any;
      });

      const results = await engine.search('des');
      expect(results[0].name).toBe('design'); // Exact prefix match should be first
    });

    it('should handle case-insensitive search on Windows/macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      vi.mocked(fs).readdir.mockResolvedValue(
        mockFiles.map(f => f.name) as any
      );
      vi.mocked(fs).stat.mockImplementation(async (filePath) => {
        const name = path.basename(filePath as string);
        const file = mockFiles.find(f => f.name === name);
        return {
          isDirectory: () => file?.isDirectory || false,
          mtime: file?.modTime || new Date(),
        } as any;
      });

      const results = await engine.search('DES');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('design');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('parseSearchQuery', () => {
    it('should parse query without path separator', () => {
      const result = engine.parseSearchQuery('demo');
      expect(result.searchPath).toBe('.');
      expect(result.searchTerm).toBe('demo');
    });

    it('should parse query with path separator', () => {
      const result = engine.parseSearchQuery('design/phase');
      expect(result.searchPath).toBe('design' + path.sep);
      expect(result.searchTerm).toBe('phase');
    });

    it('should handle absolute paths', () => {
      const result = engine.parseSearchQuery('/usr/local/bin/');
      expect(result.searchPath).toBe('/usr/local/bin/');
      expect(result.searchTerm).toBe('');
    });

    it('should handle Windows paths', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const result = engine.parseSearchQuery('C:\\Users\\name\\des');
      expect(result.searchTerm).toBe('des');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('normalizePathInput', () => {
    it('should expand home directory', () => {
      const home = os.homedir();
      const result = engine.normalizePathInput('~/Documents');
      expect(result).toBe(path.join(home, 'Documents'));
    });

    it('should normalize path separators', () => {
      const result = engine.normalizePathInput('./design/../docs');
      expect(result).toBe('docs');
    });

    it('should handle Windows forward slashes', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // Need to create a new engine instance after changing platform
      const winEngine = new FileSearchEngine('.');
      const result = winEngine.normalizePathInput('C:/Users/name');
      
      // On Windows, forward slashes should be converted to backslashes
      expect(result).toContain('Users');
      expect(result).toContain('name');
      expect(result.startsWith('C:')).toBe(true);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('formatFileInfo', () => {
    it('should format directory with trailing slash', () => {
      const fileInfo = {
        name: 'design',
        absolutePath: '/home/user/project/design',
        relativePath: 'design',
        isDirectory: true,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);
      expect(formatted.display).toBe('design/');
      expect(formatted.value).toBe(fileInfo.absolutePath);
    });

    it('should format file without trailing slash', () => {
      const fileInfo = {
        name: 'README.md',
        absolutePath: '/home/user/project/README.md',
        relativePath: 'README.md',
        isDirectory: false,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);
      expect(formatted.display).toBe('README.md');
      expect(formatted.value).toBe(fileInfo.absolutePath);
    });

    it('should use forward slashes in display on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const fileInfo = {
        name: 'file.txt',
        absolutePath: 'C:\\Users\\name\\file.txt',
        relativePath: 'Users\\name\\file.txt',
        isDirectory: false,
        modTime: new Date(),
      };

      const formatted = engine.formatFileInfo(fileInfo);
      expect(formatted.display).toBe('Users/name/file.txt');
      expect(formatted.value).toBe('C:\\Users\\name\\file.txt');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});