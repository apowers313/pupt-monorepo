import os from 'os';

/**
 * Platform-aware logger that ensures consistent line endings
 * and prevents null characters in output
 */
export class Logger {
  private static instance: Logger;
  private readonly lineEnding: string;

  private constructor() {
    // Use platform-specific line endings
    this.lineEnding = os.platform() === 'win32' ? '\r\n' : '\n';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Sanitizes a string for output:
   * - Removes null characters
   * - Normalizes line endings to platform-specific format
   * - Removes trailing newlines to prevent double spacing
   */
  private sanitize(text: string): string {
    return text
      .replace(/\0/g, '') // Remove null characters
      .replace(/\r\n|\r|\n/g, this.lineEnding) // Normalize line endings
      .replace(/[\r\n]+$/, ''); // Remove trailing newlines
  }

  /**
   * Logs a message to stdout with proper line endings
   */
  log(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');
    const sanitized = this.sanitize(message);
    process.stdout.write(sanitized + this.lineEnding);
  }

  /**
   * Logs an error message to stderr with proper line endings
   */
  error(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');
    const sanitized = this.sanitize(message);
    process.stderr.write(sanitized + this.lineEnding);
  }

  /**
   * Logs a message without adding a newline at the end
   */
  write(message: string): void {
    const sanitized = this.sanitize(message);
    process.stdout.write(sanitized);
  }

  /**
   * Logs a warning message to stderr
   */
  warn(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');
    const sanitized = this.sanitize(message);
    process.stderr.write(sanitized + this.lineEnding);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();