import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleUI, LogLevel } from '../../src/ui/console-ui';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../../src/utils/logger.js';

vi.mock('ora');

vi.mock('../../src/utils/logger.js');
describe('ConsoleUI', () => {
  let loggerLogSpy: any;
  let loggerErrorSpy: any;
  let loggerWarnSpy: any;
  let consoleTableSpy: any;
  let ui: ConsoleUI;

  beforeEach(() => {
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
    loggerWarnSpy = vi.mocked(logger.warn).mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    ui = new ConsoleUI();
  });

  afterEach(() => {
    consoleTableSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const ui = new ConsoleUI();
      // Test by checking output
      ui.info('test');
      expect(loggerLogSpy).toHaveBeenCalled();
    });

    it('should accept custom options', () => {
      const ui = new ConsoleUI({
        logLevel: LogLevel.ERROR,
        useColor: false,
        silent: true
      });
      
      // Should not output due to silent mode
      ui.info('test');
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should log success message with color', () => {
      ui.success('Operation completed');
      expect(loggerLogSpy).toHaveBeenCalledWith(chalk.green('✅ Operation completed'));
    });

    it('should log success message without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.success('Operation completed');
      expect(loggerLogSpy).toHaveBeenCalledWith('✅ Operation completed');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.success('Operation completed');
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should not log when log level is below INFO', () => {
      const ui = new ConsoleUI({ logLevel: LogLevel.ERROR });
      ui.success('Operation completed');
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message with color', () => {
      ui.error('Something went wrong');
      expect(loggerErrorSpy).toHaveBeenCalledWith(chalk.red('❌ Something went wrong'));
    });

    it('should log Error object message', () => {
      const error = new Error('Test error');
      ui.error(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(chalk.red('❌ Test error'));
    });

    it('should log error without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.error('Something went wrong');
      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.error('Something went wrong');
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message with color', () => {
      ui.warn('This is a warning');
      expect(loggerWarnSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  This is a warning'));
    });

    it('should log warning without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.warn('This is a warning');
      expect(loggerWarnSpy).toHaveBeenCalledWith('⚠️  This is a warning');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.warn('This is a warning');
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should not log when log level is ERROR', () => {
      const ui = new ConsoleUI({ logLevel: LogLevel.ERROR });
      ui.warn('This is a warning');
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info message with color', () => {
      ui.info('Information');
      expect(loggerLogSpy).toHaveBeenCalledWith(chalk.blue('ℹ️  Information'));
    });

    it('should log info without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.info('Information');
      expect(loggerLogSpy).toHaveBeenCalledWith('ℹ️  Information');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.info('Information');
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug message when log level is DEBUG', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('Debug info');
      expect(loggerLogSpy).toHaveBeenCalledWith(chalk.gray('🐛 Debug info'));
    });

    it('should not log debug when log level is INFO', () => {
      ui.debug('Debug info');
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug without color', () => {
      const ui = new ConsoleUI({ useColor: false, logLevel: LogLevel.DEBUG });
      ui.debug('Debug info');
      expect(loggerLogSpy).toHaveBeenCalledWith('🐛 Debug info');
    });
  });

  describe('spinner', () => {
    it('should create ora spinner when not silent', () => {
      const mockSpinner = { start: vi.fn(), succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() };
      vi.mocked(ora).mockReturnValue(mockSpinner as any);
      
      const spinner = ui.spinner('Loading...');
      expect(ora).toHaveBeenCalledWith('Loading...');
      expect(spinner).toBe(mockSpinner);
    });

    it('should return stub spinner when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      const spinner = ui.spinner('Loading...');
      
      expect(ora).not.toHaveBeenCalled();
      expect(spinner).toHaveProperty('start');
      expect(spinner).toHaveProperty('succeed');
      expect(spinner).toHaveProperty('fail');
      expect(spinner).toHaveProperty('stop');
      expect(spinner).toHaveProperty('text', '');
      
      // Should not throw when calling methods
      expect(() => spinner.start()).not.toThrow();
      expect(() => spinner.succeed()).not.toThrow();
      expect(() => spinner.fail()).not.toThrow();
      expect(() => spinner.stop()).not.toThrow();
    });
  });

  describe('table', () => {
    it('should display table data', () => {
      const data = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
      ui.table(data);
      expect(consoleTableSpy).toHaveBeenCalledWith(data);
    });

    it('should not display table when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.table([{ a: 1 }]);
      expect(consoleTableSpy).not.toHaveBeenCalled();
    });

    it('should not display table when log level is below INFO', () => {
      const ui = new ConsoleUI({ logLevel: LogLevel.ERROR });
      ui.table([{ a: 1 }]);
      expect(consoleTableSpy).not.toHaveBeenCalled();
    });
  });

  describe('json', () => {
    it('should display JSON data pretty printed', () => {
      const data = { name: 'test', value: 123 };
      ui.json(data);
      expect(loggerLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should display JSON data compact', () => {
      const data = { name: 'test', value: 123 };
      ui.json(data, false);
      expect(loggerLogSpy).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it('should not display JSON when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.json({ a: 1 });
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setLogLevel', () => {
    it('should change log level', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('Debug message');
      expect(loggerLogSpy).toHaveBeenCalled();
      
      ui.setLogLevel(LogLevel.ERROR);
      loggerLogSpy.mockClear();
      ui.debug('Debug message');
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setSilent', () => {
    it('should toggle silent mode', () => {
      ui.setSilent(true);
      ui.info('Message');
      expect(loggerLogSpy).not.toHaveBeenCalled();
      
      ui.setSilent(false);
      ui.info('Message');
      expect(loggerLogSpy).toHaveBeenCalled();
    });
  });
});