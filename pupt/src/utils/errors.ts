import chalk from 'chalk';

export interface ErrorSuggestion {
  text: string;
  command?: string;
}

export class PromptToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestions: ErrorSuggestion[] = [],
    public icon: string = '❌'
  ) {
    super(message);
    this.name = 'PromptToolError';
  }
}

export function displayError(error: PromptToolError | Error): void {
  if (error instanceof PromptToolError) {
    console.error(`${error.icon} ${chalk.red('Error:')} ${error.message}`);
    
    if (error.suggestions.length > 0) {
      console.error(chalk.yellow('\n💡 Suggestions:'));
      error.suggestions.forEach(suggestion => {
        console.error(chalk.dim(`   • ${suggestion.text}`));
        if (suggestion.command) {
          console.error(chalk.green(`     ▶️  ${suggestion.command}`));
        }
      });
    }
  } else {
    console.error(chalk.red('Error:'), error.message);
  }
  
  if (process.env.DEBUG === 'true') {
    console.error(chalk.dim('\nStack trace:'));
    console.error(chalk.dim(error.stack || 'No stack trace available'));
  }
}

// Common error creators
export const errors = {
  noPromptsFound: (dirs: string[]) => new PromptToolError(
    `No prompts found in: ${dirs.join(', ')}`,
    'NO_PROMPTS',
    [
      { text: 'Create a new prompt interactively', command: 'pt add' },
      { text: 'Generate a sample prompt', command: 'pt example' },
      { text: `Create a .md file in one of the directories` }
    ],
    '🔍'
  ),

  configMissing: () => new PromptToolError(
    'No configuration found',
    'NO_CONFIG',
    [
      { text: 'Initialize configuration', command: 'pt init' }
    ],
    '⚙️'
  ),

  featureNotEnabled: (feature: string, benefits: string[]) => new PromptToolError(
    `${feature} is not enabled`,
    'FEATURE_DISABLED',
    [
      { text: 'Enable it by running:', command: 'pt init' },
      { text: `Benefits: ${benefits.join(', ')}` }
    ],
    '🎯'
  ),

  toolNotFound: (tool: string, suggestions: string[] = []) => new PromptToolError(
    `Tool '${tool}' not found`,
    'TOOL_NOT_FOUND',
    [
      ...suggestions.map(s => ({ text: `Did you mean '${s}'?` })),
      { text: 'Check if installed', command: `which ${tool}` },
      { text: 'Install if needed', command: `npm install -g ${tool}` }
    ],
    '🔧'
  ),

  noEditor: () => new PromptToolError(
    'No editor configured',
    'NO_EDITOR',
    [
      { text: 'Set your editor:', command: 'export EDITOR=vim' },
      { text: 'For VS Code:', command: 'export EDITOR="code --wait"' },
      { text: 'Add to your shell profile to make permanent' }
    ],
    '✏️'
  ),

  invalidConfig: (field: string, expected: string, actual: unknown) => new PromptToolError(
    `Configuration error: '${field}' must be ${expected} (found: ${typeof actual})`,
    'INVALID_CONFIG',
    [
      { text: `Edit .ptrc.json and fix the '${field}' value` },
      { text: `Expected format: ${expected}` }
    ],
    '⚙️'
  ),

  historyNotFound: (index: number, total: number) => new PromptToolError(
    `History entry #${index} not found`,
    'HISTORY_NOT_FOUND',
    [
      { text: `Available entries: 1-${total}` },
      { text: 'View all entries', command: 'pt history' }
    ],
    '📋'
  ),

  permissionDenied: (path: string) => new PromptToolError(
    `Permission denied: ${path}`,
    'PERMISSION_DENIED',
    [
      { text: 'Check directory permissions', command: `ls -la "${path}"` },
      { text: 'Fix permissions', command: `chmod 755 "${path}"` },
      { text: 'Ensure directory exists', command: `mkdir -p "${path}"` }
    ],
    '🔒'
  ),

  validationError: (field: string, format: string, example: string) => new PromptToolError(
    `Invalid ${field}`,
    'VALIDATION_ERROR',
    [
      { text: `Expected format: ${format}` },
      { text: `Example: ${example}` }
    ],
    '✏️'
  )
};