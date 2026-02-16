import chalk from 'chalk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsoleUI, LogLevel } from '../../src/services/ui-service';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');

describe('ConsoleUI', () => {
  let ui: ConsoleUI;
  let loggerLogSpy: any;
  let loggerErrorSpy: any;
  let loggerWarnSpy: any;
  let consoleTableSpy: any;

  beforeEach(() => {
    ui = new ConsoleUI();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
    loggerWarnSpy = vi.mocked(logger.warn).mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('success', () => {
    it('should log success message with green color', () => {
      ui.success('Operation completed');
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Operation completed'));
    });

    it('should not log when silent', () => {
      ui.setSilent(true);
      ui.success('Operation completed');
      
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should not log when log level is below INFO', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.success('Operation completed');
      
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message with red color', () => {
      ui.error('Something went wrong');
      
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌'));
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      ui.error(error);
      
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    it('should log even at ERROR level', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.error('Error message');
      
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message with yellow color', () => {
      ui.warn('Warning message');
      
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });

    it('should not log when log level is ERROR', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.warn('Warning message');
      
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info message with blue color', () => {
      ui.info('Information');
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Information'));
    });
  });

  describe('debug', () => {
    it('should log debug message with gray color', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('Debug info');
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('🐛'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Debug info'));
    });

    it('should not log when log level is INFO', () => {
      ui.debug('Debug info');
      
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('prompt', () => {
    it('should display prompt header', () => {
      ui.prompt('Test Prompt', 'This is a test prompt');
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('📝 Test Prompt'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('This is a test prompt'));
    });
  });

  describe('progress', () => {
    it('should show progress message', () => {
      ui.progress('Loading...', 1, 3);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('[1/3]'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loading...'));
    });
  });

  describe('spinner', () => {
    it('should create spinner when not silent', () => {
      const spinner = ui.spinner('Loading...');
      
      expect(spinner.start).toBeDefined();
      expect(spinner.succeed).toBeDefined();
      expect(spinner.fail).toBeDefined();
    });

    it('should create no-op spinner when silent', () => {
      ui.setSilent(true);
      const spinner = ui.spinner('Loading...');
      
      spinner.start();
      spinner.succeed();
      spinner.fail();
      
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('table', () => {
    it('should display table', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      
      ui.table(data);
      
      expect(consoleTableSpy).toHaveBeenCalledWith(data);
    });

    it('should not display table when silent', () => {
      ui.setSilent(true);
      ui.table([{ test: 'data' }]);
      
      expect(consoleTableSpy).not.toHaveBeenCalled();
    });
  });

  describe('json', () => {
    it('should display pretty JSON by default', () => {
      const data = { test: 'value', nested: { key: 'value' } };
      ui.json(data);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should display compact JSON when specified', () => {
      const data = { test: 'value' };
      ui.json(data, false);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(JSON.stringify(data));
    });
  });

  describe('formatters', () => {
    it('should format command', () => {
      const formatted = ui.formatCommand('npm install');
      expect(formatted).toContain('npm install');
    });

    it('should format path', () => {
      const formatted = ui.formatPath('/home/user/file.txt');
      expect(formatted).toContain('/home/user/file.txt');
    });

    it('should format URL', () => {
      const formatted = ui.formatUrl('https://example.com');
      expect(formatted).toContain('https://example.com');
    });
  });

  describe('list', () => {
    it('should display bulleted list', () => {
      ui.list(['Item 1', 'Item 2', 'Item 3']);
      
      expect(loggerLogSpy).toHaveBeenCalledTimes(3);
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 1'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 2'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 3'));
    });

    it('should display numbered list', () => {
      ui.list(['Item 1', 'Item 2'], { numbered: true });
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. Item 1'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('2. Item 2'));
    });
  });

  describe('header', () => {
    it('should display header with divider', () => {
      ui.header('Section Title');
      
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Section Title'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('─'));
    });
  });

  describe('box', () => {
    it('should display content in a box', () => {
      ui.box('Important message');
      
      expect(loggerLogSpy).toHaveBeenCalled();
      // Box should have borders (rounded corners)
      const calls = loggerLogSpy.mock.calls.map((call: any[]) => call[0]);
      const output = calls.join('\n');
      expect(output).toContain('╭');
      expect(output).toContain('╰');
      expect(output).toContain('Important message');
    });
  });

  describe('color modes', () => {
    it('should disable colors when specified', () => {
      ui = new ConsoleUI({ useColor: false });
      ui.success('Test');
      
      expect(loggerLogSpy).toHaveBeenCalledWith('✅ Test');
    });
  });
});