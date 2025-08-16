import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { annotateCommand } from '../../src/commands/annotate';
import { ConfigManager } from '../../src/config/config-manager';
import { HistoryManager } from '../../src/history/history-manager';
import * as prompts from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
vi.mock('../../src/config/config-manager');
vi.mock('../../src/history/history-manager');
vi.mock('@inquirer/prompts');
vi.mock('fs-extra');
vi.mock('uuid');
vi.mock('child_process', () => ({
  execFile: vi.fn()
}));
vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn())
}));

describe('annotateCommand', () => {
  let consoleLogSpy: any;
  
  const mockConfig = {
    promptDirs: ['./prompts'],
    historyDir: './.pthistory',
    annotationDir: './.pthistory'
  };

  const mockHistoryEntry = {
    timestamp: '2024-01-20T10:30:00.000Z',
    templatePath: './prompts/test.md',
    templateContent: 'Test template',
    variables: { name: 'test' },
    finalPrompt: 'Test prompt content',
    title: 'Test Prompt',
    filename: '20240120-103000-abc123.json'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (ConfigManager.load as Mock).mockResolvedValue(mockConfig);
    (uuidv4 as Mock).mockReturnValue('test-uuid');
  });

  describe('Command Registration', () => {
    it('should error when annotation directory is not configured', async () => {
      const configWithoutAnnotations = {
        ...mockConfig,
        annotationDir: undefined
      };
      (ConfigManager.load as Mock).mockResolvedValue(configWithoutAnnotations);

      await expect(annotateCommand()).rejects.toThrow(
        'Annotations is not enabled'
      );
    });

    it('should error when history directory is not configured', async () => {
      const configWithoutHistory = {
        ...mockConfig,
        historyDir: undefined
      };
      (ConfigManager.load as Mock).mockResolvedValue(configWithoutHistory);

      await expect(annotateCommand()).rejects.toThrow(
        'History tracking is not enabled'
      );
    });

    it('should accept optional history number parameter', async () => {
      const mockHistoryManager = {
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
        listHistory: vi.fn()
      };
      (HistoryManager as any).mockImplementation(() => mockHistoryManager);
      
      (prompts.select as Mock).mockResolvedValue('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('Test notes');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand(1);

      expect(mockHistoryManager.getHistoryEntry).toHaveBeenCalledWith(1);
    });
  });

  describe('Annotation File Creation', () => {
    beforeEach(() => {
      const mockHistoryManager = {
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
        listHistory: vi.fn().mockResolvedValue([mockHistoryEntry])
      };
      (HistoryManager as any).mockImplementation(() => mockHistoryManager);
    });

    it('should create file with correct filename format', async () => {
      const expectedFilename = '20240120-103000-abc123-annotation-test-uuid.md';
      
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('success'); // status selection
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('Test notes');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('./.pthistory', expectedFilename),
        expect.any(String)
      );
    });

    it('should create valid YAML frontmatter', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('tag1, tag2');
      (prompts.editor as Mock).mockResolvedValue('Test notes');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('---');
      expect(content).toContain('historyFile: 20240120-103000-abc123.json');
      expect(content).toContain('timestamp:');
      expect(content).toContain('status: success');
      expect(content).toContain('tags:');
      expect(content).toContain('  - tag1');
      expect(content).toContain('  - tag2');
      expect(content).toContain('## Notes');
      expect(content).toContain('Test notes');
    });

    it('should link to correct history file', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('historyFile: 20240120-103000-abc123.json');
    });

    it('should include timestamp', async () => {
      const mockDate = new Date('2024-01-20T15:30:00.000Z');
      vi.setSystemTime(mockDate);

      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('timestamp: \'2024-01-20T15:30:00.000Z\'');
    });

    it('should allow multiple annotations per history entry', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('First annotation');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();
      
      // Reset mocks for second annotation
      vi.clearAllMocks();
      (ConfigManager.load as Mock).mockResolvedValue(mockConfig);
      const mockHistoryManager = {
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
        listHistory: vi.fn().mockResolvedValue([mockHistoryEntry])
      };
      (HistoryManager as any).mockImplementation(() => mockHistoryManager);
      
      (uuidv4 as Mock).mockReturnValue('test-uuid-2');
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('failure');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('Second annotation');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const calls = (fs.writeFile as Mock).mock.calls;
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toContain('20240120-103000-abc123-annotation-test-uuid-2.md');
    });
  });

  describe('Annotation UI', () => {
    beforeEach(() => {
      const mockHistoryManager = {
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
        listHistory: vi.fn().mockResolvedValue([
          mockHistoryEntry,
          { ...mockHistoryEntry, title: 'Another Prompt', filename: '20240120-110000-def456.json' }
        ])
      };
      (HistoryManager as any).mockImplementation(() => mockHistoryManager);
    });

    it('should show history list when no number given', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('success'); // status selection
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      expect(prompts.select).toHaveBeenCalledWith({
        message: 'Select history entry to annotate:',
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Test Prompt'),
            value: 0
          }),
          expect.objectContaining({
            name: expect.stringContaining('Another Prompt'),
            value: 1
          })
        ])
      });
    });

    it('should prompt for status with correct options', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('partial');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      expect(prompts.select).toHaveBeenCalledWith({
        message: 'How did this prompt work?',
        choices: [
          { value: 'success', name: '✓ Success' },
          { value: 'failure', name: '✗ Failure' },
          { value: 'partial', name: '~ Partial success' }
        ]
      });
    });

    it('should prompt for tags with comma separation', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('bugfix, refactor, testing');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      expect(prompts.input).toHaveBeenCalledWith({
        message: 'Tags (comma-separated, optional):'
      });

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain('- bugfix');
      expect(content).toContain('- refactor');
      expect(content).toContain('- testing');
    });

    it('should open editor for notes', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('Detailed notes about the prompt execution');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      expect(prompts.editor).toHaveBeenCalledWith({
        message: 'Add notes (press enter to open editor):'
      });

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain('Detailed notes about the prompt execution');
    });

    it('should handle empty notes', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain('## Notes\n\n');
    });

    it('should show success message with annotation path', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Annotation saved to .pthistory/20240120-103000-abc123-annotation-test-uuid.md'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const mockHistoryManager = {
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        listHistory: vi.fn().mockResolvedValue([])
      };
      (HistoryManager as any).mockImplementation(() => mockHistoryManager);
    });

    it('should handle invalid history number', async () => {
      await expect(annotateCommand(999)).rejects.toThrow(
        'History entry #999 not found'
      );
    });

    it('should handle empty history', async () => {
      await expect(annotateCommand()).rejects.toThrow(
        'No history entries found'
      );
    });

    it('should handle file write errors', async () => {
      const mockHistoryManager = {
        getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
        listHistory: vi.fn().mockResolvedValue([mockHistoryEntry])
      };
      (HistoryManager as any).mockImplementation(() => mockHistoryManager);

      (prompts.select as Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('success');
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('');
      (fs.writeFile as Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(annotateCommand()).rejects.toThrow('Permission denied');
    });
  });
});