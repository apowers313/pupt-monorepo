import chalk from 'chalk';
import { logger } from './logger.js';

export enum ErrorCategory {
  USER_ERROR = 'USER_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTERNAL_TOOL_ERROR = 'EXTERNAL_TOOL_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface ErrorSuggestion {
  text: string;
  command?: string;
}

export class PromptToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: ErrorCategory = ErrorCategory.UNKNOWN,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public suggestions: ErrorSuggestion[] = [],
    public icon: string = '❌'
  ) {
    super(message);
    this.name = 'PromptToolError';
  }
}

export interface ErrorOptions {
  message: string;
  code: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  suggestions?: ErrorSuggestion[];
  icon?: string;
}

export function createError(options: ErrorOptions): PromptToolError {
  return new PromptToolError(
    options.message,
    options.code,
    options.category ?? ErrorCategory.UNKNOWN,
    options.severity ?? ErrorSeverity.ERROR,
    options.suggestions ?? [],
    options.icon ?? '❌'
  );
}

export function isRecoverableError(error: unknown): boolean {
  if (!(error instanceof PromptToolError)) {
    return false;
  }
  
  if (error.severity === ErrorSeverity.FATAL) {
    return false;
  }
  
  const recoverableCategories = [
    ErrorCategory.USER_ERROR,
    ErrorCategory.CONFIG_ERROR,
    ErrorCategory.NETWORK_ERROR,
    ErrorCategory.EXTERNAL_TOOL_ERROR
  ];
  
  return recoverableCategories.includes(error.category);
}

export function getErrorCategory(error: unknown): ErrorCategory {
  if (error instanceof PromptToolError) {
    return error.category;
  }
  return ErrorCategory.UNKNOWN;
}

export function displayError(error: PromptToolError | Error): void {
  if (error instanceof PromptToolError) {
    const prefix = error.severity === ErrorSeverity.FATAL 
      ? chalk.bgRed.white(' FATAL ERROR: ')
      : error.severity === ErrorSeverity.WARNING
      ? chalk.yellow('Warning:')
      : chalk.red('Error:');
    
    const displayFn = error.severity === ErrorSeverity.WARNING ? logger.warn.bind(logger) : logger.error.bind(logger);
    
    displayFn(`${error.icon} ${prefix} ${error.message}`);
    
    if (error.suggestions.length > 0) {
      displayFn(chalk.yellow('\n💡 Suggestions:'));
      error.suggestions.forEach(suggestion => {
        displayFn(chalk.dim(`   • ${suggestion.text}`));
        if (suggestion.command) {
          displayFn(chalk.green(`     ▶️  ${suggestion.command}`));
        }
      });
    }
  } else {
    logger.error(chalk.red('Error:'), error.message);
  }
  
  if (process.env.DEBUG === 'true') {
    logger.error(chalk.dim('\nStack trace:'));
    logger.error(chalk.dim(error.stack || 'No stack trace available'));
  }
}

