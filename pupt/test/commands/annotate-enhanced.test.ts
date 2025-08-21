import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { annotateCommand } from '../../src/commands/annotate.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import * as prompts from '@inquirer/prompts';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

vi.mock('../../src/config/config-manager');
vi.mock('../../src/history/history-manager');
vi.mock('@inquirer/prompts');
vi.mock('fs-extra');
vi.mock('uuid');
vi.mock('../../src/utils/logger.js');
vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));
vi.mock('node:util', () => ({
  promisify: vi.fn(() => vi.fn())
}));

describe('Enhanced Annotate Command', () => {
  const mockConfig = {
    promptDirs: ['./.prompts'],
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
    vi.resetAllMocks();
    (ConfigManager.load as Mock).mockResolvedValue(mockConfig);
    (uuidv4 as Mock).mockReturnValue('test-uuid');
    
    const mockHistoryManager = {
      getHistoryEntry: vi.fn().mockResolvedValue(mockHistoryEntry),
      listHistory: vi.fn().mockResolvedValue([mockHistoryEntry])
    };
    (HistoryManager as any).mockImplementation(() => mockHistoryManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('Structured Outcome Data', () => {
    it('should support structured outcome data when provided', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('partial') // status
        .mockResolvedValueOnce(true); // add structured data?
      
      (prompts.input as Mock)
        .mockResolvedValueOnce('bug, implementation') // tags
        .mockResolvedValueOnce('4') // tasks completed
        .mockResolvedValueOnce('5') // tasks total
        .mockResolvedValueOnce('20') // tests run
        .mockResolvedValueOnce('18') // tests passed
        .mockResolvedValueOnce('2') // tests failed
        .mockResolvedValueOnce('3m45s'); // execution time
      
      (prompts.confirm as Mock).mockResolvedValueOnce(false); // verification passed
      
      (prompts.select as Mock).mockResolvedValueOnce(false); // add issues?
      
      (prompts.editor as Mock).mockResolvedValue('Partial implementation with test failures');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      const parsed = yaml.load(content.split('---')[1]) as any;

      expect(parsed.structured_outcome).toBeDefined();
      expect(parsed.structured_outcome.tasks_completed).toBe(4);
      expect(parsed.structured_outcome.tasks_total).toBe(5);
      expect(parsed.structured_outcome.tests_run).toBe(20);
      expect(parsed.structured_outcome.tests_passed).toBe(18);
      expect(parsed.structured_outcome.tests_failed).toBe(2);
      expect(parsed.structured_outcome.verification_passed).toBe(false);
      expect(parsed.structured_outcome.execution_time).toBe('3m45s');
    });

    it('should skip structured data when user declines', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('success'); // status - success skips enhanced features
      
      (prompts.input as Mock).mockResolvedValue(''); // tags
      (prompts.editor as Mock).mockResolvedValue('Everything worked');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      const parsed = yaml.load(content.split('---')[1]) as any;

      expect(parsed.structured_outcome).toBeUndefined();
    });
  });

  describe('Issue Identification', () => {
    it('should support adding identified issues', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('partial') // status
        .mockResolvedValueOnce(false) // add structured data?
        .mockResolvedValueOnce(true) // add issues?
        .mockResolvedValueOnce('verification_gap') // category
        .mockResolvedValueOnce('high'); // severity
      
      (prompts.input as Mock)
        .mockResolvedValueOnce('') // tags
        .mockResolvedValueOnce('AI claimed success but tests failed'); // description
      
      (prompts.editor as Mock)
        .mockResolvedValueOnce('Tests were still failing') // notes (called first!)
        .mockResolvedValueOnce('Output showed "All tests passing" but npm test had failures'); // evidence (called second!)
      
      (prompts.confirm as Mock).mockResolvedValueOnce(false); // add another issue?
      
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      const parsed = yaml.load(content.split('---')[1]) as any;

      expect(parsed.issues_identified).toBeDefined();
      expect(parsed.issues_identified).toHaveLength(1);
      expect(parsed.issues_identified[0].category).toBe('verification_gap');
      expect(parsed.issues_identified[0].severity).toBe('high');
      expect(parsed.issues_identified[0].description).toBe('AI claimed success but tests failed');
      expect(parsed.issues_identified[0].evidence).toBe('Output showed "All tests passing" but npm test had failures');
    });

    it('should support multiple issues', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('failure') // status
        .mockResolvedValueOnce(false) // add structured data?
        .mockResolvedValueOnce(true) // add issues?
        .mockResolvedValueOnce('incomplete_task') // first issue category
        .mockResolvedValueOnce('high') // first issue severity
        .mockResolvedValueOnce('ambiguous_instruction') // second issue category
        .mockResolvedValueOnce('medium'); // second issue severity
      
      (prompts.input as Mock)
        .mockResolvedValueOnce('') // tags
        .mockResolvedValueOnce('Stopped at first error') // first issue description
        .mockResolvedValueOnce('Unclear error handling requirements'); // second issue description
      
      (prompts.editor as Mock)
        .mockResolvedValueOnce('Only fixed 1 of 5 errors') // first issue evidence
        .mockResolvedValueOnce('Prompt did not specify how to handle edge cases') // second issue evidence
        .mockResolvedValueOnce('Multiple issues encountered'); // notes
      
      (prompts.confirm as Mock)
        .mockResolvedValueOnce(true) // add another issue? YES
        .mockResolvedValueOnce(false); // add another issue? NO
      
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      const parsed = yaml.load(content.split('---')[1]) as any;

      expect(parsed.issues_identified).toHaveLength(2);
      expect(parsed.issues_identified[0].category).toBe('incomplete_task');
      expect(parsed.issues_identified[1].category).toBe('ambiguous_instruction');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with existing annotation format', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('success'); // status - success skips enhanced features
      
      (prompts.input as Mock).mockResolvedValue('feature, tested');
      (prompts.editor as Mock).mockResolvedValue('Legacy annotation format test');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];

      // Check the basic structure is maintained
      expect(content).toContain('---');
      expect(content).toContain('historyFile: 20240120-103000-abc123.json');
      expect(content).toContain('timestamp:');
      expect(content).toContain('status: success');
      expect(content).toContain('tags:');
      expect(content).toContain('  - feature');
      expect(content).toContain('  - tested');
      expect(content).toContain('## Notes');
      expect(content).toContain('Legacy annotation format test');

      // Ensure no new fields are added when not requested
      expect(content).not.toContain('structured_outcome');
      expect(content).not.toContain('issues_identified');
    });
  });

  describe('Schema Validation', () => {
    it('should validate numeric inputs in structured data', async () => {
      let inputCallCount = 0;
      const inputResponses = [
        '', // tags
        'invalid', // tasks completed (invalid - will trigger validation)
        '3', // tasks completed (valid after retry)
        '5', // tasks total
        '10', // tests run
        '8', // tests passed
        '2', // tests failed
        '2m30s' // execution time
      ];

      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('partial') // status
        .mockResolvedValueOnce(true) // add structured data?
        .mockResolvedValueOnce(false); // add issues?
      
      (prompts.input as Mock).mockImplementation(() => {
        return Promise.resolve(inputResponses[inputCallCount++]);
      });
      
      (prompts.confirm as Mock).mockResolvedValueOnce(true); // verification passed
      (prompts.editor as Mock).mockResolvedValue('Test notes');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      // The validation function should be called and reject 'invalid'
      const inputCalls = (prompts.input as Mock).mock.calls;
      expect(inputCalls.some(call => call[0].validate && call[0].validate('invalid') !== true)).toBe(true);
    });
  });

  describe('Auto-Detection Flag', () => {
    it('should not set auto_detected flag for manually created annotations', async () => {
      (prompts.select as Mock)
        .mockResolvedValueOnce(0) // history selection
        .mockResolvedValueOnce('success'); // status
      
      (prompts.input as Mock).mockResolvedValue('');
      (prompts.editor as Mock).mockResolvedValue('Manual annotation');
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      await annotateCommand();

      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const content = writeCall[1];
      const parsed = yaml.load(content.split('---')[1]) as any;

      // Manual annotations should not have auto_detected flag
      expect(parsed.auto_detected).toBeUndefined();
    });
  });
});