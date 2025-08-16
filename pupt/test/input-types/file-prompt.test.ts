import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filePrompt } from '../../src/prompts/input-types/file-prompt.js';
import { render } from '@inquirer/testing';
import { listFilesWithCache } from '../../src/utils/file-utils.js';
import path from 'node:path';

vi.mock('../../src/utils/file-utils.js', () => ({
  listFilesWithCache: vi.fn(),
  sortFilesByModTime: vi.fn((files) => files),
  filterFilesByPattern: vi.fn((files, pattern) => {
    if (!pattern) return files;
    return files.filter(file => {
      // Always include directories
      if (file.isDirectory) return true;
      // Simple pattern matching for tests
      if (pattern === '*.ts') return file.name.endsWith('.ts');
      return true;
    });
  }),
  expandPath: vi.fn((p) => p),
  resolveFilePath: vi.fn((input, basePath) => {
    if (!input) return basePath;
    if (path.isAbsolute(input)) return input;
    return path.resolve(basePath, input);
  }),
}));

vi.mock('../../src/utils/trie.js', () => ({
  Trie: vi.fn().mockImplementation(() => ({
    insert: vi.fn(),
  })),
  completeFilePath: vi.fn((baseName, fileNames) => {
    if (baseName === '') {
      return { suggestions: fileNames, completed: '' };
    }
    // Find matches
    const matches = fileNames.filter(name => name.startsWith(baseName));
    if (matches.length === 0) {
      return { suggestions: [], completed: baseName };
    }
    if (matches.length === 1) {
      return { suggestions: [], completed: matches[0] };
    }
    return { suggestions: matches, completed: baseName };
  }),
}));

