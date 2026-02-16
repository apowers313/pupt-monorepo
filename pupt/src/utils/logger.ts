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
    
    // Handle EPIPE errors gracefully when output is piped
    // Increase max listeners to avoid warnings in tests
    process.stdout.setMaxListeners(process.stdout.getMaxListeners() + 1);
    process.stderr.setMaxListeners(process.stderr.getMaxListeners() + 1);
    
    const handlePipeError = (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        // Silently ignore EPIPE errors - this is normal when piping to less/head/etc
        // Don't exit, just stop writing
        return;
      }
    };
    
    process.stdout.on('error', handlePipeError);
    process.stderr.on('error', handlePipeError);
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
    try {
      process.stdout.write(sanitized + this.lineEnding);
    } catch (error) {
      // Handle EPIPE errors gracefully when output is piped
      if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
        // Silently ignore - this is normal when piping to less/head/etc
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Logs an error message to stderr with proper line endings
   */
  error(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');
    const sanitized = this.sanitize(message);
    try {
      process.stderr.write(sanitized + this.lineEnding);
    } catch (error) {
      // Handle EPIPE errors gracefully when output is piped
      if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
        // Silently ignore - this is normal when piping to less/head/etc
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Logs a message without adding a newline at the end
   */
  write(message: string): void {
    const sanitized = this.sanitize(message);
    try {
      process.stdout.write(sanitized);
    } catch (error) {
      // Handle EPIPE errors gracefully when output is piped
      if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
        // Silently ignore - this is normal when piping to less/head/etc
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Logs a warning message to stderr
   */
  warn(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');
    const sanitized = this.sanitize(message);
    try {
      process.stderr.write(sanitized + this.lineEnding);
    } catch (error) {
      // Handle EPIPE errors gracefully when output is piped
      if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
        // Silently ignore - this is normal when piping to less/head/etc
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Logs a debug message (only in development/test environments)
   */
  debug(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.DEBUG) {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : String(arg)
      ).join(' ');
      const sanitized = this.sanitize(`[DEBUG] ${message}`);
      try {
        process.stderr.write(sanitized + this.lineEnding);
      } catch (error) {
        // Handle EPIPE errors gracefully when output is piped
        if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
          // Exit gracefully when pipe is closed
          process.exit(0);
        }
        // Re-throw other errors
        throw error;
      }
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();