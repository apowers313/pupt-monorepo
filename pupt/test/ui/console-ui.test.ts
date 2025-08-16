import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleUI, LogLevel } from '../../src/ui/console-ui';
import chalk from 'chalk';
import ora from 'ora';

vi.mock('ora');

describe('ConsoleUI', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleTableSpy: any;
  let ui: ConsoleUI;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    ui = new ConsoleUI();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleTableSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const ui = new ConsoleUI();
      // Test by checking output
      ui.info('test');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should accept custom options', () => {
      const ui = new ConsoleUI({
        logLevel: LogLevel.ERROR,
        useColor: false,
        silent: true
      });
      
      // Should not output due to silent mode
      ui.info('test');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should log success message with color', () => {
      ui.success('Operation completed');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✅ Operation completed'));
    });

    it('should log success message without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.success('Operation completed');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Operation completed');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.success('Operation completed');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log when log level is below INFO', () => {
      const ui = new ConsoleUI({ logLevel: LogLevel.ERROR });
      ui.success('Operation completed');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message with color', () => {
      ui.error('Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('❌ Something went wrong'));
    });

    it('should log Error object message', () => {
      const error = new Error('Test error');
      ui.error(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('❌ Test error'));
    });

    it('should log error without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.error('Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.error('Something went wrong');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message with color', () => {
      ui.warn('This is a warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  This is a warning'));
    });

    it('should log warning without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.warn('This is a warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  This is a warning');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.warn('This is a warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not log when log level is ERROR', () => {
      const ui = new ConsoleUI({ logLevel: LogLevel.ERROR });
      ui.warn('This is a warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info message with color', () => {
      ui.info('Information');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue('ℹ️  Information'));
    });

    it('should log info without color', () => {
      const ui = new ConsoleUI({ useColor: false });
      ui.info('Information');
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  Information');
    });

    it('should not log when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.info('Information');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug message when log level is DEBUG', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('Debug info');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('🐛 Debug info'));
    });

    it('should not log debug when log level is INFO', () => {
      ui.debug('Debug info');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug without color', () => {
      const ui = new ConsoleUI({ useColor: false, logLevel: LogLevel.DEBUG });
      ui.debug('Debug info');
      expect(consoleLogSpy).toHaveBeenCalledWith('🐛 Debug info');
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
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should display JSON data compact', () => {
      const data = { name: 'test', value: 123 };
      ui.json(data, false);
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it('should not display JSON when silent', () => {
      const ui = new ConsoleUI({ silent: true });
      ui.json({ a: 1 });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setLogLevel', () => {
    it('should change log level', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalled();
      
      ui.setLogLevel(LogLevel.ERROR);
      consoleLogSpy.mockClear();
      ui.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setSilent', () => {
    it('should toggle silent mode', () => {
      ui.setSilent(true);
      ui.info('Message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      
      ui.setSilent(false);
      ui.info('Message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});