import pino from 'pino';
import type { Logger } from 'pino';
import type { Config } from '../types/config.js';
import { isSensitiveKey } from '../utils/security.js';

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogContext {
  [key: string]: unknown;
}

export interface TimeOperationOptions {
  slowThreshold?: number; // milliseconds
  context?: LogContext;
}

export function createLogger(config: Config): Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;
  
  // Determine log level priority: config > env > default
  const configLevel = config.logLevel;
  const envLevel = process.env.LOG_LEVEL;
  const defaultLevel = isDevelopment ? 'debug' : 'info';
  const level = configLevel || envLevel || defaultLevel;

  return pino({
    level: validateLogLevel(level),
    transport: isDevelopment ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
        messageFormat: '{levelLabel} {msg}'
      }
    } : undefined,
    redact: {
      paths: [
        'apiKeys.*',
        '*.password',
        '*.secret',
        '*.token',
        '*.credential',
        '*.privateKey',
        '*.private_key',
        '*.auth',
        '*.bearer'
      ],
      censor: '***'
    },
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    },
    base: {
      app: 'prompt-tool',
      version: config.version || 'unknown'
    }
  });
}

function validateLogLevel(level: string): string {
  const validLevels = Object.values(LogLevel);
  if (validLevels.includes(level as LogLevel)) {
    return level;
  }
  return LogLevel.INFO;
}

export class LoggingService {
  constructor(private logger: Logger) {}

  trace(msg: string): void;
  trace(obj: LogContext, msg: string): void;
  trace(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.trace(objOrMsg);
    } else {
      this.logger.trace(objOrMsg, msg!);
    }
  }

  debug(msg: string): void;
  debug(obj: LogContext, msg: string): void;
  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.debug(objOrMsg);
    } else {
      this.logger.debug(objOrMsg, msg!);
    }
  }

  info(msg: string): void;
  info(obj: LogContext, msg: string): void;
  info(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.info(objOrMsg);
    } else {
      this.logger.info(objOrMsg, msg!);
    }
  }

  warn(msg: string): void;
  warn(obj: LogContext, msg: string): void;
  warn(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.warn(objOrMsg);
    } else {
      this.logger.warn(objOrMsg, msg!);
    }
  }

  error(msg: string): void;
  error(obj: LogContext, msg: string): void;
  error(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.error(objOrMsg);
    } else {
      this.logger.error(objOrMsg, msg!);
    }
  }

  fatal(msg: string): void;
  fatal(obj: LogContext, msg: string): void;
  fatal(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.fatal(objOrMsg);
    } else {
      this.logger.fatal(objOrMsg, msg!);
    }
  }

  child(bindings: LogContext): LoggingService {
    return new LoggingService(this.logger.child(bindings));
  }

  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    options: TimeOperationOptions = {}
  ): Promise<T> {
    const start = Date.now();
    const { slowThreshold = 1000, context = {} } = options;
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      const logContext = {
        operation,
        duration,
        ...context
      };
      
      if (duration > slowThreshold) {
        this.warn(
          { ...logContext, slowThreshold },
          'Slow operation detected'
        );
      } else {
        this.info(logContext, 'Operation completed');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.error(
        {
          operation,
          duration,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error,
          ...context
        },
        'Operation failed'
      );
      
      throw error;
    }
  }
}

export function formatLogContext(command: string, options: Record<string, unknown>): LogContext {
  const sanitizedOptions = Object.entries(options).reduce((acc, [key, value]) => {
    if (isSensitiveKey(key)) {
      acc[key] = '***';
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);

  return {
    command,
    options: sanitizedOptions
  };
}

export function createChildLogger(parentLogger: Logger, context: LogContext): Logger {
  return parentLogger.child(context);
}

// Create a singleton logger instance
let defaultLogger: Logger | null = null;

export function getDefaultLogger(config?: Config): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger(config || {} as Config);
  }
  return defaultLogger;
}

interface CommandWithContext {
  execute(): Promise<unknown>;
  context?: { logger?: Logger };
  name?: string;
}

type CommandConstructor<T> = new (...args: unknown[]) => T;

export function enhanceWithLogging<T extends CommandWithContext>(
  CommandClass: CommandConstructor<T>
): CommandConstructor<T> {
  // Type assertion needed due to TypeScript limitation with generic class extension
  return class extends (CommandClass as CommandConstructor<CommandWithContext>) {
    async execute() {
      const start = Date.now();
      const logger = this.context?.logger || getDefaultLogger();
      const commandName = this.name || 'unknown';
      const loggingService = new LoggingService(logger);
      
      try {
        loggingService.info({ command: commandName }, 'Command started');
        const result = await super.execute();
        const duration = Date.now() - start;
        loggingService.info({ command: commandName, duration }, 'Command completed');
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        loggingService.error({ command: commandName, error, duration }, 'Command failed');
        throw error;
      }
    }
  } as CommandConstructor<T>;
}