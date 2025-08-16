import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';
import { search } from '@inquirer/prompts';
import { FileSearchEngine } from '../../src/search/file-search-engine.js';

vi.mock('@inquirer/prompts', () => ({
  search: vi.fn(),
}));

vi.mock('../../src/search/file-search-engine.js', () => ({
  FileSearchEngine: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
    listDirectory: vi.fn(),
    formatFileInfo: vi.fn((info) => ({
      display: info.name + (info.isDirectory ? '/' : ''),
      value: info.absolutePath,
      description: info.relativePath,
    })),
    normalizePathInput: vi.fn((input) => input),
    resolveToAbsolutePath: vi.fn((input) => `/home/user/project/${input}`),
  })),
}));

describe('fileSearchPrompt', () => {
  const mockFiles = [
    {
      name: 'design',
      absolutePath: '/home/user/project/design',
      relativePath: 'design',
      isDirectory: true,
      modTime: new Date(),
    },
    {
      name: 'demo.txt',
      absolutePath: '/home/user/project/demo.txt',
      relativePath: 'demo.txt',
      isDirectory: false,
      modTime: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize FileSearchEngine with basePath', async () => {
    vi.mocked(search).mockResolvedValue('/selected/file.txt');

    await fileSearchPrompt({
      message: 'Select a file',
      basePath: '/custom/path',
    });

    expect(FileSearchEngine).toHaveBeenCalledWith('/custom/path', undefined);
  });

  it('should pass filter to FileSearchEngine', async () => {
    vi.mocked(search).mockResolvedValue('/selected/file.txt');

    await fileSearchPrompt({
      message: 'Select a file',
      basePath: '.',
      filter: '*.ts',
    });

    expect(FileSearchEngine).toHaveBeenCalledWith('.', '*.ts');
  });

  it('should configure search prompt correctly', async () => {
    vi.mocked(search).mockResolvedValue('/selected/file.txt');

    await fileSearchPrompt({
      message: 'Select a file',
      basePath: '.',
    });

    expect(search).toHaveBeenCalledWith({
      message: 'Select a file',
      source: expect.any(Function),
    });
  });

  it('should show directory contents when input is empty', async () => {
    const mockSearchEngine = {
      search: vi.fn(),
      listDirectory: vi.fn().mockResolvedValue(mockFiles),
      formatFileInfo: vi.fn((info) => ({
        display: info.name + (info.isDirectory ? '/' : ''),
        value: info.absolutePath,
        description: info.relativePath,
      })),
      normalizePathInput: vi.fn((input) => input),
      resolveToAbsolutePath: vi.fn((input) => `/home/user/project/${input}`),
    };

    vi.mocked(FileSearchEngine).mockImplementation(() => mockSearchEngine as any);
    vi.mocked(search).mockImplementation(async ({ source }) => {
      const results = await source('', { signal: new AbortController().signal });
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: 'design/',
        value: '/home/user/project/design',
        description: 'design',
      });
      return '/selected/file.txt';
    });

    await fileSearchPrompt({
      message: 'Select a file',
      basePath: '.',
    });

    expect(mockSearchEngine.listDirectory).toHaveBeenCalledWith('.');
  });

  it('should search files when input is provided', async () => {
    const mockSearchEngine = {
      search: vi.fn().mockResolvedValue([mockFiles[1]]), // Only demo.txt
      listDirectory: vi.fn(),
      formatFileInfo: vi.fn((info) => ({
        display: info.name + (info.isDirectory ? '/' : ''),
        value: info.absolutePath,
        description: info.relativePath,
      })),
      normalizePathInput: vi.fn((input) => input),
      resolveToAbsolutePath: vi.fn((input) => `/home/user/project/${input}`),
    };

    vi.mocked(FileSearchEngine).mockImplementation(() => mockSearchEngine as any);
    vi.mocked(search).mockImplementation(async ({ source }) => {
      const results = await source('dem', { signal: new AbortController().signal });
      // Should now have 2 results: the manual input option + demo.txt
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: '📝 Use typed path: dem',
        value: '/home/user/project/dem',
        description: 'Create or use non-existent file',
      });
      expect(results[1]).toEqual({
        name: 'demo.txt',
        value: '/home/user/project/demo.txt',
        description: 'demo.txt',
      });
      return '/home/user/project/demo.txt';
    });

    const result = await fileSearchPrompt({
      message: 'Select a file',
      basePath: '.',
    });

    expect(mockSearchEngine.search).toHaveBeenCalledWith('dem', expect.any(AbortSignal));
    expect(result).toBe('/home/user/project/demo.txt');
  });

  it('should handle search with path separators', async () => {
    const designFiles = [
      {
        name: 'phase1.md',
        absolutePath: '/home/user/project/design/phase1.md',
        relativePath: 'design/phase1.md',
        isDirectory: false,
        modTime: new Date(),
      },
    ];

    const mockSearchEngine = {
      search: vi.fn().mockResolvedValue(designFiles),
      listDirectory: vi.fn(),
      formatFileInfo: vi.fn((info) => ({
        display: info.name + (info.isDirectory ? '/' : ''),
        value: info.absolutePath,
        description: info.relativePath,
      })),
      normalizePathInput: vi.fn((input) => input),
      resolveToAbsolutePath: vi.fn((input) => `/home/user/project/${input}`),
    };

    vi.mocked(FileSearchEngine).mockImplementation(() => mockSearchEngine as any);
    vi.mocked(search).mockImplementation(async ({ source }) => {
      const results = await source('design/ph', { signal: new AbortController().signal });
      // Should now have 2 results: the manual input option + phase1.md
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: '📝 Use typed path: design/ph',
        value: '/home/user/project/design/ph',
        description: 'Create or use non-existent file',
      });
      expect(results[1].name).toBe('phase1.md');
      return designFiles[0].absolutePath;
    });

    await fileSearchPrompt({
      message: 'Select a file',
      basePath: '.',
    });

    expect(mockSearchEngine.search).toHaveBeenCalledWith('design/ph', expect.any(AbortSignal));
  });

  // Note: @inquirer/search doesn't support default values
  // The default property in FileSearchConfig is kept for future compatibility
});