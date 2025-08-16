import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { 
  PromptToolError, 
  ErrorCategory,
  ErrorSeverity,
  createError,
  errors,
  displayError,
  isRecoverableError,
  getErrorCategory
} from '../../src/utils/errors.js';

describe('Enhanced Error System', () => {
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PromptToolError', () => {
    it('should create error with all properties', () => {
      const error = new PromptToolError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.USER_ERROR,
        ErrorSeverity.ERROR,
        [{ text: 'Fix this' }],
        '❌'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe(ErrorCategory.USER_ERROR);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.suggestions).toEqual([{ text: 'Fix this' }]);
      expect(error.icon).toBe('❌');
    });

    it('should have default values', () => {
      const error = new PromptToolError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.USER_ERROR
      );

      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.suggestions).toEqual([]);
      expect(error.icon).toBe('❌');
    });
  });

  describe('createError', () => {
    it('should create error with factory function', () => {
      const error = createError({
        message: 'Test error',
        code: 'TEST_ERROR',
        category: ErrorCategory.CONFIG_ERROR,
        severity: ErrorSeverity.WARNING,
        suggestions: [{ text: 'Fix config' }],
        icon: '⚠️'
      });

      expect(error).toBeInstanceOf(PromptToolError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe(ErrorCategory.CONFIG_ERROR);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should use defaults when not provided', () => {
      const error = createError({
        message: 'Test error',
        code: 'TEST_ERROR'
      });

      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });
  });

  describe('Error Factories', () => {
    it('should create file not found error', () => {
      const error = errors.fileNotFound('/path/to/file.md');
      
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM_ERROR);
      expect(error.message).toContain('/path/to/file.md');
      expect(error.suggestions.length).toBeGreaterThan(0);
    });

    it('should create permission denied error', () => {
      const error = errors.permissionDenied('/protected/path');
      
      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM_ERROR);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should create validation error', () => {
      const error = errors.validationError('email', 'email@example.com', 'user@domain.com');
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.USER_ERROR);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should create config missing error', () => {
      const error = errors.configMissing();
      
      expect(error.code).toBe('NO_CONFIG');
      expect(error.category).toBe(ErrorCategory.CONFIG_ERROR);
      expect(error.suggestions).toContainEqual({
        text: 'Initialize configuration',
        command: 'pt init'
      });
    });

    it('should create network error', () => {
      const error = errors.networkError('https://api.example.com', 'ECONNREFUSED');
      
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe(ErrorCategory.NETWORK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should create git error', () => {
      const error = errors.gitError('merge conflict');
      
      expect(error.code).toBe('GIT_ERROR');
      expect(error.category).toBe(ErrorCategory.EXTERNAL_TOOL_ERROR);
    });

    it('should create template error', () => {
      const error = errors.templateError('{{unclosed', 'Unclosed helper');
      
      expect(error.code).toBe('TEMPLATE_ERROR');
      expect(error.category).toBe(ErrorCategory.USER_ERROR);
      expect(error.message).toContain('{{unclosed');
    });
  });

  describe('Error Categorization', () => {
    it('should identify recoverable errors', () => {
      const configError = errors.configMissing();
      const networkError = errors.networkError('url', 'timeout');
      const validationError = errors.validationError('field', 'format', 'example');
      
      expect(isRecoverableError(configError)).toBe(true);
      expect(isRecoverableError(networkError)).toBe(true);
      expect(isRecoverableError(validationError)).toBe(true);
    });

    it('should identify non-recoverable errors', () => {
      const systemError = createError({
        message: 'System failure',
        code: 'SYSTEM_ERROR',
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.FATAL
      });
      
      expect(isRecoverableError(systemError)).toBe(false);
    });

    it('should get error category', () => {
      const fileError = errors.fileNotFound('/path');
      const configError = errors.configMissing();
      
      expect(getErrorCategory(fileError)).toBe(ErrorCategory.FILE_SYSTEM_ERROR);
      expect(getErrorCategory(configError)).toBe(ErrorCategory.CONFIG_ERROR);
      expect(getErrorCategory(new Error('Generic'))).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('displayError', () => {
    it('should display PromptToolError with suggestions', () => {
      const error = errors.configMissing();
      displayError(error);
      
      // First call shows the error message
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('⚙️ Error: No configuration found')
      );
      // Second call shows suggestions header
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('💡 Suggestions:')
      );
    });

    it('should display warnings differently', () => {
      const warning = errors.validationError('field', 'format', 'example');
      displayError(warning);
      
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should display fatal errors prominently', () => {
      const fatal = createError({
        message: 'Fatal error',
        code: 'FATAL',
        severity: ErrorSeverity.FATAL
      });
      displayError(fatal);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('FATAL ERROR:')
      );
    });

    it('should display stack trace in debug mode', () => {
      process.env.DEBUG = 'true';
      const error = new Error('Test error');
      displayError(error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Stack trace:')
      );
      delete process.env.DEBUG;
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      displayError(error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        'Generic error'
      );
    });
  });

  describe('Error Recovery Suggestions', () => {
    it('should provide context-aware suggestions', () => {
      const editorError = errors.noEditor();
      expect(editorError.suggestions).toContainEqual({
        text: 'Set your editor:',
        command: 'export EDITOR=vim'
      });
      
      const gitError = errors.gitNotInstalled();
      expect(gitError.suggestions.some(s => s.text.includes('Install git'))).toBe(true);
    });

    it('should provide multiple suggestions when applicable', () => {
      const promptError = errors.noPromptsFound(['./prompts', './templates']);
      expect(promptError.suggestions.length).toBeGreaterThan(2);
    });
  });
});