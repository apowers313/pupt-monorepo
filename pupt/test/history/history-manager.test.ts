import fs from 'fs-extra';
import * as path from 'path';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryManager } from '../../src/history/history-manager.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('fs-extra');

vi.mock('../../src/utils/platform.js', () => ({
  getUsername: vi.fn().mockReturnValue('testuser'),
}));

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
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
      const entry = writeCall[1];

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
      
      const entry = writeCall[1];

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

  describe('savePrompt with filenameComponents', () => {
    it('should use provided filenameComponents instead of generating new ones', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
        filenameComponents: {
          dateStr: '20240220',
          timeStr: '143000',
          randomSuffix: 'deadbeef',
        },
      };

      const filename = await manager.savePrompt(options);

      expect(filename).toBe('20240220-143000-deadbeef.json');
      expect(vi.mocked(fs.writeJson)).toHaveBeenCalledWith(
        path.join(testHistoryDir, '20240220-143000-deadbeef.json'),
        expect.any(Object),
        { spaces: 2 }
      );
    });
  });

  describe('savePrompt with execution metadata', () => {
    it('should add execution object when outputFile is provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
        outputFile: '/path/to/history/outputs/output.json',
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.execution).toBeDefined();
      expect(entry.execution.output_file).toBe('outputs/output.json');
    });

    it('should add execution object when executionTime is provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
        executionTime: 5000,
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.execution).toBeDefined();
      expect(entry.execution.duration_ms).toBe(5000);
    });

    it('should add execution object when exitCode is provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
        exitCode: 0,
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.execution).toBeDefined();
      expect(entry.execution.exit_code).toBe(0);
    });

    it('should include all execution fields when all are provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
        outputFile: '/path/to/history/outputs/output.json',
        outputSize: 2048,
        executionTime: 12345,
        exitCode: 1,
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.execution).toEqual({
        output_file: 'outputs/output.json',
        output_size: 2048,
        duration_ms: 12345,
        exit_code: 1,
      });
    });

    it('should not add execution object when none of the execution fields are provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.execution).toBeUndefined();
    });
  });

  describe('savePrompt with rerunFrom', () => {
    it('should add rerun field when rerunFrom is provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
        rerunFrom: '20240110-090000-abcd1234.json',
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.rerun).toBe('20240110-090000-abcd1234.json');
    });

    it('should not add rerun field when rerunFrom is not provided', async () => {
      const options = {
        templatePath: '/templates/test.md',
        templateContent: 'Test prompt',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt content',
        title: 'Test',
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.rerun).toBeUndefined();
    });
  });

  describe('getAnnotationsForHistoryEntry', () => {
    const testAnnotationDir = '/path/to/annotations';
    let annotationManager: HistoryManager;

    beforeEach(() => {
      annotationManager = new HistoryManager(testHistoryDir, testAnnotationDir);
    });

    it('should return annotations matching a history entry filename', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const mockAnnotationFiles = [
        '20240115-100000-abc12345-annotation-uuid1.md',
        '20240115-100000-abc12345-annotation-uuid2.json',
        '20240116-100000-def12345-annotation-uuid3.json', // different entry
        'unrelated-file.txt',
      ];

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(mockAnnotationFiles as any);
      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240115-100000-abc12345-annotation-uuid1.md') {
          return 'Annotation content 1';
        } else if (filename === '20240115-100000-abc12345-annotation-uuid2.json') {
          return '{"status":"success"}';
        }
        throw new Error('File not found');
      });

      const annotations = await annotationManager.getAnnotationsForHistoryEntry(historyEntry);

      expect(annotations).toHaveLength(2);
      expect(annotations[0]).toBe('Annotation content 1');
      expect(annotations[1]).toBe('{"status":"success"}');
    });

    it('should return empty array when no annotationDir is configured', async () => {
      const managerWithoutAnnotations = new HistoryManager(testHistoryDir);

      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const annotations = await managerWithoutAnnotations.getAnnotationsForHistoryEntry(historyEntry);

      expect(annotations).toEqual([]);
      expect(vi.mocked(fs.readdir)).not.toHaveBeenCalled();
    });

    it('should return empty array when readdir throws ENOENT', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const annotations = await annotationManager.getAnnotationsForHistoryEntry(historyEntry);

      expect(annotations).toEqual([]);
    });

    it('should return empty array when no annotation files match', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        '20240116-100000-def12345-annotation-uuid1.json',
        'unrelated-file.txt',
      ] as any);

      const annotations = await annotationManager.getAnnotationsForHistoryEntry(historyEntry);

      expect(annotations).toEqual([]);
    });

    it('should match both .md and .json annotation files', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const mockAnnotationFiles = [
        '20240115-100000-abc12345-annotation-uuid1.md',
        '20240115-100000-abc12345-annotation-uuid2.json',
        '20240115-100000-abc12345-annotation-uuid3.yaml', // should be excluded
      ];

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(mockAnnotationFiles as any);
      vi.mocked(fs.readFile).mockResolvedValue('annotation content' as any);

      const annotations = await annotationManager.getAnnotationsForHistoryEntry(historyEntry);

      // Only .md and .json should match, not .yaml
      expect(annotations).toHaveLength(2);
    });
  });

  describe('saveAnnotation', () => {
    const testAnnotationDir = '/path/to/annotations';
    let annotationManager: HistoryManager;

    beforeEach(() => {
      annotationManager = new HistoryManager(testHistoryDir, testAnnotationDir);
    });

    it('should save annotation JSON file to annotationDir', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const metadata = {
        historyFile: '20240115-100000-abc12345.json',
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'success' as const,
        tags: ['build', 'test'],
        auto_detected: true,
      };

      await annotationManager.saveAnnotation(historyEntry, metadata, 'Build passed');

      expect(vi.mocked(fs.ensureDir)).toHaveBeenCalledWith(testAnnotationDir);
      expect(vi.mocked(fs.writeJson)).toHaveBeenCalledWith(
        path.join(testAnnotationDir, '20240115-100000-abc12345-annotation-test-uuid-1234.json'),
        {
          historyFile: '20240115-100000-abc12345.json',
          timestamp: '2024-01-15T10:30:00.000Z',
          status: 'success',
          tags: ['build', 'test'],
          auto_detected: true,
          notes: 'Build passed',
        },
        { spaces: 2 }
      );
    });

    it('should warn and return when no annotationDir is configured', async () => {
      const managerWithoutAnnotations = new HistoryManager(testHistoryDir);

      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const metadata = {
        historyFile: '20240115-100000-abc12345.json',
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'success' as const,
        tags: [],
      };

      await managerWithoutAnnotations.saveAnnotation(historyEntry, metadata);

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        'Annotation directory not configured, skipping annotation save'
      );
      expect(vi.mocked(fs.writeJson)).not.toHaveBeenCalled();
    });

    it('should fall back to timestamp-based filename when entry has no filename', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '', // empty filename
      };

      const metadata = {
        historyFile: '',
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'success' as const,
        tags: [],
      };

      await annotationManager.saveAnnotation(historyEntry, metadata);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const filePath = writeCall[0] as string;
      // When filename is empty (falsy), falls back to `${historyEntry.timestamp}.json`
      // path.basename('2024-01-15T10:00:00.000Z.json', '.json') = '2024-01-15T10:00:00.000Z'
      expect(filePath).toBe(
        path.join(testAnnotationDir, '2024-01-15T10:00:00.000Z-annotation-test-uuid-1234.json')
      );
    });

    it('should throw on write errors', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const metadata = {
        historyFile: '20240115-100000-abc12345.json',
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'failure' as const,
        tags: [],
      };

      vi.mocked(fs.writeJson).mockRejectedValue(new Error('Disk full'));

      await expect(annotationManager.saveAnnotation(historyEntry, metadata)).rejects.toThrow('Disk full');

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save annotation')
      );
    });

    it('should use auto-generated notes when auto_detected is true and no notes provided', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const metadata = {
        historyFile: '20240115-100000-abc12345.json',
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'success' as const,
        tags: [],
        auto_detected: true,
      };

      await annotationManager.saveAnnotation(historyEntry, metadata);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const data = writeCall[1];

      expect(data.notes).toBe('Auto-generated annotation');
    });

    it('should use empty string for notes when not auto_detected and no notes provided', async () => {
      const historyEntry = {
        timestamp: '2024-01-15T10:00:00.000Z',
        templatePath: '/templates/test.md',
        templateContent: 'Test',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test',
        filename: '20240115-100000-abc12345.json',
      };

      const metadata = {
        historyFile: '20240115-100000-abc12345.json',
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'success' as const,
        tags: [],
      };

      await annotationManager.saveAnnotation(historyEntry, metadata);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const data = writeCall[1];

      expect(data.notes).toBe('');
    });
  });

  describe('getTotalCount ENOENT without filter', () => {
    it('should return 0 when readdir throws ENOENT without filter', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const count = await manager.getTotalCount();

      expect(count).toBe(0);
    });
  });
});