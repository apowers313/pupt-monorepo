import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { historyCommand } from '../../src/commands/history.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';
import * as gitInfo from '../../src/utils/git-info.js';
import chalk from 'chalk';

vi.mock('../../src/config/config-manager.js');
vi.mock('../../src/history/history-manager.js');
vi.mock('../../src/utils/logger.js');
vi.mock('../../src/utils/git-info.js');

describe('History Command', () => {
  let loggerSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerSpy = vi.mocked(logger.log).mockImplementation(() => {});
    // Mock git info to prevent default filtering from affecting tests
    vi.mocked(gitInfo.getGitInfo).mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('command registration', () => {
    it('should be exported as a function', () => {
      expect(typeof historyCommand).toBe('function');
    });

    it('should return a promise', () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
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
        promptDirs: ['./.prompts']
        // No historyDir
      } as any);

      await expect(historyCommand({})).rejects.toThrow(
        'History tracking is not enabled'
      );
    });

    it('should show message for empty history', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([]),
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      // Use allDir to show generic message (no directory filtering)
      await historyCommand({ allDir: true });

      expect(loggerSpy).toHaveBeenCalledWith(
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(mockEntries),
        getTotalCount: vi.fn().mockResolvedValue(mockEntries.length)
      } as any));

      // Use allDir to avoid filtering behavior affecting test
      await historyCommand({ allDir: true });

      // Check header (includes "all directories" note when using --all-dir)
      expect(loggerSpy).toHaveBeenCalledWith(
        chalk.bold('\nPrompt History:') + chalk.dim(' (all directories)')
      );
      expect(loggerSpy).toHaveBeenCalledWith(chalk.gray('─'.repeat(80)));

      // Check first entry formatting (now the oldest)
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('1.')
      );
      // Calculate expected local time from UTC timestamp
      const date1 = new Date('2024-01-14T16:45:00.000Z');
      const expectedTime1 = `[${date1.getFullYear()}-${String(date1.getMonth() + 1).padStart(2, '0')}-${String(date1.getDate()).padStart(2, '0')} ${String(date1.getHours()).padStart(2, '0')}:${String(date1.getMinutes()).padStart(2, '0')}]`;
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedTime1)
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database Schema')
      );
      
      // Should show summary instead of raw prompt
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Design PostgreSQL schema for user management system')
      );
    });

    it('should display variables when no summary is available', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([mockEntries[2]]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Check that one of the calls contains the variable display
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasVariables = calls.some(call => 
        call.includes('service: "weather"')
      );
      expect(hasVariables).toBe(true);
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithoutTitle]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Untitled')
      );
    });
  });

  describe('summary display', () => {
    it('should display variables over summary when both exist', async () => {
      // When both variables and summary exist, variables take priority
      // because users want to see the actual parameters they passed in
      const entryWithSummaryAndVars = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: '**Role & Context**: You are a versatile AI assistant...\n\n**Objective**: Create a test',
        title: 'Test Prompt',
        summary: 'Create a plan from {{design}} and write it to {{plan}}',
        templateContent: 'template',
        variables: { design: 'design.md', plan: 'plan.md' }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithSummaryAndVars]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Should show variables, not the processed summary
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasVariables = calls.some(call =>
        call.includes('design: "design.md"') && call.includes('plan: "plan.md"')
      );
      expect(hasVariables).toBe(true);
    });

    it('should display summary when no variables exist', async () => {
      const entryWithOnlySummary = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: '**Role & Context**: You are a versatile AI assistant...\n\n**Objective**: Create a test',
        title: 'Test Prompt',
        summary: 'Generate a basic test file',
        templateContent: 'template',
        variables: {} // No variables
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithOnlySummary]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Should show summary since there are no variables
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generate a basic test file')
      );
    });

    it('should display variables instead of extracting from prompt', async () => {
      const entryWithVariables = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: '**Role & Context**: You are a versatile AI assistant capable of handling various technical tasks.\n\n**Objective**: Build a secure authentication system\n\nImplement OAuth2 authentication flow with JWT tokens for the user management module',
        title: 'Auth Implementation',
        templateContent: 'template',
        variables: { authType: 'OAuth2', tokenType: 'JWT', module: 'user-management' }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithVariables]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Should show variables
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasVariables = calls.some(call => 
        call.includes('authType: "OAuth2"') && call.includes('tokenType: "JWT"')
      );
      expect(hasVariables).toBe(true);
    });

    it('should handle empty prompts gracefully', async () => {
      const emptyEntry = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/empty.md',
        finalPrompt: '',
        title: 'Empty Prompt',
        templateContent: 'template',
        variables: {}
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([emptyEntry]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Should not crash and should show the title
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Empty Prompt')
      );
    });

    it('should handle newlines in variable values', async () => {
      const entryWithNewlines = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: 'Process request',
        title: 'Multi-line Input',
        templateContent: 'template',
        variables: {
          prompt: 'First line\n\nSecond line\n\nThird line with lots of text',
          config: 'value1\nvalue2\nvalue3'
        }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithNewlines]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Should normalize newlines to spaces
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasNormalized = calls.some(call => 
        call.includes('prompt: "First line Second line Third line with lots of text"')
      );
      expect(hasNormalized).toBe(true);
      
      // Should not contain actual newlines
      const hasNewlines = calls.some(call => 
        call.includes('\n\n')
      );
      expect(hasNewlines).toBe(false);
    });

    it('should truncate individual variables at 80 characters', async () => {
      const longString = 'a'.repeat(100); // 100 character string
      const longEntry = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: 'Process',
        title: 'Long Variable',
        templateContent: 'template',
        variables: {
          prompt: longString
        }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([longEntry]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      const calls = loggerSpy.mock.calls.map(call => call[0]);
      
      // Find the line with the variable display
      const varLine = calls.find(call => call.includes('prompt: "'));
      expect(varLine).toBeDefined();
      
      // Extract just the variable value to check its length
      if (varLine) {
        // The value should be exactly 80 chars: 77 'a's + '...'
        const match = varLine.match(/prompt: "([^"]+)"/);
        if (match) {
          const value = match[1];
          expect(value).toBe('a'.repeat(77) + '...');
          expect(value.length).toBe(80);
        }
      }
    });

    it('should only treat file-named variables as file paths', async () => {
      const entry = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: 'Process',
        title: 'Mixed Variables',
        templateContent: 'template',
        variables: {
          prompt: '/home/user/docs/review.md',  // Not a file variable name
          designFile: '/home/user/projects/design.md',  // Is a file variable name
          outputPath: 'C:\\Users\\name\\output.txt'  // Is a path variable name
        }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entry]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const summaryLine = calls.find(call => call.includes('prompt: "') || call.includes('designFile: "'));
      
      expect(summaryLine).toBeDefined();
      if (summaryLine) {
        // 'prompt' should show full path (not a file variable)
        expect(summaryLine).toContain('/home/user/docs/review.md');
        // 'designFile' should show only filename
        expect(summaryLine).toContain('designFile: "design.md"');
        // Note: outputPath won't be shown because only 2 variables are displayed
      }
    });

    it('should handle strings with quotes correctly', async () => {
      const entry = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: 'Process',
        title: 'Quotes Test',
        templateContent: 'template',
        variables: {
          prompt: 'The user said "hello world" and then continued',
          config: 'Use "double quotes" for strings'
        }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entry]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      const calls = loggerSpy.mock.calls.map(call => call[0]);
      
      // Should escape quotes properly
      const hasEscapedQuotes = calls.some(call => 
        call.includes('prompt: "The user said \\"hello world\\"') ||
        call.includes('config: "Use \\"double quotes\\"')
      );
      expect(hasEscapedQuotes).toBe(true);
    });

    it('should format file paths to show only filename', async () => {
      const entryWithFilePaths = {
        timestamp: '2024-01-16T14:30:00.000Z',
        templatePath: '/templates/test.md',
        finalPrompt: 'Process the design document',
        title: 'File Processing',
        templateContent: 'template',
        variables: {
          designFile: '/home/user/projects/my-app/docs/design.md',
          outputFile: 'C:\\Users\\name\\Documents\\output.pdf'
        }
      };

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue([entryWithFilePaths]),
        getTotalCount: vi.fn().mockResolvedValue(1)
      } as any));

      await historyCommand({ allDir: true });

      // Should show only filenames, not full paths
      const calls = loggerSpy.mock.calls.map(call => call[0]);
      const hasFilenames = calls.some(call => 
        call.includes('designFile: "design.md"') && 
        call.includes('outputFile: "output.pdf"')
      );
      expect(hasFilenames).toBe(true);
      
      // Should not show full paths
      const hasFullPaths = calls.some(call => 
        call.includes('/home/user/projects') || call.includes('C:\\Users')
      );
      expect(hasFullPaths).toBe(false);
    });
  });

  describe('pagination', () => {
    it('should apply default limit of 20 entries', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      const mockListHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: mockListHistory,
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      // Use allDir to test limit without directory filtering
      await historyCommand({ allDir: true });

      expect(mockListHistory).toHaveBeenCalledWith(20, undefined);
    });

    it('should respect --limit flag', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      const mockListHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: mockListHistory,
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      // Use allDir to test limit without directory filtering
      await historyCommand({ limit: 50, allDir: true });

      expect(mockListHistory).toHaveBeenCalledWith(50, undefined);
    });

    it('should show all entries with --all flag', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      const mockListHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: mockListHistory,
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      // Use allDir to test --all without directory filtering
      await historyCommand({ all: true, allDir: true });

      expect(mockListHistory).toHaveBeenCalledWith(undefined, undefined);
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(mockEntry),
        getTotalCount: vi.fn().mockResolvedValue(10)
      } as any));

      await historyCommand({ entry: 5 });

      // Check header
      expect(loggerSpy).toHaveBeenCalledWith(chalk.bold('\nHistory Entry #5:'));
      expect(loggerSpy).toHaveBeenCalledWith(chalk.gray('─'.repeat(80)));
      
      // Check details
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Timestamp:')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Title:') && expect.stringContaining('Test Prompt')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template:') && expect.stringContaining('/templates/test.md')
      );
      
      // Check variables
      expect(loggerSpy).toHaveBeenCalledWith(chalk.cyan('\nVariables:'));
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('name') && expect.stringContaining('"TestUser"')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('apiKey') && expect.stringContaining('"***"')
      );
      
      // Check final prompt
      expect(loggerSpy).toHaveBeenCalledWith(chalk.cyan('\nFinal Prompt:'));
      expect(loggerSpy).toHaveBeenCalledWith('This is the final generated prompt with TestUser');
      
      // Check filename
      expect(loggerSpy).toHaveBeenCalledWith(
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(mockEntry),
        getTotalCount: vi.fn().mockResolvedValue(10)
      } as any));

      await historyCommand({ entry: 1 });

      // Should not show variables section
      expect(loggerSpy).not.toHaveBeenCalledWith(chalk.cyan('\nVariables:'));
    });

    it('should show error for non-existent entry', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        getTotalCount: vi.fn().mockResolvedValue(5)
      } as any));

      await historyCommand({ entry: 10 });

      expect(loggerSpy).toHaveBeenCalledWith(
        chalk.red('History entry 10 not found')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        chalk.dim('Available entries: 1-5')
      );
    });

    it('should not show available entries when history is empty', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);
      
      vi.mocked(HistoryManager).mockImplementation(() => ({
        getHistoryEntry: vi.fn().mockResolvedValue(null),
        getTotalCount: vi.fn().mockResolvedValue(0)
      } as any));

      await historyCommand({ entry: 1 });

      expect(loggerSpy).toHaveBeenCalledWith(
        chalk.red('History entry 1 not found')
      );
      expect(loggerSpy).not.toHaveBeenCalledWith(
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(entries),
        getTotalCount: vi.fn().mockResolvedValue(entries.length)
      } as any));

      await historyCommand({ allDir: true });

      // Should format as YYYY-MM-DD HH:MM in local time
      const date = new Date('2024-01-15T10:30:00.000Z');
      const expectedTime = `[${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}]`;
      expect(loggerSpy).toHaveBeenCalledWith(
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(entries),
        getTotalCount: vi.fn().mockResolvedValue(entries.length)
      } as any));

      await historyCommand({ allDir: true });

      // Check numbers are sequential
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('1.'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('2.'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('3.'));
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
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory'
      } as any);

      vi.mocked(HistoryManager).mockImplementation(() => ({
        listHistory: vi.fn().mockResolvedValue(lastThreeEntries),
        getTotalCount: vi.fn().mockResolvedValue(10)
      } as any));

      await historyCommand({ limit: 3, allDir: true });

      // Should show numbers 8, 9, 10 (not 1, 2, 3)
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('8.'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('9.'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('10.'));
    });
  });
});