describe('File Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display message and current input', async () => {
    vi.mocked(listFilesWithCache).mockReturnValue([]);
    
    const { answer, events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
    });

    expect(getScreen()).toContain('Select a file:');
    expect(getScreen()).toContain('│'); // Cursor indicator
    
    // Type each character individually
    events.keypress('t');
    events.keypress('e');
    events.keypress('s');
    events.keypress('t');
    events.keypress('.');
    events.keypress('t');
    events.keypress('x');
    events.keypress('t');
    expect(getScreen()).toContain('test.txt│');
    
    events.keypress('enter');
    await expect(answer).resolves.toBe(path.resolve('./test.txt'));
  });

  it('should handle tab completion with single match', async () => {
    vi.mocked(listFilesWithCache).mockReturnValue([
      { name: 'index.ts', path: './index.ts', isDirectory: false, mtime: new Date() },
      { name: 'test.ts', path: './test.ts', isDirectory: false, mtime: new Date() },
    ]);

    const { answer, events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      basePath: './',
    });

    events.keypress('i');
    events.keypress('n');
    events.keypress('d');
    events.keypress('tab');
    
    // Should complete to 'index.ts'
    expect(getScreen()).toContain('index.ts│');
    
    events.keypress('enter');
    await expect(answer).resolves.toBe(path.resolve('./index.ts'));
  });

  it('should show suggestions for multiple matches', async () => {
    vi.mocked(listFilesWithCache).mockReturnValue([
      { name: 'test1.ts', path: './test1.ts', isDirectory: false, mtime: new Date() },
      { name: 'test2.ts', path: './test2.ts', isDirectory: false, mtime: new Date() },
      { name: 'test3.ts', path: './test3.ts', isDirectory: false, mtime: new Date() },
    ]);

    const { events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      basePath: './',
    });

    events.keypress('t');
    events.keypress('e');
    events.keypress('s');
    events.keypress('t');
    events.keypress('tab');
    
    const screen = getScreen();
    expect(screen).toContain('Suggestions:');
    expect(screen).toContain('test1.ts');
    expect(screen).toContain('test2.ts');
    expect(screen).toContain('test3.ts');
    expect(screen).toContain('❯'); // Selection marker
  });

  it('should navigate suggestions with arrow keys', async () => {
    vi.mocked(listFilesWithCache).mockReturnValue([
      { name: 'file1.ts', path: './file1.ts', isDirectory: false, mtime: new Date() },
      { name: 'file2.ts', path: './file2.ts', isDirectory: false, mtime: new Date() },
    ]);

    const { answer, events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      basePath: './',
    });

    events.keypress('f');
    events.keypress('i');
    events.keypress('l');
    events.keypress('e');
    events.keypress('tab');
    
    // Initially first suggestion is selected
    let screen = getScreen();
    expect(screen).toMatch(/❯\s+file1\.ts/);
    
    // Navigate down
    events.keypress('down');
    screen = getScreen();
    expect(screen).toMatch(/❯\s+file2\.ts/);
    
    // Select the second file
    events.keypress('enter');
    await expect(answer).resolves.toBe(path.resolve('./file2.ts'));
  });

  it('should handle filter patterns', async () => {
    const allFiles = [
      { name: 'test.ts', path: './test.ts', isDirectory: false, mtime: new Date() },
      { name: 'test.js', path: './test.js', isDirectory: false, mtime: new Date() },
      { name: 'README.md', path: './README.md', isDirectory: false, mtime: new Date() },
      { name: 'src', path: './src', isDirectory: true, mtime: new Date() },
    ];

    vi.mocked(listFilesWithCache).mockReturnValue(allFiles);

    const { events, getScreen } = await render(filePrompt, {
      message: 'Select a TypeScript file:',
      basePath: './',
      filter: '*.ts',
    });

    events.keypress('tab');
    
    const screen = getScreen();
    // Should only show .ts files and directories
    expect(screen).toContain('test.ts');
    expect(screen).toContain('src'); // Directories always shown
    expect(screen).not.toContain('test.js');
    expect(screen).not.toContain('README.md');
  });

  it('should handle default value', async () => {
    vi.mocked(listFilesWithCache).mockReturnValue([]);

    const { answer, events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      default: 'default.txt',
    });

    // Should start with default value
    expect(getScreen()).toContain('default.txt│');
    
    // Accept default
    events.keypress('enter');
    await expect(answer).resolves.toBe(path.resolve('./default.txt'));
  });

  it('should handle directory navigation', async () => {
    // Mock returns files when querying the src directory
    vi.mocked(listFilesWithCache).mockImplementation((dir) => {
      if (dir.includes('src')) {
        return [
          { name: 'file.txt', path: './src/file.txt', isDirectory: false, mtime: new Date() },
        ];
      }
      return [];
    });

    const { answer, events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      basePath: './',
    });

    // Type directory path
    events.keypress('s');
    events.keypress('r');
    events.keypress('c');
    events.keypress(path.sep);
    events.keypress('tab');
    
    // Should show files in the directory
    expect(getScreen()).toContain('file.txt');
    
    // Select the file from suggestions
    events.keypress('enter');
    await expect(answer).resolves.toBe(path.resolve('./src/file.txt'));
  });

  it('should handle escape key to clear suggestions', async () => {
    vi.mocked(listFilesWithCache).mockReturnValue([
      { name: 'file1.ts', path: './file1.ts', isDirectory: false, mtime: new Date() },
      { name: 'file2.ts', path: './file2.ts', isDirectory: false, mtime: new Date() },
    ]);

    const { events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      basePath: './',
    });

    events.keypress('f');
    events.keypress('i');
    events.keypress('l');
    events.keypress('e');
    events.keypress('tab');
    
    // Should show suggestions
    expect(getScreen()).toContain('Suggestions:');
    
    // Press escape
    events.keypress('escape');
    
    // Suggestions should be cleared
    expect(getScreen()).not.toContain('Suggestions:');
  });

  it('should handle error when listing files', async () => {
    vi.mocked(listFilesWithCache).mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const { events, getScreen } = await render(filePrompt, {
      message: 'Select a file:',
      basePath: '/restricted',
    });

    events.keypress('tab');
    
    // Should show error message
    expect(getScreen()).toContain('Permission denied');
  });
});