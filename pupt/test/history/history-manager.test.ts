import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryManager } from '../../src/history/history-manager.js';
import fs from 'fs-extra';
import * as path from 'path';

vi.mock('fs-extra');

vi.mock('../../src/utils/platform.js', () => ({
  getUsername: vi.fn().mockReturnValue('testuser'),
}));

// Mock crypto.randomBytes
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    default: actual,
    randomBytes: vi.fn().mockReturnValue({ 
      toString: (encoding: string) => encoding === 'hex' ? 'abcd1234' : 'abcd1234' 
    }),
  };
});

describe('HistoryManager', () => {
  let manager: HistoryManager;
  const testHistoryDir = '/path/to/history';
  const mockDate = new Date('2024-01-15T10:30:45.123Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockDate);
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.writeJson).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);
    vi.mocked(fs.readJson).mockResolvedValue({});
    manager = new HistoryManager(testHistoryDir);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('savePrompt', () => {
    it('should save prompt to history in JSON format', async () => {
      const options = {
        templatePath: '/templates/api-client.md',
        templateContent: 'Generate API client for {{service}}',
        variables: new Map([
          ['service', 'weather'],
          ['apiKey', 'secret123'],
        ]),
        finalPrompt: 'Generate API client for weather',
        title: 'API Client Generator'
      };

      const filename = await manager.savePrompt(options);

      expect(vi.mocked(fs.ensureDir)).toHaveBeenCalledWith(testHistoryDir);
      expect(vi.mocked(fs.writeJson)).toHaveBeenCalled();

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const filePath = writeCall[0] as string;
      const entry = writeCall[1] as any;

      // Check filename format (now using local time, not UTC)
      expect(filename).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);
      expect(filePath).toBe(path.join(testHistoryDir, filename));

      // Check entry content
      expect(entry.timestamp).toBe('2024-01-15T10:30:45.123Z');
      expect(entry.templatePath).toBe('/templates/api-client.md');
      expect(entry.finalPrompt).toBe('Generate API client for weather');
      expect(entry.title).toBe('API Client Generator');
    });

    it('should mask sensitive variables in history', async () => {
      const options = {
        templatePath: '/templates/db-connection.md',
        templateContent: 'Connect to {{database}} with {{password}}',
        variables: new Map([
          ['database', 'postgres'],
          ['password', 'secret123'],
          ['apiKey', 'key123'],
        ]),
        finalPrompt: 'Connect to postgres with secret123',
      };

      await manager.savePrompt(options);

      const writeJsonMock = vi.mocked(fs.writeJson);
      expect(writeJsonMock).toHaveBeenCalled();
      
      const writeCall = writeJsonMock.mock.calls[0];
      expect(writeCall).toBeDefined();
      
      const entry = writeCall[1] as any;

      // Check that sensitive values are masked
      expect(entry.variables.password).toBe('***');
      expect(entry.variables.apiKey).toBe('***');
      expect(entry.variables.database).toBe('postgres');
    });

    it('should handle save errors gracefully', async () => {
      // Reset ensureDir to succeed
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeJson).mockRejectedValue(new Error('Permission denied'));

      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map(),
        finalPrompt: 'Test prompt',
        title: 'Test'
      };

      await expect(manager.savePrompt(options)).rejects.toThrow('Failed to save prompt to history');
    });

    it('should not save prompts with empty or whitespace-only finalPrompt', async () => {
      const testCases = [
        { finalPrompt: '', title: 'Empty' },
        { finalPrompt: '   ', title: 'Spaces' },
        { finalPrompt: '\n\t  \n', title: 'Whitespace' },
        { finalPrompt: '\r\n', title: 'Newlines' },
      ];

      for (const testCase of testCases) {
        const options = {
          templatePath: '/templates/test.md',
          templateContent: '{{!-- Just a comment --}}',
          variables: new Map(),
          finalPrompt: testCase.finalPrompt,
          title: testCase.title
        };

        await manager.savePrompt(options);
        
        // Verify that writeJson was NOT called
        expect(vi.mocked(fs.writeJson)).not.toHaveBeenCalled();
        vi.clearAllMocks();
      }
    });

    it('should save prompts with non-empty finalPrompt', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: '{{input}}',
        variables: new Map([['input', 'Hello world']]),
        finalPrompt: 'Hello world',
        title: 'Test'
      };

      await manager.savePrompt(options);
      
      // Verify that writeJson WAS called
      expect(vi.mocked(fs.writeJson)).toHaveBeenCalledTimes(1);
    });
  });

  describe('listHistory', () => {
    it.skip('should list history entries sorted by date', async () => {
      const mockFiles = [
        '20240115-100000-abc123.json',
        '20240116-100000-def456.json',
        '20240114-100000-ghi789.json',
        'not-a-history-file.txt',
      ];

      const mockEntries: Record<string, any> = {
        '20240115-100000-abc123.json': {
          timestamp: '2024-01-15T10:00:00.000Z',
          templatePath: '/templates/prompt1.md',
          finalPrompt: 'Prompt 1 content',
          title: 'Prompt 1',
          templateContent: 'content1',
          variables: {}
        },
        '20240116-100000-def456.json': {
          timestamp: '2024-01-16T10:00:00.000Z',
          templatePath: '/templates/prompt2.md',
          finalPrompt: 'Prompt 2 content',
          title: 'Prompt 2',
          templateContent: 'content2',
          variables: {}
        },
        '20240114-100000-ghi789.json': {
          timestamp: '2024-01-14T10:00:00.000Z',
          templatePath: '/templates/prompt3.md',
          finalPrompt: 'Prompt 3 content',
          title: 'Prompt 3',
          templateContent: 'content3',
          variables: {}
        }
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce(mockFiles as any);
      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath);
        if (mockEntries[filename]) {
          return mockEntries[filename];
        }
        throw new Error('File not found');
      });

      const entries = await manager.listHistory(10);

      expect(entries).toHaveLength(3);
      expect(entries[0].title).toBe('Prompt 2'); // Newest first
      expect(entries[1].title).toBe('Prompt 1');
      expect(entries[2].title).toBe('Prompt 3'); // Oldest last
    });

    it('should return empty array if directory does not exist', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockRejectedValue({ code: 'ENOENT' });

      const entries = await manager.listHistory();

      expect(entries).toEqual([]);
    });

    it('should apply limit to results', async () => {
      const mockFiles = Array.from({ length: 100 }, (_, i) => 
        `202401${String(i).padStart(2, '0')}-120000-${i.toString(16).padStart(8, '0')}.json`
      );

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.readJson).mockResolvedValue({
        timestamp: '2024-01-01T12:00:00.000Z',
        templatePath: '/test.md',
        finalPrompt: 'Test',
        title: 'Test',
        templateContent: 'Test',
        variables: {}
      });

      const entries = await manager.listHistory(20);

      expect(entries).toHaveLength(20);
    });
  });

  describe('getHistoryEntry', () => {
    it.skip('should get entry by index (1-based)', async () => {
      const mockFiles = [
        '20240116-100000-def456.json',
        '20240115-100000-abc123.json',
        '20240114-100000-ghi789.json',
      ];

      const mockEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/prompt1.md',
        finalPrompt: 'Prompt 1 content',
        title: 'Prompt 1',
        templateContent: 'content1',
        variables: {}
      };

      vi.mocked(fs.readdir).mockResolvedValueOnce(mockFiles as any);
      vi.mocked(fs.readJson).mockResolvedValueOnce(mockEntry);

      const entry = await manager.getHistoryEntry(2);

      expect(entry).toEqual(mockEntry);
      expect(fs.readJson).toHaveBeenCalledWith(
        path.join(testHistoryDir, '20240115-100000-abc123.json')
      );
    });

    it('should return null for invalid index', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['20240115-100000-abc123.json'] as any)
        .mockResolvedValueOnce(['20240115-100000-abc123.json'] as any);

      const entry1 = await manager.getHistoryEntry(0); // Too low
      const entry2 = await manager.getHistoryEntry(2); // Too high

      expect(entry1).toBeNull();
      expect(entry2).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

      const entry = await manager.getHistoryEntry(1);

      expect(entry).toBeNull();
    });
  });

  describe('listHistory with directory filtering', () => {
    const mockEntriesWithEnv = [
      {
        timestamp: '2024-01-14T10:00:00.000Z',
        templatePath: '/templates/test1.md',
        finalPrompt: 'Test prompt 1',
        title: 'Test 1',
        templateContent: 'template',
        variables: {},
        environment: {
          working_directory: '/home/user/project-a',
          git_dir: '/home/user/project-a/.git',
          os: 'linux'
        }
      },
      {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test2.md',
        finalPrompt: 'Test prompt 2',
        title: 'Test 2',
        templateContent: 'template',
        variables: {},
        environment: {
          working_directory: '/home/user/project-b',
          git_dir: '/home/user/project-b/.git',
          os: 'linux'
        }
      },
      {
        timestamp: '2024-01-16T10:00:00.000Z',
        templatePath: '/templates/test3.md',
        finalPrompt: 'Test prompt 3',
        title: 'Test 3',
        templateContent: 'template',
        variables: {},
        environment: {
          working_directory: '/home/user/project-a',
          git_dir: '/home/user/project-a/.git',
          os: 'linux'
        }
      }
    ];

    beforeEach(() => {
      const mockFiles = [
        '20240114-100000-abc12345.json',
        '20240115-100000-def12345.json',
        '20240116-100000-abcdef12.json'
      ];

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);

      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240114-100000-abc12345.json') {
          return mockEntriesWithEnv[0];
        } else if (filename === '20240115-100000-def12345.json') {
          return mockEntriesWithEnv[1];
        } else if (filename === '20240116-100000-abcdef12.json') {
          return mockEntriesWithEnv[2];
        }
        throw new Error('File not found');
      });
    });

    it('should filter entries by gitDir', async () => {
      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/project-a/.git'
      });

      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBe('Test 1');
      expect(entries[1].title).toBe('Test 3');
    });

    it('should filter entries by workingDir', async () => {
      const entries = await manager.listHistory(undefined, {
        workingDir: '/home/user/project-b'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Test 2');
    });

    it('should return all entries when no filter is specified', async () => {
      const entries = await manager.listHistory();

      expect(entries).toHaveLength(3);
    });

    it('should apply limit after filtering', async () => {
      const entries = await manager.listHistory(1, {
        gitDir: '/home/user/project-a/.git'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Test 3'); // Most recent matching entry
    });

    it('should return empty array when filter matches nothing', async () => {
      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/non-existent/.git'
      });

      expect(entries).toHaveLength(0);
    });

    it('should exclude entries without environment info when includeLegacy is false', async () => {
      // Add an entry without environment
      const entryWithoutEnv = {
        timestamp: '2024-01-17T10:00:00.000Z',
        templatePath: '/templates/test4.md',
        finalPrompt: 'Test prompt 4',
        title: 'Test 4',
        templateContent: 'template',
        variables: {}
        // No environment field
      };

      const mockFilesWithNoEnv = [
        '20240114-100000-abc12345.json',
        '20240115-100000-def12345.json',
        '20240116-100000-abcdef12.json',
        '20240117-100000-aabbccdd.json'
      ];

      vi.mocked(fs.readdir).mockResolvedValue(mockFilesWithNoEnv as any);

      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240114-100000-abc12345.json') {
          return mockEntriesWithEnv[0];
        } else if (filename === '20240115-100000-def12345.json') {
          return mockEntriesWithEnv[1];
        } else if (filename === '20240116-100000-abcdef12.json') {
          return mockEntriesWithEnv[2];
        } else if (filename === '20240117-100000-aabbccdd.json') {
          return entryWithoutEnv;
        }
        throw new Error('File not found');
      });

      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/project-a/.git',
        includeLegacy: false
      });

      // Should only include entries with matching environment (excludes legacy)
      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.title !== 'Test 4')).toBe(true);
    });

    it('should include entries without environment info when includeLegacy is true', async () => {
      // Add an entry without environment
      const entryWithoutEnv = {
        timestamp: '2024-01-17T10:00:00.000Z',
        templatePath: '/templates/test4.md',
        finalPrompt: 'Test prompt 4',
        title: 'Test 4',
        templateContent: 'template',
        variables: {}
        // No environment field
      };

      const mockFilesWithNoEnv = [
        '20240114-100000-abc12345.json',
        '20240115-100000-def12345.json',
        '20240116-100000-abcdef12.json',
        '20240117-100000-aabbccdd.json'
      ];

      vi.mocked(fs.readdir).mockResolvedValue(mockFilesWithNoEnv as any);

      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240114-100000-abc12345.json') {
          return mockEntriesWithEnv[0];
        } else if (filename === '20240115-100000-def12345.json') {
          return mockEntriesWithEnv[1];
        } else if (filename === '20240116-100000-abcdef12.json') {
          return mockEntriesWithEnv[2];
        } else if (filename === '20240117-100000-aabbccdd.json') {
          return entryWithoutEnv;
        }
        throw new Error('File not found');
      });

      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/project-a/.git',
        includeLegacy: true
      });

      // Should include legacy entry + 2 matching entries = 3 total
      expect(entries).toHaveLength(3);
      expect(entries.map(e => e.title)).toContain('Test 4');
      expect(entries.map(e => e.title)).toContain('Test 1');
      expect(entries.map(e => e.title)).toContain('Test 3');
    });
  });

  describe('getTotalCount with directory filtering', () => {
    beforeEach(() => {
      const mockFiles = [
        '20240114-100000-abc12345.json',
        '20240115-100000-def12345.json',
        '20240116-100000-abcdef12.json'
      ];

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);

      const mockEntriesWithEnv = [
        {
          timestamp: '2024-01-14T10:00:00.000Z',
          templatePath: '/templates/test1.md',
          finalPrompt: 'Test prompt 1',
          title: 'Test 1',
          templateContent: 'template',
          variables: {},
          environment: {
            working_directory: '/home/user/project-a',
            git_dir: '/home/user/project-a/.git',
            os: 'linux'
          }
        },
        {
          timestamp: '2024-01-15T10:00:00.000Z',
          templatePath: '/templates/test2.md',
          finalPrompt: 'Test prompt 2',
          title: 'Test 2',
          templateContent: 'template',
          variables: {},
          environment: {
            working_directory: '/home/user/project-b',
            git_dir: '/home/user/project-b/.git',
            os: 'linux'
          }
        },
        {
          timestamp: '2024-01-16T10:00:00.000Z',
          templatePath: '/templates/test3.md',
          finalPrompt: 'Test prompt 3',
          title: 'Test 3',
          templateContent: 'template',
          variables: {},
          environment: {
            working_directory: '/home/user/project-a',
            git_dir: '/home/user/project-a/.git',
            os: 'linux'
          }
        }
      ];

      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240114-100000-abc12345.json') {
          return mockEntriesWithEnv[0];
        } else if (filename === '20240115-100000-def12345.json') {
          return mockEntriesWithEnv[1];
        } else if (filename === '20240116-100000-abcdef12.json') {
          return mockEntriesWithEnv[2];
        }
        throw new Error('File not found');
      });
    });

    it('should count all entries when no filter is specified', async () => {
      const count = await manager.getTotalCount();
      expect(count).toBe(3);
    });

    it('should count filtered entries by gitDir', async () => {
      const count = await manager.getTotalCount({
        gitDir: '/home/user/project-a/.git'
      });
      expect(count).toBe(2);
    });

    it('should count filtered entries by workingDir', async () => {
      const count = await manager.getTotalCount({
        workingDir: '/home/user/project-b'
      });
      expect(count).toBe(1);
    });

    it('should return 0 when filter matches nothing', async () => {
      const count = await manager.getTotalCount({
        gitDir: '/home/user/non-existent/.git'
      });
      expect(count).toBe(0);
    });
  });
});