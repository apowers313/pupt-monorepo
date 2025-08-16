import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { FileSystemService } from '../../src/services/file-system-service';

describe('FileSystemService', () => {
  let service: FileSystemService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    service = new FileSystemService();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('expandPath', () => {
    it('should expand home directory with ~/', () => {
      const homedir = os.homedir();
      expect(service.expandPath('~/test')).toBe(path.join(homedir, 'test'));
    });

    it('should resolve relative paths', () => {
      expect(service.expandPath('./test')).toBe(path.resolve('./test'));
    });

    it('should keep absolute paths unchanged', () => {
      const absPath = '/usr/local/bin';
      expect(service.expandPath(absPath)).toBe(absPath);
    });
  });

  describe('listFiles', () => {
    beforeEach(async () => {
      // Create test file structure
      await fs.ensureDir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.md'), 'content2');
      await fs.writeFile(path.join(tempDir, '.hidden'), 'hidden');
      await fs.writeFile(path.join(tempDir, 'subdir', 'file3.txt'), 'content3');
    });

    it('should list files in directory', async () => {
      const files = await service.listFiles(tempDir);
      const fileNames = files.map(f => f.name).sort();
      expect(fileNames).toContain('file1.txt');
      expect(fileNames).toContain('file2.md');
      expect(fileNames).toContain('subdir');
    });

    it('should exclude hidden files by default', async () => {
      const files = await service.listFiles(tempDir);
      const fileNames = files.map(f => f.name);
      expect(fileNames).not.toContain('.hidden');
    });

    it('should include hidden files when specified', async () => {
      const files = await service.listFiles(tempDir, { includeHidden: true });
      const fileNames = files.map(f => f.name);
      expect(fileNames).toContain('.hidden');
    });

    it('should filter files by pattern', async () => {
      const files = await service.listFiles(tempDir, { pattern: '*.txt' });
      const fileNames = files.map(f => f.name);
      expect(fileNames).toContain('file1.txt');
      expect(fileNames).not.toContain('file2.md');
    });

    it('should use cache for repeated calls', async () => {
      const spy = vi.spyOn(fs, 'readdir');
      
      await service.listFiles(tempDir);
      await service.listFiles(tempDir);
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent directory', async () => {
      await expect(service.listFiles('/non/existent/path')).rejects.toThrow('Directory not found');
    });
  });

  describe('searchFiles', () => {
    beforeEach(async () => {
      // Create test file structure
      await fs.ensureDir(path.join(tempDir, 'src'));
      await fs.ensureDir(path.join(tempDir, 'test'));
      await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), '');
      await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), '');
      await fs.writeFile(path.join(tempDir, 'test', 'index.test.ts'), '');
    });

    it('should search files by query', async () => {
      const results = await service.searchFiles(tempDir, 'index');
      expect(results.length).toBe(2);
      expect(results.map(r => r.name)).toContain('index.ts');
      expect(results.map(r => r.name)).toContain('index.test.ts');
    });

    it('should support fuzzy search', async () => {
      const results = await service.searchFiles(tempDir, 'util');
      // Should only match utils.ts
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('utils.ts');
    });

    it('should build search index on first search', async () => {
      const spy = vi.spyOn(fs, 'readdir');
      
      await service.searchFiles(tempDir, 'index');
      await service.searchFiles(tempDir, 'utils');
      
      // Should read directory 3 times on first search (root + src + test dirs)
      // Second search should not trigger additional reads
      expect(spy).toHaveBeenCalledTimes(3); // Once for root, once for src, once for test
    });
  });

  describe('resolveSearchPath', () => {
    it('should parse search query correctly', () => {
      expect(service.resolveSearchPath('src/index')).toEqual({
        searchPath: 'src',
        searchTerm: 'index'
      });

      expect(service.resolveSearchPath('index')).toEqual({
        searchPath: '.',
        searchTerm: 'index'
      });

      expect(service.resolveSearchPath('/absolute/path/file')).toEqual({
        searchPath: '/absolute/path',
        searchTerm: 'file'
      });
    });

    it('should handle trailing slash', () => {
      expect(service.resolveSearchPath('src/')).toEqual({
        searchPath: 'src',
        searchTerm: ''
      });
    });
  });

  describe('normalizePath', () => {
    it('should normalize path separators', () => {
      if (process.platform === 'win32') {
        expect(service.normalizePath('src/test/file.ts')).toBe('src\\test\\file.ts');
      } else {
        expect(service.normalizePath('src\\test\\file.ts')).toBe('src/test/file.ts');
      }
    });

    it('should expand home directory', () => {
      const homedir = os.homedir();
      expect(service.normalizePath('~/test')).toBe(path.join(homedir, 'test'));
    });
  });

  describe('clearCache', () => {
    it('should clear file cache', async () => {
      const spy = vi.spyOn(fs, 'readdir');
      
      await service.listFiles(tempDir);
      service.clearCache();
      await service.listFiles(tempDir);
      
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('glob support', () => {
    beforeEach(async () => {
      await fs.ensureDir(path.join(tempDir, 'src', 'utils'));
      await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), '');
      await fs.writeFile(path.join(tempDir, 'src', 'utils', 'helper.ts'), '');
      await fs.writeFile(path.join(tempDir, 'src', 'utils', 'types.ts'), '');
      await fs.writeFile(path.join(tempDir, 'README.md'), '');
    });

    it('should support glob patterns', async () => {
      const files = await service.glob(tempDir, '**/*.ts');
      expect(files.length).toBe(3);
      expect(files.every(f => f.path.endsWith('.ts'))).toBe(true);
    });

    it('should exclude patterns', async () => {
      const files = await service.glob(tempDir, '**/*', {
        ignore: ['**/utils/**']
      });
      const paths = files.map(f => f.relativePath);
      expect(paths).toContain('src/index.ts');
      expect(paths).toContain('README.md');
      expect(paths).not.toContain('src/utils/helper.ts');
    });
  });
});