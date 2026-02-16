import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PromptToolError,
  ErrorCategory,
  ErrorSeverity,
  createError,
  errors,
  displayError,
  isRecoverableError,
} from '../../src/utils/errors.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');

describe('Errors - additional coverage', () => {
  let loggerSpy: {
    error: ReturnType<typeof vi.mocked>;
    warn: ReturnType<typeof vi.mocked>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loggerSpy = {
      error: vi.mocked(logger.error).mockImplementation(() => {}),
      warn: vi.mocked(logger.warn).mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('errors.commandNotFound', () => {
    it('should create a command not found error with correct code', () => {
      const error = errors.commandNotFound('foobar');

      expect(error).toBeInstanceOf(PromptToolError);
      expect(error.code).toBe('COMMAND_NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.USER_ERROR);
      expect(error.message).toContain('foobar');
      expect(error.icon).toBe('❓');
    });

    it('should include suggested commands when provided', () => {
      const error = errors.commandNotFound('rn', ['run']);

      expect(error.suggestions).toContainEqual({
        text: "Did you mean 'run'?",
        command: 'pt run'
      });
    });

    it('should include multiple suggestions', () => {
      const error = errors.commandNotFound('lst', ['list', 'last']);

      const suggestionTexts = error.suggestions.map(s => s.text);
      expect(suggestionTexts).toContain("Did you mean 'list'?");
      expect(suggestionTexts).toContain("Did you mean 'last'?");
    });

    it('should include available commands when provided', () => {
      const error = errors.commandNotFound('unknown', [], ['run', 'list', 'add']);

      const suggestionTexts = error.suggestions.map(s => s.text);
      expect(suggestionTexts).toContain('Available commands: run, list, add');
    });

    it('should always include help suggestion', () => {
      const error = errors.commandNotFound('unknown');

      expect(error.suggestions).toContainEqual({
        text: 'Show help',
        command: 'pt help'
      });
    });

    it('should handle empty suggestions and available commands', () => {
      const error = errors.commandNotFound('xyz', [], []);

      // Should have at least the help suggestion
      expect(error.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(error.suggestions).toContainEqual({
        text: 'Show help',
        command: 'pt help'
      });
    });
  });

  describe('errors.promptNotFound', () => {
    it('should create a prompt not found error with correct code', () => {
      const error = errors.promptNotFound('my-prompt');

      expect(error).toBeInstanceOf(PromptToolError);
      expect(error.code).toBe('PROMPT_NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.USER_ERROR);
      expect(error.message).toContain('my-prompt');
      expect(error.icon).toBe('🔍');
    });

    it('should include helpful suggestions', () => {
      const error = errors.promptNotFound('nonexistent');

      expect(error.suggestions).toContainEqual({
        text: 'List available prompts',
        command: 'pt'
      });
      expect(error.suggestions).toContainEqual({
        text: 'Check prompt name or filename'
      });
      expect(error.suggestions).toContainEqual({
        text: 'Create a new prompt',
        command: 'pt add'
      });
    });
  });

  describe('errors.historyNotFound', () => {
    it('should create a history not found error with correct code', () => {
      const error = errors.historyNotFound(5, 3);

      expect(error).toBeInstanceOf(PromptToolError);
      expect(error.code).toBe('HISTORY_NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.USER_ERROR);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.message).toContain('#5');
      expect(error.icon).toBe('📋');
    });

    it('should show available entries range', () => {
      const error = errors.historyNotFound(10, 7);

      expect(error.suggestions).toContainEqual({
        text: 'Available entries: 1-7'
      });
    });

    it('should include history view command', () => {
      const error = errors.historyNotFound(1, 0);

      expect(error.suggestions).toContainEqual({
        text: 'View all entries',
        command: 'pt history'
      });
    });
  });

  describe('errors.featureNotEnabled', () => {
    it('should create a feature not enabled error with correct code', () => {
      const error = errors.featureNotEnabled('Auto-annotation', ['Track success/failure', 'Detect patterns']);

      expect(error).toBeInstanceOf(PromptToolError);
      expect(error.code).toBe('FEATURE_DISABLED');
      expect(error.category).toBe(ErrorCategory.CONFIG_ERROR);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.message).toContain('Auto-annotation');
      expect(error.icon).toBe('🎯');
    });

    it('should list benefits in suggestions', () => {
      const error = errors.featureNotEnabled('History', ['Track executions', 'Review patterns']);

      const benefitSuggestion = error.suggestions.find(s => s.text.includes('Benefits:'));
      expect(benefitSuggestion).toBeDefined();
      expect(benefitSuggestion!.text).toContain('Track executions');
      expect(benefitSuggestion!.text).toContain('Review patterns');
    });

    it('should include init command suggestion', () => {
      const error = errors.featureNotEnabled('Some Feature', []);

      expect(error.suggestions).toContainEqual({
        text: 'Enable it by running:',
        command: 'pt init'
      });
    });
  });

  describe('errors.toolNotFound with suggestions', () => {
    it('should create a tool not found error with correct code', () => {
      const error = errors.toolNotFound('myutil');

      expect(error).toBeInstanceOf(PromptToolError);
      expect(error.code).toBe('TOOL_NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.EXTERNAL_TOOL_ERROR);
      expect(error.message).toContain('myutil');
      expect(error.icon).toBe('🔧');
    });

    it('should include did-you-mean suggestions', () => {
      const error = errors.toolNotFound('nde', ['node', 'ndb']);

      const suggestionTexts = error.suggestions.map(s => s.text);
      expect(suggestionTexts).toContain("Did you mean 'node'?");
      expect(suggestionTexts).toContain("Did you mean 'ndb'?");
    });

    it('should include check and install suggestions', () => {
      const error = errors.toolNotFound('mytool');

      expect(error.suggestions).toContainEqual({
        text: 'Check if installed',
        command: 'which mytool'
      });
      expect(error.suggestions).toContainEqual({
        text: 'Install if needed',
        command: 'npm install -g mytool'
      });
    });

    it('should include did-you-mean before standard suggestions', () => {
      const error = errors.toolNotFound('gti', ['git']);

      // did-you-mean should be first
      expect(error.suggestions[0].text).toBe("Did you mean 'git'?");
    });

    it('should handle empty suggestions array', () => {
      const error = errors.toolNotFound('sometool', []);

      // Should still have check and install suggestions
      expect(error.suggestions.length).toBe(2);
    });
  });

  describe('displayError with command suggestions', () => {
    it('should display suggestion commands when present', () => {
      const error = createError({
        message: 'Test error with commands',
        code: 'TEST',
        category: ErrorCategory.USER_ERROR,
        suggestions: [
          { text: 'Try this command', command: 'pt run something' }
        ]
      });

      displayError(error);

      // Check that the command is displayed
      const allCalls = loggerSpy.error.mock.calls.map((call: any[]) => call[0]);
      const commandCall = allCalls.find((c: string) => c.includes('pt run something'));
      expect(commandCall).toBeDefined();
    });

    it('should display multiple suggestions with and without commands', () => {
      const error = createError({
        message: 'Multi-suggestion error',
        code: 'MULTI',
        category: ErrorCategory.USER_ERROR,
        suggestions: [
          { text: 'Text-only suggestion' },
          { text: 'Suggestion with command', command: 'pt help' },
          { text: 'Another text-only' }
        ]
      });

      displayError(error);

      const allCalls = loggerSpy.error.mock.calls.map((call: any[]) => call[0]);
      const textSuggestion = allCalls.find((c: string) => c.includes('Text-only suggestion'));
      const commandSuggestion = allCalls.find((c: string) => c.includes('pt help'));
      expect(textSuggestion).toBeDefined();
      expect(commandSuggestion).toBeDefined();
    });
  });

  describe('isRecoverableError', () => {
    it('should return false for non-PromptToolError', () => {
      const genericError = new Error('generic');
      expect(isRecoverableError(genericError)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isRecoverableError('string error')).toBe(false);
      expect(isRecoverableError(42)).toBe(false);
      expect(isRecoverableError(null)).toBe(false);
      expect(isRecoverableError(undefined)).toBe(false);
    });

    it('should return true for EXTERNAL_TOOL_ERROR category', () => {
      const error = errors.toolNotFound('missing-tool');
      expect(error.category).toBe(ErrorCategory.EXTERNAL_TOOL_ERROR);
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for EXTERNAL_TOOL_ERROR that is not FATAL', () => {
      const error = createError({
        message: 'Tool failed',
        code: 'TOOL_FAIL',
        category: ErrorCategory.EXTERNAL_TOOL_ERROR,
        severity: ErrorSeverity.ERROR
      });
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return false for EXTERNAL_TOOL_ERROR that is FATAL', () => {
      const error = createError({
        message: 'Fatal tool error',
        code: 'TOOL_FATAL',
        category: ErrorCategory.EXTERNAL_TOOL_ERROR,
        severity: ErrorSeverity.FATAL
      });
      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for SYSTEM_ERROR category', () => {
      const error = createError({
        message: 'System error',
        code: 'SYS_ERR',
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.ERROR
      });
      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for UNKNOWN category', () => {
      const error = createError({
        message: 'Unknown error',
        code: 'UNK',
        category: ErrorCategory.UNKNOWN
      });
      expect(isRecoverableError(error)).toBe(false);
    });
  });
});
