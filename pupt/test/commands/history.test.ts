import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { historyCommand } from '../../src/commands/history.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import chalk from 'chalk';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/history/history-manager.js');

describe('History Command', () => {
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof historyCommand).toBe('function');
    });

    it('should return a promise', () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([])
      } as any));
      
      const result = historyCommand({});
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('error handling', () => {
    it('should show friendly error when history is not enabled', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts']
        // No historyDir
      } as any);

      await expect(historyCommand({})).rejects.toThrow(
        'History tracking is not enabled'
      );
    });

    it('should show message for empty history', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([])
      } as any));

      await historyCommand({});

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.yellow('📋 No history found')
      );
    });
  });

  describe('history display', () => {
    const mockEntries = [
      {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/api-client.md',
        finalPrompt: 'Generate a TypeScript API client for the weather service with authentication...',
        title: 'API Client Generator',
        templateContent: 'template content',
        variables: { service: 'weather' }
      },
      {
        timestamp: '2024-01-15T10:15:00.000Z',
        templatePath: '/templates/react-component.md',
        finalPrompt: 'Create a React form component with validation for user registration including email and password fields',
        title: 'React Component',
        templateContent: 'template content',
        variables: { name: 'UserForm' }
      },
      {
        timestamp: '2024-01-14T16:45:00.000Z',
        templatePath: '/templates/db-schema.md',
        finalPrompt: 'Design PostgreSQL schema for user management system',
        title: 'Database Schema',
        templateContent: 'template content',
        variables: {}
      }
    ];

    it('should display history entries with proper formatting', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(mockEntries)
      } as any));

      await historyCommand({});

      // Check header
      expect(consoleSpy).toHaveBeenCalledWith(chalk.bold('\nPrompt History:'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.gray('─'.repeat(80)));

      // Check first entry formatting
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1.')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[2024-01-16 14:30]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Client Generator')
      );
    });

    it('should truncate long prompts at 60 characters', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([mockEntries[0]])
      } as any));

      await historyCommand({});

      // Check that one of the calls contains the truncated prompt
      const calls = consoleSpy.mock.calls.map(call => call[0]);
      const hasTruncatedPrompt = calls.some(call => 
        call.includes('Generate a TypeScript API client for the weather service wit...')
      );
      expect(hasTruncatedPrompt).toBe(true);
    });

    it('should handle prompts without titles', async () => {
      const entryWithoutTitle = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/untitled.md',
        finalPrompt: 'Some prompt content',
        templateContent: 'template',
        variables: {}
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithoutTitle])
      } as any));

      await historyCommand({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Untitled')
      );
    });
  });

  describe('pagination', () => {
    it('should apply default limit of 20 entries', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      const mockListHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: mockListHistory
      } as any));

      await historyCommand({});

      expect(mockListHistory).toHaveBeenCalledWith(20);
    });

    it('should respect --limit flag', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      const mockListHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: mockListHistory
      } as any));

      await historyCommand({ limit: 50 });

      expect(mockListHistory).toHaveBeenCalledWith(50);
    });

    it('should show all entries with --all flag', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      const mockListHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: mockListHistory
      } as any));

      await historyCommand({ all: true });

      expect(mockListHistory).toHaveBeenCalledWith(undefined);
    });
  });

  describe('formatting helpers', () => {
    it('should format dates correctly', async () => {
      const entries = [{
        timestamp: '2024-01-15T10:30:45.123Z',
        templatePath: '/test.md',
        finalPrompt: 'Test',
        title: 'Test',
        templateContent: 'test',
        variables: {}
      }];

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(entries)
      } as any));

      await historyCommand({});

      // Should format as YYYY-MM-DD HH:MM
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[2024-01-15 10:30]')
      );
    });

    it('should use consistent numbering', async () => {
      const entries = Array.from({ length: 3 }, (_, i) => ({
        timestamp: `2024-01-${15 - i}T10:00:00.000Z`,
        templatePath: '/test.md',
        finalPrompt: `Test ${i + 1}`,
        title: `Test ${i + 1}`,
        templateContent: 'test',
        variables: {}
      }));

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(entries)
      } as any));

      await historyCommand({});

      // Check numbers are sequential
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3.'));
    });
  });
});