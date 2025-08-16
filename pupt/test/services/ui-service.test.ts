import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleUI, LogLevel } from '../../src/services/ui-service';
import chalk from 'chalk';

describe('ConsoleUI', () => {
  let ui: ConsoleUI;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleTableSpy: any;

  beforeEach(() => {
    ui = new ConsoleUI();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('success', () => {
    it('should log success message with green color', () => {
      ui.success('Operation completed');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Operation completed'));
    });

    it('should not log when silent', () => {
      ui.setSilent(true);
      ui.success('Operation completed');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log when log level is below INFO', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.success('Operation completed');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message with red color', () => {
      ui.error('Something went wrong');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      ui.error(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    it('should log even at ERROR level', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.error('Error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message with yellow color', () => {
      ui.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });

    it('should not log when log level is ERROR', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.warn('Warning message');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info message with blue color', () => {
      ui.info('Information');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Information'));
    });
  });

  describe('debug', () => {
    it('should log debug message with gray color', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('Debug info');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🐛'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Debug info'));
    });

    it('should not log when log level is INFO', () => {
      ui.debug('Debug info');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('prompt', () => {
    it('should display prompt header', () => {
      ui.prompt('Test Prompt', 'This is a test prompt');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📝 Test Prompt'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('This is a test prompt'));
    });
  });

  describe('progress', () => {
    it('should show progress message', () => {
      ui.progress('Loading...', 1, 3);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[1/3]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loading...'));
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
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
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
      
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should display compact JSON when specified', () => {
      const data = { test: 'value' };
      ui.json(data, false);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data));
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
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 2'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 3'));
    });

    it('should display numbered list', () => {
      ui.list(['Item 1', 'Item 2'], { numbered: true });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. Item 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2. Item 2'));
    });
  });

  describe('header', () => {
    it('should display header with divider', () => {
      ui.header('Section Title');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Section Title'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('─'));
    });
  });

  describe('box', () => {
    it('should display content in a box', () => {
      ui.box('Important message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      // Box should have borders (rounded corners)
      const calls = consoleLogSpy.mock.calls.map((call: any[]) => call[0]);
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
      
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Test');
    });
  });
});