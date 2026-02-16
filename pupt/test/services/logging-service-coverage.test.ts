import { beforeEach,describe, expect, it, vi } from 'vitest';

import {
  enhanceWithLogging,
  LoggingService,
} from '../../src/services/logging-service.js';

describe('LoggingService coverage', () => {
  describe('fatal with LogContext object', () => {
    let loggingService: LoggingService;
    let mockLogger: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
      mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };
      loggingService = new LoggingService(mockLogger as any);
    });

    it('should call logger.fatal with context object and message string', () => {
      const ctx = { errorCode: 'CRITICAL', component: 'database' };
      loggingService.fatal(ctx, 'System is shutting down');

      expect(mockLogger.fatal).toHaveBeenCalledWith(
        { errorCode: 'CRITICAL', component: 'database' },
        'System is shutting down',
      );
    });

    it('should pass the context object as first argument when called with two args', () => {
      const ctx = { reason: 'out-of-memory' };
      loggingService.fatal(ctx, 'Fatal error occurred');

      expect(mockLogger.fatal).toHaveBeenCalledTimes(1);
      const [firstArg, secondArg] = mockLogger.fatal.mock.calls[0];
      expect(typeof firstArg).toBe('object');
      expect(firstArg).toEqual({ reason: 'out-of-memory' });
      expect(secondArg).toBe('Fatal error occurred');
    });
  });

  describe('getDefaultLogger via enhanceWithLogging', () => {
    it('should use default logger when command context has no logger', async () => {
      // Create a minimal command class matching the CommandWithContext interface
      // used by enhanceWithLogging. When context.logger is undefined, the
      // enhanced execute() falls back to getDefaultLogger().
      class MinimalCommand {
        context: { logger?: undefined };
        name: string;

        constructor() {
          this.context = { logger: undefined };
          this.name = 'test-no-logger';
        }

        async execute(): Promise<string> {
          return 'result';
        }
      }

      const Enhanced = enhanceWithLogging(MinimalCommand as any);
      const instance = new Enhanced();
      const result = await instance.execute();

      expect(result).toBe('result');
    });

    it('should use default logger when context is entirely missing', async () => {
      class NoContextCommand {
        name = 'no-context-cmd';

        async execute(): Promise<number> {
          return 42;
        }
      }

      const Enhanced = enhanceWithLogging(NoContextCommand as any);
      const instance = new Enhanced();
      const result = await instance.execute();

      expect(result).toBe(42);
    });

    it('should log command failure through default logger when context has no logger', async () => {
      class FailingCommand {
        name = 'failing-cmd';

        async execute(): Promise<void> {
          throw new Error('critical failure');
        }
      }

      const Enhanced = enhanceWithLogging(FailingCommand as any);
      const instance = new Enhanced();

      await expect(instance.execute()).rejects.toThrow('critical failure');
    });
  });
});
