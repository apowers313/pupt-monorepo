import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsoleUI, LogLevel } from '../../src/services/ui-service';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');

describe('ConsoleUI - additional coverage', () => {
  let ui: ConsoleUI;
  let loggerLogSpy: any;
  let loggerErrorSpy: any;
  let loggerWarnSpy: any;
  let consoleClearSpy: any;
  let consoleTableSpy: any;

  beforeEach(() => {
    ui = new ConsoleUI();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
    loggerWarnSpy = vi.mocked(logger.warn).mockImplementation(() => {});
    consoleClearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('divider', () => {
    it('should log a horizontal line', () => {
      ui.divider();

      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      const output = loggerLogSpy.mock.calls[0][0];
      expect(output).toContain('─');
    });

    it('should not log when silent', () => {
      ui.setSilent(true);
      ui.divider();

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('formatHighlight', () => {
    it('should return text containing the original content', () => {
      const result = ui.formatHighlight('important text');

      expect(result).toContain('important text');
    });

    it('should return plain text when colors are disabled', () => {
      const noColorUi = new ConsoleUI({ useColor: false });
      const result = noColorUi.formatHighlight('important text');

      expect(result).toBe('important text');
    });
  });

  describe('formatDim', () => {
    it('should return text containing the original content', () => {
      const result = ui.formatDim('subtle text');

      expect(result).toContain('subtle text');
    });

    it('should return plain text when colors are disabled', () => {
      const noColorUi = new ConsoleUI({ useColor: false });
      const result = noColorUi.formatDim('subtle text');

      expect(result).toBe('subtle text');
    });
  });

  describe('formatBold', () => {
    it('should return text containing the original content', () => {
      const result = ui.formatBold('strong text');

      expect(result).toContain('strong text');
    });

    it('should return plain text when colors are disabled', () => {
      const noColorUi = new ConsoleUI({ useColor: false });
      const result = noColorUi.formatBold('strong text');

      expect(result).toBe('strong text');
    });
  });

  describe('setLogLevel', () => {
    it('should change log level to DEBUG and allow debug messages', () => {
      ui.setLogLevel(LogLevel.DEBUG);
      ui.debug('debug message');

      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('debug message'));
    });

    it('should change log level to ERROR and suppress info messages', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.info('info message');

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should change log level to WARN and suppress info but allow warn', () => {
      ui.setLogLevel(LogLevel.WARN);
      ui.info('info message');
      ui.warn('warn message');

      expect(loggerLogSpy).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('warn message'));
    });
  });

  describe('clear', () => {
    it('should call console.clear when not silent', () => {
      ui.clear();

      expect(consoleClearSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call console.clear when silent', () => {
      ui.setSilent(true);
      ui.clear();

      expect(consoleClearSpy).not.toHaveBeenCalled();
    });
  });

  describe('newline', () => {
    it('should call logger.log with no arguments when not silent', () => {
      ui.newline();

      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call logger.log when silent', () => {
      ui.setSilent(true);
      ui.newline();

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('prompt without description', () => {
    it('should display only the title when no description is provided', () => {
      ui.prompt('Test Title');

      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test Title'));
    });

    it('should display title and description when both are provided', () => {
      ui.prompt('Test Title', 'Test description');

      expect(loggerLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should not log when silent', () => {
      ui.setSilent(true);
      ui.prompt('Test Title', 'Description');

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for header', () => {
    it('should not log header when silent', () => {
      ui.setSilent(true);
      ui.header('Section Title');

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for box', () => {
    it('should not log box when silent', () => {
      ui.setSilent(true);
      ui.box('Content', 'Title');

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for progress', () => {
    it('should not log progress when silent', () => {
      ui.setSilent(true);
      ui.progress('Loading...', 1, 3);

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should not log progress when log level is below INFO', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.progress('Loading...', 1, 3);

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for json', () => {
    it('should not log json when silent', () => {
      ui.setSilent(true);
      ui.json({ key: 'value' });

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should not log json when log level is below INFO', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.json({ key: 'value' });

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for table', () => {
    it('should not log table when log level is below INFO', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.table([{ test: 'data' }]);

      expect(consoleTableSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for error', () => {
    it('should not log error when silent', () => {
      ui.setSilent(true);
      ui.error('Error message');

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode for list', () => {
    it('should not log list when silent', () => {
      ui.setSilent(true);
      ui.list(['Item 1', 'Item 2']);

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should not log list when log level is below INFO', () => {
      ui.setLogLevel(LogLevel.ERROR);
      ui.list(['Item 1', 'Item 2']);

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setUseColor', () => {
    it('should enable color output when set to true', () => {
      const noColorUi = new ConsoleUI({ useColor: false });
      noColorUi.setUseColor(true);
      // After enabling colors, formatted output should contain ANSI codes
      const result = noColorUi.formatHighlight('colored text');
      // chalk with level 3 produces ANSI escape codes
      expect(result).not.toBe('colored text');
      expect(result).toContain('colored text');
    });

    it('should disable color output when set to false', () => {
      const colorUi = new ConsoleUI({ useColor: true });
      colorUi.setUseColor(false);
      const result = colorUi.formatHighlight('plain text');
      expect(result).toBe('plain text');
    });
  });

  describe('progress with useColor true', () => {
    it('should format progress with cyan color when useColor is enabled', () => {
      const colorUi = new ConsoleUI({ useColor: true });
      colorUi.progress('Processing files...', 2, 5);

      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      const output = loggerLogSpy.mock.calls[0][0];
      expect(output).toContain('Processing files...');
      expect(output).toContain('[2/5]');
      expect(output).toContain('40%');
    });
  });

  describe('list with useColor true', () => {
    it('should format list items with dim color when useColor is enabled', () => {
      const colorUi = new ConsoleUI({ useColor: true });
      colorUi.list(['Alpha', 'Beta']);

      expect(loggerLogSpy).toHaveBeenCalledTimes(2);
      const firstCall = loggerLogSpy.mock.calls[0][0];
      expect(firstCall).toContain('Alpha');
    });
  });
});
