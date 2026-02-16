import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger.js';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface UIOptions {
  logLevel?: LogLevel;
  useColor?: boolean;
  silent?: boolean;
}

export class ConsoleUI {
  private logLevel: LogLevel;
  private useColor: boolean;
  private silent: boolean;

  constructor(options: UIOptions = {}) {
    this.logLevel = options.logLevel ?? LogLevel.INFO;
    this.useColor = options.useColor ?? true;
    this.silent = options.silent ?? false;
  }

  success(message: string): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const formatted = this.useColor ? chalk.green('✅ ' + message) : '✅ ' + message;
    logger.log(formatted);
  }

  error(error: Error | string): void {
    if (this.silent || this.logLevel < LogLevel.ERROR) return;
    const message = error instanceof Error ? error.message : error;
    const formatted = this.useColor ? chalk.red('❌ ' + message) : '❌ ' + message;
    logger.error(formatted);
  }

  warn(message: string): void {
    if (this.silent || this.logLevel < LogLevel.WARN) return;
    const formatted = this.useColor ? chalk.yellow('⚠️  ' + message) : '⚠️  ' + message;
    logger.warn(formatted);
  }

  info(message: string): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const formatted = this.useColor ? chalk.blue('ℹ️  ' + message) : 'ℹ️  ' + message;
    logger.log(formatted);
  }

  debug(message: string): void {
    if (this.silent || this.logLevel < LogLevel.DEBUG) return;
    const formatted = this.useColor ? chalk.gray('🐛 ' + message) : '🐛 ' + message;
    logger.log(formatted);
  }

  spinner(text: string) {
    if (this.silent) {
      return {
        start: () => {},
        succeed: () => {},
        fail: () => {},
        stop: () => {},
        text: ''
      };
    }
    return ora(text);
  }

  table(data: unknown[]): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    // console.table doesn't have line ending issues, so we keep it
    console.table(data);
  }

  json(data: unknown, pretty = true): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const output = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    logger.log(output);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }
}

