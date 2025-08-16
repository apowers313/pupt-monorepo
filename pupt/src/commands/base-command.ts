import { Config } from '../types/config.js';
import { ConsoleUI, LogLevel } from '../ui/console-ui.js';
import { PromptToolError } from '../utils/errors.js';
import pino from 'pino';

export interface CommandContext {
  config: Config;
  ui: ConsoleUI;
  logger: pino.Logger;
}

export interface CommandOptions {
  verbose?: boolean;
  quiet?: boolean;
}

export abstract class BaseCommand<TInput, TOutput = void> {
  protected context: CommandContext;
  protected options: CommandOptions;

  constructor(context: CommandContext, options: CommandOptions = {}) {
    this.context = context;
    this.options = options;
    
    if (options.verbose) {
      context.ui.setLogLevel(LogLevel.DEBUG);
    }
    if (options.quiet) {
      context.ui.setSilent(true);
    }
  }

  async execute(): Promise<TOutput> {
    try {
      this.context.logger.info({ command: this.name }, 'Executing command');
      
      await this.validatePreconditions();
      const input = await this.collectInput();
      const result = await this.performAction(input);
      
      this.context.logger.info({ command: this.name }, 'Command completed');
      return result;
    } catch (error) {
      this.context.logger.error({ command: this.name, error }, 'Command failed');
      
      if (error instanceof PromptToolError) {
        this.context.ui.error(error);
        if (error.suggestions && error.suggestions.length > 0) {
          this.context.ui.info('Suggestions:');
          error.suggestions.forEach(s => this.context.ui.info(`  - ${s.text}`));
        }
      } else {
        this.context.ui.error(error as Error);
      }
      
      throw error;
    }
  }

  protected abstract get name(): string;
  protected abstract validatePreconditions(): Promise<void>;
  protected abstract collectInput(): Promise<TInput>;
  protected abstract performAction(input: TInput): Promise<TOutput>;
}