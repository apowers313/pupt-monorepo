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
        listHistory: vi.fn().mockResolvedValue([]),
        getTotalCount: vi.fn().mockResolvedValue(0)
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
        listHistory: vi.fn().mockResolvedValue([]),
        getTotalCount: vi.fn().mockResolvedValue(0)
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
        timestamp: '2024-01-14T16:45:00.000Z',
        templatePath: '/templates/db-schema.md',
        finalPrompt: 'Design PostgreSQL schema for user management system',
        title: 'Database Schema',
        templateContent: 'template content',
        variables: {}
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
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/api-client.md',
        finalPrompt: 'Generate a TypeScript API client for the weather service with authentication...',
        title: 'API Client Generator',
        templateContent: 'template content',
        variables: { service: 'weather' }
      }
    ];

    it('should display history entries with proper formatting', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(mockEntries),
        getTotalCount: vi.fn().mockResolvedValue(mockEntries.length)
      } as any));

      await historyCommand({});

      // Check header
      expect(consoleSpy).toHaveBeenCalledWith(chalk.bold('\nPrompt History:'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.gray('─'.repeat(80)));

      // Check first entry formatting (now the oldest)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1.')
      );
      // Calculate expected local time from UTC timestamp
      const date1 = new Date('2024-01-14T16:45:00.000Z');
      const expectedTime1 = `[${date1.getFullYear()}-${String(date1.getMonth() + 1).padStart(2, '0')}-${String(date1.getDate()).padStart(2, '0')} ${String(date1.getHours()).padStart(2, '0')}:${String(date1.getMinutes()).padStart(2, '0')}]`;
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedTime1)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database Schema')
      );
    });

    it('should truncate long prompts at 60 characters', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([mockEntries[2]]),
        getTotalCount: vi.fn().mockResolvedValue(1)
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
        listHistory: vi.fn().mockResolvedValue([entryWithoutTitle]),
        getTotalCount: vi.fn().mockResolvedValue(1)
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
        listHistory: mockListHistory,
        getTotalCount: vi.fn().mockResolvedValue(0)
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
        listHistory: mockListHistory,
        getTotalCount: vi.fn().mockResolvedValue(0)
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
        listHistory: mockListHistory,
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      await historyCommand({ all: true });

      expect(mockListHistory).toHaveBeenCalledWith(undefined);
    });
  });

  describe('specific entry display', () => {
    it('should display full content for a specific entry', async () => {
      const mockEntry = {
        timestamp: '2024-01-15T10:30:45.123Z',
        templatePath: '/templates/test.md',
        templateContent: 'Template: {{name}}',
        variables: { name: 'TestUser', apiKey: '***' },
        finalPrompt: 'This is the final generated prompt with TestUser',
        title: 'Test Prompt',
        filename: '20240115-103045-abc123.json'
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(mockEntry),
        getTotalCount: vi.fn().mockResolvedValue(10)
      } as any));

      await historyCommand({ entry: 5 });

      // Check header
      expect(consoleSpy).toHaveBeenCalledWith(chalk.bold('\nHistory Entry #5:'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.gray('─'.repeat(80)));
      
      // Check details
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Timestamp:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Title:') && expect.stringContaining('Test Prompt')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template:') && expect.stringContaining('/templates/test.md')
      );
      
      // Check variables
      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan('\nVariables:'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('name') && expect.stringContaining('"TestUser"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('apiKey') && expect.stringContaining('"***"')
      );
      
      // Check final prompt
      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan('\nFinal Prompt:'));
      expect(consoleSpy).toHaveBeenCalledWith('This is the final generated prompt with TestUser');
      
      // Check filename
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('History file: 20240115-103045-abc123.json')
      );
    });

    it('should handle entry without variables', async () => {
      const mockEntry = {
        timestamp: '2024-01-15T10:30:45.123Z',
        templatePath: '/templates/simple.md',
        templateContent: 'Simple template',
        variables: {},
        finalPrompt: 'Simple prompt',
        title: 'Simple',
        filename: '20240115-103045-def456.json'
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(mockEntry),
        getTotalCount: vi.fn().mockResolvedValue(10)
      } as any));

      await historyCommand({ entry: 1 });

      // Should not show variables section
      expect(consoleSpy).not.toHaveBeenCalledWith(chalk.cyan('\nVariables:'));
    });

    it('should show error for non-existent entry', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        getTotalCount: vi.fn().mockResolvedValue(5)
      } as any));

      await historyCommand({ entry: 10 });

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.red('History entry 10 not found')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.dim('Available entries: 1-5')
      );
    });

    it('should not show available entries when history is empty', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      await historyCommand({ entry: 1 });

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.red('History entry 1 not found')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Available entries:')
      );
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
        listHistory: vi.fn().mockResolvedValue(entries),
        getTotalCount: vi.fn().mockResolvedValue(entries.length)
      } as any));

      await historyCommand({});

      // Should format as YYYY-MM-DD HH:MM in local time
      const date = new Date('2024-01-15T10:30:00.000Z');
      const expectedTime = `[${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}]`;
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedTime)
      );
    });

    it('should use consistent numbering', async () => {
      const entries = Array.from({ length: 3 }, (_, i) => ({
        timestamp: `2024-01-${13 + i}T10:00:00.000Z`,
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
        listHistory: vi.fn().mockResolvedValue(entries),
        getTotalCount: vi.fn().mockResolvedValue(entries.length)
      } as any));

      await historyCommand({});

      // Check numbers are sequential
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3.'));
    });

    it('should maintain consistent numbering with limited entries', async () => {
      // Simulate having 10 total entries but only showing the last 3
      const lastThreeEntries = Array.from({ length: 3 }, (_, i) => ({
        timestamp: `2024-01-${20 + i}T10:00:00.000Z`,
        templatePath: '/test.md',
        finalPrompt: `Test ${i + 8}`,
        title: `Test ${i + 8}`,
        templateContent: 'test',
        variables: {}
      }));

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(lastThreeEntries),
        getTotalCount: vi.fn().mockResolvedValue(10)
      } as any));

      await historyCommand({ limit: 3 });

      // Should show numbers 8, 9, 10 (not 1, 2, 3)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('8.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('9.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('10.'));
    });
  });
});