import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../src/utils/logger.js';
import os from 'os';

describe('Logger', () => {
  let logger: Logger;
  let stdoutSpy: any;
  let stderrSpy: any;
  let platformSpy: any;

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
    if (platformSpy) {
      platformSpy.mockRestore();
    }
  });

  describe('line endings', () => {
    it('should use platform-specific line endings', () => {
      const isWindows = os.platform() === 'win32';
      const expectedEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('test');
      
      expect(stdoutSpy).toHaveBeenCalled();
      const call = stdoutSpy.mock.calls[0][0];
      expect(call).toBe('test' + expectedEnding);
      
      if (isWindows) {
        expect(call.slice(-2)).toBe('\r\n');
      } else {
        expect(call.charCodeAt(call.length - 1)).toBe(10); // LF
      }
    });

    it('should use CRLF on Windows', () => {
      platformSpy = vi.spyOn(os, 'platform').mockReturnValue('win32');
      
      // Force re-instantiation to pick up platform change
      (Logger as any).instance = null;
      const winLogger = Logger.getInstance();
      
      winLogger.log('test');
      
      expect(stdoutSpy).toHaveBeenCalled();
      const call = stdoutSpy.mock.calls[0][0];
      expect(call).toBe('test\r\n');
      expect(call.slice(-2)).toBe('\r\n');
    });

    it('should normalize mixed line endings to platform format', () => {
      const input = 'line1\r\nline2\nline3\rline4';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      const expected = `line1${lineEnding}line2${lineEnding}line3${lineEnding}line4${lineEnding}`;
      
      logger.log(input);
      
      expect(stdoutSpy).toHaveBeenCalledWith(expected);
    });

    it('should remove trailing newlines before adding platform-specific one', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('test\n\n');
      
      expect(stdoutSpy).toHaveBeenCalledWith(`test${lineEnding}`);
    });
  });

  describe('null character handling', () => {
    it('should remove null characters from output', () => {
      const input = 'test\0string\0with\0nulls';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log(input);
      
      expect(stdoutSpy).toHaveBeenCalledWith(`teststringwithnulls${lineEnding}`);
    });

    it('should handle strings with only null characters', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('\0\0\0');
      
      expect(stdoutSpy).toHaveBeenCalledWith(lineEnding);
    });
  });

  describe('methods', () => {
    it('should log to stdout with log()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('test message');
      
      expect(stdoutSpy).toHaveBeenCalledWith(`test message${lineEnding}`);
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should log to stderr with error()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.error('error message');
      
      expect(stderrSpy).toHaveBeenCalledWith(`error message${lineEnding}`);
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should log to stderr with warn()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.warn('warning message');
      
      expect(stderrSpy).toHaveBeenCalledWith(`warning message${lineEnding}`);
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should write without newline using write()', () => {
      logger.write('partial');
      
      expect(stdoutSpy).toHaveBeenCalledWith('partial');
    });

    it('should handle empty strings', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('');
      
      expect(stdoutSpy).toHaveBeenCalledWith(lineEnding);
    });

    it('should handle undefined as empty string', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log();
      
      expect(stdoutSpy).toHaveBeenCalledWith(lineEnding);
    });
  });

  describe('complex scenarios', () => {
    it('should handle history output with proper formatting', () => {
      const historyOutput = '**Role & Context**: You are a debugging expert\n\nwith deep knowledge';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      const expected = `**Role & Context**: You are a debugging expert${lineEnding}${lineEnding}with deep knowledge${lineEnding}`;

      logger.log(historyOutput);

      expect(stdoutSpy).toHaveBeenCalledWith(expected);
    });

    it('should handle ANSI color codes correctly', () => {
      const coloredText = '\x1b[36m123.\x1b[39m \x1b[90m[2025-08-17 22:24]\x1b[39m Test';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.log(coloredText);

      expect(stdoutSpy).toHaveBeenCalledWith(coloredText + lineEnding);
    });

    it('should prevent double newlines in output', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      // Test that multiple trailing newlines are collapsed
      logger.log('Line 1\n\n\n');
      logger.log('Line 2');

      expect(stdoutSpy).toHaveBeenNthCalledWith(1, `Line 1${lineEnding}`);
      expect(stdoutSpy).toHaveBeenNthCalledWith(2, `Line 2${lineEnding}`);
    });
  });

  describe('multiple arguments', () => {
    it('should join multiple arguments with spaces in log()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.log('a', 'b', 42);

      expect(stdoutSpy).toHaveBeenCalledWith(`a b 42${lineEnding}`);
    });

    it('should join multiple arguments with spaces in error()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.error('a', 'b');

      expect(stderrSpy).toHaveBeenCalledWith(`a b${lineEnding}`);
    });

    it('should join multiple arguments with spaces in warn()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.warn('warning', 'with', 'multiple', 'parts');

      expect(stderrSpy).toHaveBeenCalledWith(`warning with multiple parts${lineEnding}`);
    });

    it('should join multiple arguments with spaces in debug()', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.debug('debug', 'message', 123);

      expect(stderrSpy).toHaveBeenCalledWith(`[DEBUG] debug message 123${lineEnding}`);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('EPIPE error handling', () => {
    it('should handle EPIPE errors gracefully in log()', () => {
      stdoutSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('EPIPE');
        error.code = 'EPIPE';
        throw error;
      });

      // Should not throw
      expect(() => logger.log('test')).not.toThrow();
    });

    it('should re-throw non-EPIPE errors in log()', () => {
      stdoutSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('Some other error');
        error.code = 'EOTHER';
        throw error;
      });

      expect(() => logger.log('test')).toThrow('Some other error');
    });

    it('should handle EPIPE errors gracefully in error()', () => {
      stderrSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('EPIPE');
        error.code = 'EPIPE';
        throw error;
      });

      // Should not throw
      expect(() => logger.error('test')).not.toThrow();
    });

    it('should re-throw non-EPIPE errors in error()', () => {
      stderrSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('Some other error');
        error.code = 'EOTHER';
        throw error;
      });

      expect(() => logger.error('test')).toThrow('Some other error');
    });

    it('should handle EPIPE errors gracefully in write()', () => {
      stdoutSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('EPIPE');
        error.code = 'EPIPE';
        throw error;
      });

      // Should not throw
      expect(() => logger.write('test')).not.toThrow();
    });

    it('should re-throw non-EPIPE errors in write()', () => {
      stdoutSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('Some other error');
        error.code = 'EOTHER';
        throw error;
      });

      expect(() => logger.write('test')).toThrow('Some other error');
    });

    it('should handle EPIPE errors gracefully in warn()', () => {
      stderrSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('EPIPE');
        error.code = 'EPIPE';
        throw error;
      });

      // Should not throw
      expect(() => logger.warn('warning')).not.toThrow();
    });

    it('should re-throw non-EPIPE errors in warn()', () => {
      stderrSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('Some other error');
        error.code = 'EOTHER';
        throw error;
      });

      expect(() => logger.warn('warning')).toThrow('Some other error');
    });
  });

  describe('debug method', () => {
    let originalEnv: string | undefined;
    let originalDebug: string | undefined;
    let processExitSpy: any;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      originalDebug = process.env.DEBUG;
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.DEBUG = originalDebug;
      processExitSpy.mockRestore();
    });

    it('should log when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DEBUG;

      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.debug('test debug');

      expect(stderrSpy).toHaveBeenCalledWith(`[DEBUG] test debug${lineEnding}`);
    });

    it('should log when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DEBUG;

      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.debug('test debug');

      expect(stderrSpy).toHaveBeenCalledWith(`[DEBUG] test debug${lineEnding}`);
    });

    it('should log when DEBUG is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = '1';

      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';

      logger.debug('test debug');

      expect(stderrSpy).toHaveBeenCalledWith(`[DEBUG] test debug${lineEnding}`);
    });

    it('should not log when NODE_ENV is not development/test and DEBUG is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG;

      logger.debug('test debug');

      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should call process.exit(0) on EPIPE error', () => {
      process.env.NODE_ENV = 'development';

      // Mock process.exit to throw a specific error we can catch
      processExitSpy.mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      stderrSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('EPIPE');
        error.code = 'EPIPE';
        throw error;
      });

      // The debug method catches EPIPE and calls process.exit(0)
      // Since we mocked process.exit to throw, we can verify it was called
      expect(() => logger.debug('test')).toThrow('process.exit(0)');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should re-throw non-EPIPE errors in debug()', () => {
      process.env.NODE_ENV = 'development';

      stderrSpy.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('Some other error');
        error.code = 'EOTHER';
        throw error;
      });

      expect(() => logger.debug('test')).toThrow('Some other error');
    });
  });
});