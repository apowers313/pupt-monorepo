import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
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

interface ListOptions {
  numbered?: boolean;
  indent?: number;
}

export class ConsoleUI {
  private logLevel: LogLevel;
  private useColor: boolean;
  private silent: boolean;

  constructor(options: UIOptions = {}) {
    this.logLevel = options.logLevel ?? LogLevel.INFO;
    this.useColor = options.useColor ?? chalk.level > 0;
    this.silent = options.silent ?? false;
    
    // Disable chalk if colors are disabled
    if (!this.useColor) {
      chalk.level = 0;
    }
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

  prompt(title: string, description?: string): void {
    if (this.silent) return;
    logger.log(this.useColor ? chalk.bold.blue(`\n📝 ${title}`) : `\n📝 ${title}`);
    if (description) {
      logger.log(this.useColor ? chalk.dim(description) : description);
    }
  }

  progress(message: string, current: number, total: number): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const percentage = Math.round((current / total) * 100);
    const progress = `[${current}/${total}] ${percentage}%`;
    const formatted = this.useColor 
      ? `${chalk.cyan(progress)} ${message}`
      : `${progress} ${message}`;
    logger.log(formatted);
  }

  spinner(text: string): Ora {
    if (this.silent) {
      // Return a no-op spinner
      return {
        start: () => ({ succeed: () => {}, fail: () => {}, stop: () => {} } as Ora),
        succeed: () => {},
        fail: () => {},
        stop: () => {},
        text: ''
      } as Ora;
    }
    return ora({
      text,
      color: this.useColor ? 'cyan' : undefined
    });
  }

  table(data: unknown[]): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    console.table(data);
  }

  json(data: unknown, pretty = true): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const output = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    logger.log(output);
  }

  list(items: string[], options: ListOptions = {}): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const { numbered = false, indent = 2 } = options;
    const indentation = ' '.repeat(indent);
    
    items.forEach((item, index) => {
      const prefix = numbered ? `${index + 1}.` : '•';
      const formatted = this.useColor
        ? chalk.dim(`${indentation}${prefix} ${item}`)
        : `${indentation}${prefix} ${item}`;
      logger.log(formatted);
    });
  }

  header(text: string): void {
    if (this.silent) return;
    const divider = '─'.repeat(text.length + 4);
    logger.log(this.useColor ? chalk.bold(`\n${text}`) : `\n${text}`);
    logger.log(this.useColor ? chalk.dim(divider) : divider);
  }

  box(content: string, title?: string): void {
    if (this.silent) return;
    const boxOptions: Parameters<typeof boxen>[1] = {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: this.useColor ? 'cyan' : undefined,
      ...(title ? { title, titleAlignment: 'center' as const } : {})
    };
    
    logger.log(boxen(content, boxOptions));
  }

  divider(): void {
    if (this.silent) return;
    const line = '─'.repeat(50);
    logger.log(this.useColor ? chalk.dim(line) : line);
  }

  // Formatting helpers
  formatCommand(command: string): string {
    return this.useColor ? chalk.green(`▶️  ${command}`) : `▶️  ${command}`;
  }

  formatPath(path: string): string {
    return this.useColor ? chalk.cyan(path) : path;
  }

  formatUrl(url: string): string {
    return this.useColor ? chalk.underline.blue(url) : url;
  }

  formatHighlight(text: string): string {
    return this.useColor ? chalk.yellow(text) : text;
  }

  formatDim(text: string): string {
    return this.useColor ? chalk.dim(text) : text;
  }

  formatBold(text: string): string {
    return this.useColor ? chalk.bold(text) : text;
  }

  // State management
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  setUseColor(useColor: boolean): void {
    this.useColor = useColor;
    chalk.level = useColor ? 3 : 0;
  }

  // Utility methods
  clear(): void {
    if (!this.silent) {
      console.clear();
    }
  }

  newline(): void {
    if (!this.silent) {
      logger.log();
    }
  }
}

// Singleton instance for convenience
const _ui = new ConsoleUI();