import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pino from 'pino';
import { 
  createLogger, 
  LoggingService, 
  LogLevel as PinoLogLevel,
  enhanceWithLogging,
  formatLogContext,
  createChildLogger
} from '../../src/services/logging-service.js';
import { BaseCommand } from '../../src/commands/base-command.js';
import { ConsoleUI, LogLevel } from '../../src/ui/console-ui.js';
import type { Config } from '../../src/types/config.js';

describe('Logging Service', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createLogger', () => {
    it('should create logger with production settings', () => {
      process.env.NODE_ENV = 'production';
      const config: Config = { promptDirectory: ['./prompts'] } as Config;
      const logger = createLogger(config);
      
      expect(logger.level).toBe('info');
    });

    it('should create logger with development settings', () => {
      delete process.env.NODE_ENV;
      const config: Config = { promptDirectory: ['./prompts'] } as Config;
      const logger = createLogger(config);
      
      expect(logger.level).toBe('debug');
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';
      const config: Config = { promptDirectory: ['./prompts'] } as Config;
      const logger = createLogger(config);
      
      expect(logger.level).toBe('warn');
    });

    it('should respect config log level over defaults', () => {
      const config: Config = { 
        promptDirectory: ['./prompts'],
        logLevel: 'error'
      } as Config;
      const logger = createLogger(config);
      
      expect(logger.level).toBe('error');
    });

    it('should redact sensitive fields', () => {
      const config: Config = { promptDirs: ['./prompts'] } as Config;
      
      // Create a writable stream to capture output
      const chunks: any[] = [];
      const stream = {
        write: (chunk: any) => {
          try {
            chunks.push(JSON.parse(chunk));
          } catch {
            // ignore non-JSON output
          }
        }
      };
      
      const testLogger = pino({
        level: 'info',
        redact: {
          paths: [
            'apiKeys.*',
            '*.password',
            '*.secret',
            '*.token',
            '*.credential',
            '*.privateKey',
            '*.private_key',
            '*.auth',
            '*.bearer'
          ],
          censor: '***'
        }
      }, stream);
      
      const testData = {
        apiKeys: { openai: 'sk-123456' },
        user: {
          password: 'secret123',
          token: 'bearer-token',
          email: 'user@example.com'
        }
      };
      
      testLogger.info(testData);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].apiKeys).toEqual({ openai: '***' });
      expect(chunks[0].user.password).toBe('***');
      expect(chunks[0].user.token).toBe('***');
      expect(chunks[0].user.email).toBe('user@example.com');
    });
  });

  describe('LoggingService', () => {
    let loggingService: LoggingService;
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis()
      };
      loggingService = new LoggingService(mockLogger);
    });

    it('should log at different levels', () => {
      loggingService.trace('trace message');
      loggingService.debug('debug message');
      loggingService.info('info message');
      loggingService.warn('warn message');
      loggingService.error('error message');
      loggingService.fatal('fatal message');
      
      expect(mockLogger.trace).toHaveBeenCalledWith('trace message');
      expect(mockLogger.debug).toHaveBeenCalledWith('debug message');
      expect(mockLogger.info).toHaveBeenCalledWith('info message');
      expect(mockLogger.warn).toHaveBeenCalledWith('warn message');
      expect(mockLogger.error).toHaveBeenCalledWith('error message');
      expect(mockLogger.fatal).toHaveBeenCalledWith('fatal message');
    });

    it('should log with context', () => {
      loggingService.info({ userId: '123', action: 'login' }, 'User logged in');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: '123', action: 'login' },
        'User logged in'
      );
    });

    it('should create child logger', () => {
      const childLogger = loggingService.child({ module: 'test' });
      
      expect(mockLogger.child).toHaveBeenCalledWith({ module: 'test' });
    });

    it('should time operations', async () => {
      const result = await loggingService.timeOperation('test-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 42;
      });
      
      expect(result).toBe(42);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-op',
          duration: expect.any(Number)
        }),
        'Operation completed'
      );
    });

    it('should handle operation errors', async () => {
      const error = new Error('Test error');
      
      await expect(
        loggingService.timeOperation('test-op', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-op',
          duration: expect.any(Number),
          error: expect.objectContaining({
            message: 'Test error'
          })
        }),
        'Operation failed'
      );
    });

    it('should log slow operations', async () => {
      const result = await loggingService.timeOperation('test-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'slow';
      }, { slowThreshold: 100 });
      
      expect(result).toBe('slow');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-op',
          duration: expect.any(Number),
          slowThreshold: 100
        }),
        'Slow operation detected'
      );
    });
  });

  describe('formatLogContext', () => {
    it('should format command context', () => {
      const context = formatLogContext('test-command', { verbose: true });
      
      expect(context).toEqual({
        command: 'test-command',
        options: { verbose: true }
      });
    });

    it('should omit sensitive options', () => {
      const context = formatLogContext('test-command', {
        verbose: true,
        apiKey: 'secret',
        token: 'bearer-123'
      });
      
      expect(context).toEqual({
        command: 'test-command',
        options: {
          verbose: true,
          apiKey: '***',
          token: '***'
        }
      });
    });
  });

  describe('createChildLogger', () => {
    it('should create child logger with context', () => {
      const parentLogger = createLogger({} as Config);
      const childLogger = createChildLogger(parentLogger, {
        module: 'test-module',
        requestId: '123'
      });
      
      // Child logger should have the parent's properties
      expect(childLogger.level).toBe(parentLogger.level);
    });
  });

  describe('enhanceWithLogging', () => {
    class TestCommand extends BaseCommand<void, string> {
      constructor(context: any, options: any) {
        super(context, options);
      }
      
      protected get name(): string {
        return 'test-command';
      }
      
      protected async validatePreconditions(): Promise<void> {}
      protected async collectInput(): Promise<void> {}
      protected async performAction(): Promise<string> {
        return 'success';
      }
    }

    it('should enhance command with logging', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis()
      };
      
      const mockUI = {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
        setLogLevel: vi.fn(),
        setSilent: vi.fn()
      };
      
      const EnhancedCommand = enhanceWithLogging(TestCommand);
      const command = new EnhancedCommand(
        {
          config: {} as Config,
          ui: mockUI as any,
          logger: mockLogger as any
        },
        {}
      );
      
      const result = await command.execute();
      
      expect(result).toBe('success');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ duration: expect.any(Number) }),
        'Command completed'
      );
    });

    it('should log command failures', async () => {
      class FailingCommand extends TestCommand {
        protected async performAction(): Promise<string> {
          throw new Error('Command failed');
        }
      }
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis()
      };
      
      const mockUI = {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
        setLogLevel: vi.fn(),
        setSilent: vi.fn()
      };
      
      const EnhancedCommand = enhanceWithLogging(FailingCommand);
      const command = new EnhancedCommand(
        {
          config: {} as Config,
          ui: mockUI as any,
          logger: mockLogger as any
        },
        {}
      );
      
      await expect(command.execute()).rejects.toThrow('Command failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
          duration: expect.any(Number)
        }),
        'Command failed'
      );
    });
  });

  describe('Log Level Configuration', () => {
    it('should convert string log levels to pino levels', () => {
      const testCases = [
        { input: 'trace', expected: 'trace' },
        { input: 'debug', expected: 'debug' },
        { input: 'info', expected: 'info' },
        { input: 'warn', expected: 'warn' },
        { input: 'error', expected: 'error' },
        { input: 'fatal', expected: 'fatal' },
        { input: 'invalid', expected: 'info' } // default
      ];
      
      testCases.forEach(({ input, expected }) => {
        const logger = createLogger({
          promptDirectory: ['./prompts'],
          logLevel: input
        } as Config);
        
        expect(logger.level).toBe(expected);
      });
    });
  });
});