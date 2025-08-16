import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseCommand, CommandContext, CommandOptions } from '../../src/commands/base-command.js';
import { ConsoleUI, LogLevel } from '../../src/ui/console-ui.js';
import { PromptToolError, ErrorCategory, ErrorSeverity } from '../../src/utils/errors.js';
import pino from 'pino';

class TestCommand extends BaseCommand<{ input: string }, string> {
  protected get name(): string {
    return 'test-command';
  }

  protected async validatePreconditions(): Promise<void> {
    if (!this.context.config.promptDirectory) {
      throw new PromptToolError(
        'No prompt directory configured', 
        'NO_CONFIG',
        ErrorCategory.CONFIG_ERROR,
        ErrorSeverity.ERROR,
        [{ text: 'Run pt init to configure' }]
      );
    }
  }

  protected async collectInput(): Promise<{ input: string }> {
    return { input: 'test-input' };
  }

  protected async performAction(input: { input: string }): Promise<string> {
    return `Processed: ${input.input}`;
  }
}

class FailingCommand extends BaseCommand<void, void> {
  constructor(
    context: CommandContext,
    options: CommandOptions,
    private failAt: 'validate' | 'collect' | 'perform'
  ) {
    super(context, options);
  }

  protected get name(): string {
    return 'failing-command';
  }

  protected async validatePreconditions(): Promise<void> {
    if (this.failAt === 'validate') {
      throw new Error('Validation failed');
    }
  }

  protected async collectInput(): Promise<void> {
    if (this.failAt === 'collect') {
      throw new PromptToolError(
        'Collection failed', 
        'COLLECTION_FAILED',
        ErrorCategory.USER_ERROR,
        ErrorSeverity.ERROR,
        [
          { text: 'Try again' },
          { text: 'Check your input' }
        ]
      );
    }
  }

  protected async performAction(): Promise<void> {
    if (this.failAt === 'perform') {
      throw new Error('Action failed');
    }
  }
}

describe('BaseCommand', () => {
  let mockContext: CommandContext;
  let mockUI: ConsoleUI;
  let mockLogger: pino.Logger;

  beforeEach(() => {
    mockUI = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      setLogLevel: vi.fn(),
      setSilent: vi.fn(),
      spinner: vi.fn(),
      table: vi.fn(),
      json: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    mockContext = {
      config: {
        promptDirectory: ['./prompts'],
        historyDirectory: './.pthistory'
      },
      ui: mockUI,
      logger: mockLogger
    };
  });

  describe('constructor', () => {
    it('should set verbose mode when option is provided', () => {
      const command = new TestCommand(mockContext, { verbose: true });
      expect(mockUI.setLogLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
    });

    it('should set quiet mode when option is provided', () => {
      const command = new TestCommand(mockContext, { quiet: true });
      expect(mockUI.setSilent).toHaveBeenCalledWith(true);
    });

    it('should handle both verbose and quiet options', () => {
      const command = new TestCommand(mockContext, { verbose: true, quiet: true });
      expect(mockUI.setLogLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
      expect(mockUI.setSilent).toHaveBeenCalledWith(true);
    });
  });

  describe('execute', () => {
    it('should execute command lifecycle successfully', async () => {
      const command = new TestCommand(mockContext, {});
      const result = await command.execute();

      expect(result).toBe('Processed: test-input');
      expect(mockLogger.info).toHaveBeenCalledWith({ command: 'test-command' }, 'Executing command');
      expect(mockLogger.info).toHaveBeenCalledWith({ command: 'test-command' }, 'Command completed');
    });

    it('should handle validation failures', async () => {
      const command = new FailingCommand(mockContext, {}, 'validate');
      
      await expect(command.execute()).rejects.toThrow('Validation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'failing-command' }),
        'Command failed'
      );
      expect(mockUI.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle PromptToolError with suggestions', async () => {
      const command = new FailingCommand(mockContext, {}, 'collect');
      
      await expect(command.execute()).rejects.toThrow('Collection failed');
      expect(mockUI.error).toHaveBeenCalledWith(expect.any(PromptToolError));
      expect(mockUI.info).toHaveBeenCalledWith('Suggestions:');
      expect(mockUI.info).toHaveBeenCalledWith('  - Try again');
      expect(mockUI.info).toHaveBeenCalledWith('  - Check your input');
    });

    it('should handle action failures', async () => {
      const command = new FailingCommand(mockContext, {}, 'perform');
      
      await expect(command.execute()).rejects.toThrow('Action failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'failing-command' }),
        'Command failed'
      );
      expect(mockUI.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle missing config gracefully', async () => {
      mockContext.config.promptDirectory = undefined as any;
      const command = new TestCommand(mockContext, {});
      
      await expect(command.execute()).rejects.toThrow('No prompt directory configured');
      expect(mockUI.error).toHaveBeenCalledWith(expect.any(PromptToolError));
      expect(mockUI.info).toHaveBeenCalledWith('Suggestions:');
      expect(mockUI.info).toHaveBeenCalledWith('  - Run pt init to configure');
    });
  });

  describe('protected methods', () => {
    it('should allow subclasses to access context', () => {
      const command = new TestCommand(mockContext, {});
      expect((command as any).context).toBe(mockContext);
    });

    it('should allow subclasses to access options', () => {
      const options = { verbose: true };
      const command = new TestCommand(mockContext, options);
      expect((command as any).options).toEqual(options);
    });
  });
});