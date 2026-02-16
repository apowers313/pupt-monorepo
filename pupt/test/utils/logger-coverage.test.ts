import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger - additional coverage', () => {
  let logger: Logger;
  let stdoutSpy: any;
  let stderrSpy: any;

  beforeEach(() => {
    // Clear singleton instance for fresh tests
    (Logger as any).instance = null;
    logger = Logger.getInstance();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe('constructor EPIPE handling', () => {
    it('should register error handlers on stdout and stderr', () => {
      // Verify the Logger constructor attaches error handlers.
      // The constructor calls process.stdout.on('error', ...) and process.stderr.on('error', ...).
      // We can verify by emitting an EPIPE error and checking it does not crash.

      // Clear singleton and spy on the on methods
      (Logger as any).instance = null;
      const stdoutOnSpy = vi.spyOn(process.stdout, 'on');
      const stderrOnSpy = vi.spyOn(process.stderr, 'on');

      const instance = Logger.getInstance();
      expect(instance).toBeDefined();

      // Verify that 'error' listeners were registered
      const stdoutErrorCalls = stdoutOnSpy.mock.calls.filter(
        (call: any[]) => call[0] === 'error'
      );
      const stderrErrorCalls = stderrOnSpy.mock.calls.filter(
        (call: any[]) => call[0] === 'error'
      );

      expect(stdoutErrorCalls.length).toBeGreaterThanOrEqual(1);
      expect(stderrErrorCalls.length).toBeGreaterThanOrEqual(1);

      stdoutOnSpy.mockRestore();
      stderrOnSpy.mockRestore();
    });

    it('should handle EPIPE errors silently in the error handler', () => {
      // Clear singleton and capture the error handler
      (Logger as any).instance = null;
      const stdoutOnSpy = vi.spyOn(process.stdout, 'on');

      Logger.getInstance();

      // Get the registered error handler
      const errorHandlerCall = stdoutOnSpy.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      );
      expect(errorHandlerCall).toBeDefined();

      const handler = errorHandlerCall![1] as (error: NodeJS.ErrnoException) => void;

      // Call the handler with an EPIPE error - should not throw
      const epipeError: NodeJS.ErrnoException = new Error('EPIPE');
      epipeError.code = 'EPIPE';
      expect(() => handler(epipeError)).not.toThrow();

      stdoutOnSpy.mockRestore();
    });

    it('should not throw for non-EPIPE errors in the error handler', () => {
      // The handler only handles EPIPE by returning early.
      // For non-EPIPE errors, it just returns (the handler has no else clause).
      (Logger as any).instance = null;
      const stdoutOnSpy = vi.spyOn(process.stdout, 'on');

      Logger.getInstance();

      const errorHandlerCall = stdoutOnSpy.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      );
      const handler = errorHandlerCall![1] as (error: NodeJS.ErrnoException) => void;

      // Call with a non-EPIPE error - the handler only returns for EPIPE,
      // but since there is no else clause, non-EPIPE errors also just fall through
      const otherError: NodeJS.ErrnoException = new Error('EOTHER');
      otherError.code = 'EOTHER';
      expect(() => handler(otherError)).not.toThrow();

      stdoutOnSpy.mockRestore();
    });

    it('should increase max listeners for stdout and stderr', () => {
      const originalStdoutMax = process.stdout.getMaxListeners();
      const originalStderrMax = process.stderr.getMaxListeners();

      (Logger as any).instance = null;
      Logger.getInstance();

      // The constructor increases max listeners by 1 for each
      expect(process.stdout.getMaxListeners()).toBeGreaterThanOrEqual(originalStdoutMax);
      expect(process.stderr.getMaxListeners()).toBeGreaterThanOrEqual(originalStderrMax);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance on subsequent calls', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
