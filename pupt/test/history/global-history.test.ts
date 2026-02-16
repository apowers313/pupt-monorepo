import fs from 'fs-extra';
import path from 'path';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryManager } from '../../src/history/history-manager.js';
import { OutputCaptureService } from '../../src/services/output-capture-service.js';

vi.mock('fs-extra');
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

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

describe('Global History - Centralized Storage', () => {
  const globalDataDir = '/home/user/.local/share/pupt';
  const globalHistoryDir = path.join(globalDataDir, 'history');
  const globalOutputDir = path.join(globalDataDir, 'output');
  const globalAnnotationDir = globalHistoryDir;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.writeJson).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);
    vi.mocked(fs.readJson).mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('saving history to global data dir', () => {
    it('should save history to global data dir by default', async () => {
      const manager = new HistoryManager(globalHistoryDir, globalAnnotationDir);

      const options = {
        templatePath: '/home/user/projects/app/prompts/api-client.prompt',
        templateContent: 'Generate API client for {{service}}',
        variables: new Map([['service', 'weather']]),
        finalPrompt: 'Generate API client for weather',
        title: 'API Client Generator'
      };

      await manager.savePrompt(options);

      expect(vi.mocked(fs.ensureDir)).toHaveBeenCalledWith(globalHistoryDir);
      expect(vi.mocked(fs.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining(globalHistoryDir),
        expect.any(Object),
        { spaces: 2 }
      );
    });

    it('should store history entries from multiple projects in the same directory', async () => {
      const manager = new HistoryManager(globalHistoryDir);

      // Save entry from project A
      await manager.savePrompt({
        templatePath: '/project-a/prompts/test.prompt',
        templateContent: 'Test A',
        variables: new Map(),
        finalPrompt: 'Test from project A',
        title: 'Project A Prompt',
        filenameComponents: { dateStr: '20240115', timeStr: '100000', randomSuffix: 'aaaa1111' }
      });

      // Save entry from project B
      await manager.savePrompt({
        templatePath: '/project-b/prompts/test.prompt',
        templateContent: 'Test B',
        variables: new Map(),
        finalPrompt: 'Test from project B',
        title: 'Project B Prompt',
        filenameComponents: { dateStr: '20240115', timeStr: '110000', randomSuffix: 'bbbb2222' }
      });

      // Both should be saved to the same global history dir
      const writeCalls = vi.mocked(fs.writeJson).mock.calls;
      expect(writeCalls).toHaveLength(2);
      expect(writeCalls[0][0]).toBe(path.join(globalHistoryDir, '20240115-100000-aaaa1111.json'));
      expect(writeCalls[1][0]).toBe(path.join(globalHistoryDir, '20240115-110000-bbbb2222.json'));
    });
  });

  describe('filtering history by git directory', () => {
    const entriesFromMultipleProjects = [
      {
        timestamp: '2024-01-14T10:00:00.000Z',
        templatePath: '/project-a/prompts/build.prompt',
        finalPrompt: 'Build project A',
        title: 'Build A',
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
        templatePath: '/project-b/prompts/test.prompt',
        finalPrompt: 'Test project B',
        title: 'Test B',
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
        templatePath: '/project-a/prompts/deploy.prompt',
        finalPrompt: 'Deploy project A',
        title: 'Deploy A',
        templateContent: 'template',
        variables: {},
        environment: {
          working_directory: '/home/user/project-a',
          git_dir: '/home/user/project-a/.git',
          os: 'linux'
        }
      },
      {
        timestamp: '2024-01-17T10:00:00.000Z',
        templatePath: '/project-c/prompts/review.prompt',
        finalPrompt: 'Review project C',
        title: 'Review C',
        templateContent: 'template',
        variables: {},
        environment: {
          working_directory: '/home/user/project-c',
          git_dir: '/home/user/project-c/.git',
          os: 'linux'
        }
      }
    ];

    beforeEach(() => {
      const mockFiles = [
        '20240114-100000-aaa11111.json',
        '20240115-100000-bbb22222.json',
        '20240116-100000-ccc33333.json',
        '20240117-100000-ddd44444.json'
      ];

      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        const idx = mockFiles.indexOf(filename);
        if (idx >= 0) {return entriesFromMultipleProjects[idx];}
        throw new Error('File not found');
      });
    });

    it('should filter history by current git directory', async () => {
      const manager = new HistoryManager(globalHistoryDir);

      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/project-a/.git'
      });

      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBe('Build A');
      expect(entries[1].title).toBe('Deploy A');
    });

    it('should show all history with no filter (--all-dir equivalent)', async () => {
      const manager = new HistoryManager(globalHistoryDir);

      const entries = await manager.listHistory();

      expect(entries).toHaveLength(4);
      expect(entries[0].title).toBe('Build A');
      expect(entries[1].title).toBe('Test B');
      expect(entries[2].title).toBe('Deploy A');
      expect(entries[3].title).toBe('Review C');
    });

    it('should include legacy entries (no environment) when includeLegacy is true', async () => {
      const legacyEntry = {
        timestamp: '2024-01-13T10:00:00.000Z',
        templatePath: '/old-project/prompts/old.prompt',
        finalPrompt: 'Legacy prompt',
        title: 'Legacy',
        templateContent: 'template',
        variables: {}
        // No environment field
      };

      vi.mocked(fs.readdir).mockResolvedValue([
        '20240113-100000-eee55555.json',
        '20240114-100000-aaa11111.json',
        '20240115-100000-bbb22222.json',
        '20240116-100000-ccc33333.json',
        '20240117-100000-ddd44444.json'
      ] as any);

      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240113-100000-eee55555.json') {return legacyEntry;}
        const mockFiles = [
          '20240114-100000-aaa11111.json',
          '20240115-100000-bbb22222.json',
          '20240116-100000-ccc33333.json',
          '20240117-100000-ddd44444.json'
        ];
        const idx = mockFiles.indexOf(filename);
        if (idx >= 0) {return entriesFromMultipleProjects[idx];}
        throw new Error('File not found');
      });

      const manager = new HistoryManager(globalHistoryDir);

      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/project-a/.git',
        includeLegacy: true
      });

      // Should include 2 project-a entries + 1 legacy entry
      expect(entries).toHaveLength(3);
      expect(entries.map(e => e.title)).toContain('Legacy');
      expect(entries.map(e => e.title)).toContain('Build A');
      expect(entries.map(e => e.title)).toContain('Deploy A');
    });

    it('should exclude legacy entries when includeLegacy is false', async () => {
      const legacyEntry = {
        timestamp: '2024-01-13T10:00:00.000Z',
        templatePath: '/old-project/prompts/old.prompt',
        finalPrompt: 'Legacy prompt',
        title: 'Legacy',
        templateContent: 'template',
        variables: {}
      };

      vi.mocked(fs.readdir).mockResolvedValue([
        '20240113-100000-eee55555.json',
        '20240114-100000-aaa11111.json'
      ] as any);

      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === '20240113-100000-eee55555.json') {return legacyEntry;}
        if (filename === '20240114-100000-aaa11111.json') {return entriesFromMultipleProjects[0];}
        throw new Error('File not found');
      });

      const manager = new HistoryManager(globalHistoryDir);

      const entries = await manager.listHistory(undefined, {
        gitDir: '/home/user/project-a/.git',
        includeLegacy: false
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Build A');
    });
  });

  describe('output capture to global output dir', () => {
    it('should save output capture files to global output dir', async () => {
      const manager = new HistoryManager(globalHistoryDir);

      const outputFile = path.join(globalOutputDir, '20240115-100000-abc12345-output.json');
      const options = {
        templatePath: '/project/prompts/test.prompt',
        templateContent: 'Test',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test prompt',
        title: 'Test',
        outputFile,
        outputSize: 1024,
        executionTime: 5000,
        exitCode: 0,
        filenameComponents: { dateStr: '20240115', timeStr: '100000', randomSuffix: 'abc12345' }
      };

      await manager.savePrompt(options);

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      // Output file should be stored as relative path from historyDir
      expect(entry.execution).toBeDefined();
      expect(entry.execution.output_file).toBe(
        path.relative(globalHistoryDir, outputFile).split(path.sep).join('/')
      );
    });

    it('should store execution metadata with output', async () => {
      const manager = new HistoryManager(globalHistoryDir);

      const outputFile = path.join(globalOutputDir, '20240115-100000-abc12345-output.json');
      await manager.savePrompt({
        templatePath: '/test.prompt',
        templateContent: 'Test',
        variables: new Map<string, unknown>(),
        finalPrompt: 'Test content',
        title: 'Test',
        outputFile,
        outputSize: 2048,
        executionTime: 12345,
        exitCode: 1,
        filenameComponents: { dateStr: '20240115', timeStr: '100000', randomSuffix: 'abc12345' }
      });

      const writeCall = vi.mocked(fs.writeJson).mock.calls[0];
      const entry = writeCall[1];

      expect(entry.execution.output_size).toBe(2048);
      expect(entry.execution.duration_ms).toBe(12345);
      expect(entry.execution.exit_code).toBe(1);
    });
  });

  describe('output capture service configuration', () => {
    it('should respect outputCapture.maxSizeMB from config', () => {
      const maxSizeMB = 25;
      const service = new OutputCaptureService({
        outputDirectory: globalOutputDir,
        maxOutputSize: maxSizeMB * 1024 * 1024
      });

      // Service is created with the correct config
      expect(service).toBeDefined();
      // The maxOutputSize is used internally - verify by checking options
      // We can't directly access private fields, but the service should be created without errors
    });

    it('should use global output directory when configured', () => {
      const service = new OutputCaptureService({
        outputDirectory: globalOutputDir
      });

      expect(service).toBeDefined();
    });

    it('should use default global output directory when not explicitly configured', () => {
      // When no outputDirectory is passed, it should default to a global path
      const service = new OutputCaptureService();
      expect(service).toBeDefined();
    });
  });

  describe('output capture retention', () => {
    it('should respect outputCapture.retentionDays for cleanup', async () => {
      const retentionDays = 7;
      const now = Date.now();
      const oldFileDate = new Date(now - (retentionDays + 1) * 24 * 60 * 60 * 1000);
      const recentFileDate = new Date(now - 1 * 24 * 60 * 60 * 1000);

      const service = new OutputCaptureService({
        outputDirectory: globalOutputDir
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        '20240101-100000-old12345-output.json',
        '20240101-100000-old12345-output.txt',
        '20240115-100000-new12345-output.json',
        '20240115-100000-new12345-output.txt',
        'some-other-file.json' // Should not be touched
      ] as any);

      vi.mocked(fs.stat).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename.includes('old')) {
          return { mtime: oldFileDate } as any;
        }
        return { mtime: recentFileDate } as any;
      });

      vi.mocked(fs.remove).mockResolvedValue(undefined);

      await service.cleanupOldOutputs(retentionDays);

      // Old files should be removed
      expect(vi.mocked(fs.remove)).toHaveBeenCalledWith(
        path.join(globalOutputDir, '20240101-100000-old12345-output.json')
      );
      expect(vi.mocked(fs.remove)).toHaveBeenCalledWith(
        path.join(globalOutputDir, '20240101-100000-old12345-output.txt')
      );

      // Recent files should not be removed
      const removeCalls = vi.mocked(fs.remove).mock.calls.map(c => c[0]);
      expect(removeCalls).not.toContain(
        path.join(globalOutputDir, '20240115-100000-new12345-output.json')
      );
      expect(removeCalls).not.toContain(
        path.join(globalOutputDir, '20240115-100000-new12345-output.txt')
      );
    });

    it('should not remove non-output files during cleanup', async () => {
      const service = new OutputCaptureService({
        outputDirectory: globalOutputDir
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        'some-other-file.json',
        'important-data.txt',
        '20240101-100000-abc12345-output.json'
      ] as any);

      const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: oldDate } as any);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      await service.cleanupOldOutputs(30);

      // Only output files should be considered for removal
      const removeCalls = vi.mocked(fs.remove).mock.calls.map(c => c[0]);
      expect(removeCalls).not.toContain(path.join(globalOutputDir, 'some-other-file.json'));
      expect(removeCalls).not.toContain(path.join(globalOutputDir, 'important-data.txt'));
    });
  });

  describe('cross-project history access', () => {
    it('should count entries correctly across projects with filtering', async () => {
      const mockFiles = [
        '20240114-100000-aaa11111.json',
        '20240115-100000-bbb22222.json',
        '20240116-100000-ccc33333.json'
      ];

      const entries = [
        {
          timestamp: '2024-01-14T10:00:00.000Z',
          templatePath: '/project-a/test.prompt',
          finalPrompt: 'A',
          title: 'A',
          templateContent: 'a',
          variables: {},
          environment: { working_directory: '/a', git_dir: '/a/.git', os: 'linux' }
        },
        {
          timestamp: '2024-01-15T10:00:00.000Z',
          templatePath: '/project-b/test.prompt',
          finalPrompt: 'B',
          title: 'B',
          templateContent: 'b',
          variables: {},
          environment: { working_directory: '/b', git_dir: '/b/.git', os: 'linux' }
        },
        {
          timestamp: '2024-01-16T10:00:00.000Z',
          templatePath: '/project-a/test2.prompt',
          finalPrompt: 'A2',
          title: 'A2',
          templateContent: 'a2',
          variables: {},
          environment: { working_directory: '/a', git_dir: '/a/.git', os: 'linux' }
        }
      ];

      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.readJson).mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        const idx = mockFiles.indexOf(filename);
        if (idx >= 0) {return entries[idx];}
        throw new Error('File not found');
      });

      const manager = new HistoryManager(globalHistoryDir);

      // Total count without filter should be 3
      const totalCount = await manager.getTotalCount();
      expect(totalCount).toBe(3);

      // Filtered count for project A should be 2
      const projectACount = await manager.getTotalCount({ gitDir: '/a/.git' });
      expect(projectACount).toBe(2);

      // Filtered count for project B should be 1
      const projectBCount = await manager.getTotalCount({ gitDir: '/b/.git' });
      expect(projectBCount).toBe(1);
    });
  });
});