// Common error creators
export const errors = {
  // File System Errors
  fileNotFound: (path: string) => createError({
    message: `File not found: ${path}`,
    code: 'FILE_NOT_FOUND',
    category: ErrorCategory.FILE_SYSTEM_ERROR,
    suggestions: [
      { text: 'Check if the file exists', command: `ls -la "${path}"` },
      { text: 'Verify the path is correct' },
      { text: 'Use absolute paths to avoid confusion' }
    ],
    icon: '📄'
  }),

  permissionDenied: (path: string) => createError({
    message: `Permission denied: ${path}`,
    code: 'PERMISSION_DENIED',
    category: ErrorCategory.FILE_SYSTEM_ERROR,
    suggestions: [
      { text: 'Check directory permissions', command: `ls -la "${path}"` },
      { text: 'Fix permissions', command: `chmod 755 "${path}"` },
      { text: 'Ensure directory exists', command: `mkdir -p "${path}"` }
    ],
    icon: '🔒'
  }),

  // User Errors
  noPromptsFound: (dirs: string[]) => createError({
    message: `No prompts found in: ${dirs.join(', ')}`,
    code: 'NO_PROMPTS',
    category: ErrorCategory.USER_ERROR,
    suggestions: [
      { text: 'Create a new prompt interactively', command: 'pt add' },
      { text: 'Generate a sample prompt', command: 'pt example' },
      { text: `Create a .md file in one of the directories` }
    ],
    icon: '🔍'
  }),

  validationError: (field: string, format: string, example: string) => createError({
    message: `Invalid ${field}`,
    code: 'VALIDATION_ERROR',
    category: ErrorCategory.USER_ERROR,
    severity: ErrorSeverity.WARNING,
    suggestions: [
      { text: `Expected format: ${format}` },
      { text: `Example: ${example}` }
    ],
    icon: '✏️'
  }),

  templateError: (template: string, details: string) => createError({
    message: `Template error in "${template}": ${details}`,
    code: 'TEMPLATE_ERROR',
    category: ErrorCategory.USER_ERROR,
    suggestions: [
      { text: 'Check template syntax' },
      { text: 'Ensure all helpers are closed properly' },
      { text: 'Verify variable names are correct' }
    ],
    icon: '📝'
  }),

  // Configuration Errors
  configMissing: () => createError({
    message: 'No configuration found',
    code: 'NO_CONFIG',
    category: ErrorCategory.CONFIG_ERROR,
    suggestions: [
      { text: 'Initialize configuration', command: 'pt init' }
    ],
    icon: '⚙️'
  }),

  invalidConfig: (field: string, expected: string, actual: unknown) => createError({
    message: `Configuration error: '${field}' must be ${expected} (found: ${typeof actual})`,
    code: 'INVALID_CONFIG',
    category: ErrorCategory.CONFIG_ERROR,
    suggestions: [
      { text: `Edit .pt-config.json and fix the '${field}' value` },
      { text: `Expected format: ${expected}` }
    ],
    icon: '⚙️'
  }),

  featureNotEnabled: (feature: string, benefits: string[]) => createError({
    message: `${feature} is not enabled`,
    code: 'FEATURE_DISABLED',
    category: ErrorCategory.CONFIG_ERROR,
    severity: ErrorSeverity.WARNING,
    suggestions: [
      { text: 'Enable it by running:', command: 'pt init' },
      { text: `Benefits: ${benefits.join(', ')}` }
    ],
    icon: '🎯'
  }),

  // External Tool Errors
  toolNotFound: (tool: string, suggestions: string[] = []) => createError({
    message: `Tool '${tool}' not found`,
    code: 'TOOL_NOT_FOUND',
    category: ErrorCategory.EXTERNAL_TOOL_ERROR,
    suggestions: [
      ...suggestions.map(s => ({ text: `Did you mean '${s}'?` })),
      { text: 'Check if installed', command: `which ${tool}` },
      { text: 'Install if needed', command: `npm install -g ${tool}` }
    ],
    icon: '🔧'
  }),

  noEditor: () => createError({
    message: 'No editor configured',
    code: 'NO_EDITOR',
    category: ErrorCategory.EXTERNAL_TOOL_ERROR,
    suggestions: [
      { text: 'Set your editor:', command: 'export EDITOR=vim' },
      { text: 'For VS Code:', command: 'export EDITOR="code --wait"' },
      { text: 'Add to your shell profile to make permanent' }
    ],
    icon: '✏️'
  }),

  gitError: (details: string) => createError({
    message: `Git error: ${details}`,
    code: 'GIT_ERROR',
    category: ErrorCategory.EXTERNAL_TOOL_ERROR,
    suggestions: [
      { text: 'Check git status', command: 'git status' },
      { text: 'View git log', command: 'git log --oneline -5' },
      { text: 'Ensure you\'re in a git repository' }
    ],
    icon: '🔗'
  }),

  gitNotInstalled: () => createError({
    message: 'Git is not installed',
    code: 'GIT_NOT_INSTALLED',
    category: ErrorCategory.EXTERNAL_TOOL_ERROR,
    suggestions: [
      { text: 'Install git for your platform' },
      { text: 'macOS:', command: 'brew install git' },
      { text: 'Ubuntu/Debian:', command: 'sudo apt-get install git' },
      { text: 'Visit https://git-scm.com/downloads for more options' }
    ],
    icon: '🔗'
  }),

  // Network Errors
  networkError: (url: string, details: string) => createError({
    message: `Network error accessing ${url}: ${details}`,
    code: 'NETWORK_ERROR',
    category: ErrorCategory.NETWORK_ERROR,
    suggestions: [
      { text: 'Check your internet connection' },
      { text: 'Verify the URL is correct' },
      { text: 'Try again in a few moments' },
      { text: 'Check if you need to configure a proxy' }
    ],
    icon: '🌐'
  }),

  // History Errors  
  historyNotFound: (index: number, total: number) => createError({
    message: `History entry #${index} not found`,
    code: 'HISTORY_NOT_FOUND',
    category: ErrorCategory.USER_ERROR,
    severity: ErrorSeverity.WARNING,
    suggestions: [
      { text: `Available entries: 1-${total}` },
      { text: 'View all entries', command: 'pt history' }
    ],
    icon: '📋'
  })
};