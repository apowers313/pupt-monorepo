#!/usr/bin/env node
import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as path from 'node:path';
import chalk from 'chalk';
import { ConfigManager } from './config/config-manager.js';
import { PromptManager } from './prompts/prompt-manager.js';
import { InteractiveSearch } from './ui/interactive-search.js';
import { TemplateEngine } from './template/template-engine.js';
import { HistoryManager } from './history/history-manager.js';
import { initCommand } from './commands/init.js';
import { historyCommand } from './commands/history.js';
import { addCommand } from './commands/add.js';
import { editCommand } from './commands/edit.js';
import { runCommand } from './commands/run.js';
import { annotateCommand } from './commands/annotate.js';
import { installCommand } from './commands/install.js';
import { helpCommand } from './commands/help.js';
import { reviewCommand } from './commands/review.js';
import fs from 'fs-extra';
import { logger } from './utils/logger.js';
import { errors, displayError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// List of valid commands for suggestions
const VALID_COMMANDS = ['init', 'history', 'add', 'edit', 'run', 'annotate', 'install', 'review', 'help'];

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Find similar commands based on Levenshtein distance
function findSimilarCommands(input: string, maxDistance: number = 3): string[] {
  return VALID_COMMANDS
    .map(cmd => ({ cmd, distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map(({ cmd }) => cmd);
}

// Ensure terminal is restored on exit
function ensureTerminalCleanup() {
  try {
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  } catch {
    // Ignore errors - terminal might already be in correct state
  }
}

// Set up cleanup handlers
process.on('exit', ensureTerminalCleanup);
process.on('SIGINT', () => {
  ensureTerminalCleanup();
  process.exit(130); // Standard exit code for SIGINT
});
process.on('SIGTERM', () => {
  ensureTerminalCleanup();
  process.exit(143); // Standard exit code for SIGTERM
});

async function checkAndMigrateOldConfig(): Promise<void> {
  // Skip the check in test environment or non-TTY (non-interactive) mode
  if (process.env.NODE_ENV === 'test' || !process.stdin.isTTY) {
    return;
  }
  
  // Check for old config files in current directory
  const oldFiles = await ConfigManager.checkForOldConfigFiles();
  
  if (oldFiles.length > 0) {
    logger.warn(chalk.yellow('\n⚠️  Warning: Found old config file(s):'));
    oldFiles.forEach(file => {
      logger.warn(chalk.yellow(`   - ${path.basename(file)}`));
    });
    
    logger.warn(chalk.yellow('\nThe config file naming has changed from .ptrc to .pt-config'));
    logger.warn(chalk.yellow('Would you like to rename your config file(s)? (y/n): '));
    
    // Get user input
    const { confirm } = await import('@inquirer/prompts');
    const shouldRename = await confirm({
      message: 'Rename config file(s) to new format?',
      default: true
    });
    
    if (shouldRename) {
      for (const oldFile of oldFiles) {
        try {
          const newPath = await ConfigManager.renameOldConfigFile(oldFile);
          logger.log(chalk.green(`✓ Renamed ${path.basename(oldFile)} to ${path.basename(newPath)}`));
        } catch (error) {
          logger.error(chalk.red(`✗ Failed to rename ${path.basename(oldFile)}: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    }
  }
}

// Check for old config files before running commands
await checkAndMigrateOldConfig();

program
  .name('pt')
  .description('CLI tool for managing AI prompts')
  .version(packageJson.version)
  .argument('[command]', 'command to run')
  .allowUnknownOption(true)
  .action(async (command) => {
    // If a command-like argument is provided, it's likely a typo
    if (command && VALID_COMMANDS.length > 0) {
      // Check if it looks like a command (not a flag)
      if (!command.startsWith('-')) {
        const similarCommands = findSimilarCommands(command);
        displayError(errors.commandNotFound(command, similarCommands, VALID_COMMANDS));
        process.exit(1);
      }
    }
    try {
      // Load configuration
      const configResult = await ConfigManager.loadWithPath();
      const config = configResult.config;
      const configDir = configResult.filepath ? path.dirname(configResult.filepath) : undefined;
      
      // Ensure prompt directories exist
      for (const dir of config.promptDirs) {
        await fs.ensureDir(dir);
      }

      // Discover prompts
      const promptManager = new PromptManager(config.promptDirs);
      const prompts = await promptManager.discoverPrompts();

      if (prompts.length === 0) {
        throw errors.noPromptsFound(config.promptDirs);
      }

      // Interactive search to select prompt
      const search = new InteractiveSearch();
      const selected = await search.selectPrompt(prompts);

      logger.log(chalk.blue(`\nProcessing: ${selected.title}`));
      logger.log(chalk.dim(`Location: ${selected.path}\n`));

      // Capture timestamp at start of prompt processing
      const startTimestamp = new Date();

      // Process template
      const engine = new TemplateEngine(config, configDir);
      const result = await engine.processTemplate(selected.content, selected);

      // Display result
      logger.log(chalk.green('\n' + '='.repeat(60)));
      logger.log(chalk.bold('Generated Prompt:'));
      logger.log(chalk.green('='.repeat(60) + '\n'));
      logger.log(result);
      logger.log(chalk.green('\n' + '='.repeat(60)));
      
      // Check if autoRun is enabled
      const willAutoRun = config.autoRun && config.defaultCmd && config.defaultCmd.trim() !== '';
      
      // Save to history if configured and NOT autoRunning (autoRun saves its own history)
      if (config.historyDir && !willAutoRun) {
        const historyManager = new HistoryManager(config.historyDir, config.annotationDir);
        await historyManager.savePrompt({
          templatePath: selected.path,
          templateContent: selected.content,
          variables: engine.getContext().getMaskedValues(),
          finalPrompt: result,
          title: selected.title,
          timestamp: startTimestamp
        });
        logger.log(chalk.dim(`\nSaved to history: ${config.historyDir}`));
      }
      
      // Execute autoRun if enabled
      if (willAutoRun) {
        // Use the run command implementation
        await runCommand([], {
          prompt: result,
          templateInfo: {
            templatePath: selected.path,
            templateContent: selected.content,
            variables: engine.getContext().getMaskedValues(),
            finalPrompt: result,
            title: selected.title,
            timestamp: startTimestamp,
            summary: selected.summary,
            reviewFiles: engine.getContext().getVariablesByType('reviewFile')
          },
          isAutoRun: true
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        // User cancelled
        process.exit(0);
      }
      displayError(error as Error);
      process.exit(1);
    }
  });

// Add init command
program
  .command('init')
  .description('Initialize a new PUPT configuration')
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Add history command
program
  .command('history [entry]')
  .description('Show prompt execution history or a specific entry')
  .option('-l, --limit <number>', 'Number of entries to show', '20')
  .option('-a, --all', 'Show all history entries')
  .option('-r, --result <number>', 'Show history entry with its output')
  .option('--annotations', 'Show annotations for the history entry')
  .option('-d, --dir <path>', 'Filter history by directory (git dir or working dir)')
  .option('--all-dir', 'Show history from all directories (disable default filtering)')
  .action(async (entry, options) => {
    try {
      await historyCommand({
        limit: options.all ? undefined : parseInt(options.limit),
        all: options.all,
        entry: entry ? parseInt(entry) : undefined,
        result: options.result ? parseInt(options.result) : undefined,
        annotations: options.annotations,
        dir: options.dir,
        allDir: options.allDir
      });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Add command
program
  .command('add')
  .description('Create a new prompt interactively')
  .action(async () => {
    try {
      await addCommand();
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Edit command
program
  .command('edit')
  .description('Edit an existing prompt in your editor')
  .action(async () => {
    try {
      await editCommand();
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Run command
program
  .command('run [tool] [args...]')
  .description('Execute a prompt with an external tool')
  .usage('[tool] [args...] [-- tool-specific-args]')
  .option('-h, --history <number>', 'Use prompt from history by number')
  .option('-p, --prompt <name>', 'Use specified prompt by title or filename')
  .option('--no-interactive', 'Use default values for all prompt inputs')
  .helpOption('--help', 'Display help for run command')
  .addHelpText('after', `
Examples:
  pt run                     # Use configured coding tool
  pt run cat                 # Pipe prompt to cat
  pt run code -              # Open in VS Code
  pt run claude              # Send to Claude
  pt run -- --continue       # Pass args to configured tool
  pt run npm test -- --coverage  # Complex command with args
  pt run -h 3                # Re-run prompt from history #3
  pt run -h 1 claude         # Send history #1 to claude
  pt run -p api-client       # Run specific prompt by name
  pt run -p api-client --no-interactive  # Run with defaults only
`)
  .action(async (tool, args, options) => {
    try {
      // Combine tool and args into single array
      const allArgs = tool ? [tool, ...args] : args;
      await runCommand(allArgs, {
        historyIndex: options.history ? parseInt(options.history) : undefined,
        promptName: options.prompt,
        noInteractive: options.interactive === false
      });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Annotate command
program
  .command('annotate [history-number]')
  .description('Add notes to a history entry')
  .action(async (historyNumber) => {
    try {
      await annotateCommand(historyNumber ? parseInt(historyNumber) : undefined);
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Install command
program
  .command('install <source>')
  .description('Install prompts from a git repository or npm package')
  .addHelpText('after', `
Examples:
  pt install https://github.com/user/prompts     # Install from GitHub
  pt install git@github.com:user/prompts.git     # Install via SSH
  pt install @org/prompts                        # Install from npm (coming soon)
`)
  .action(async (source) => {
    try {
      await installCommand(source);
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Review command
program
  .command('review [prompt-name]')
  .description('Review prompt usage patterns and generate improvement suggestions')
  .option('-f, --format <format>', 'Output format (json|markdown)', 'markdown')
  .option('-s, --since <time>', 'Time filter (e.g., 7d, 24h, 2w)', '30d')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .addHelpText('after', `
Examples:
  pt review                      # Review all prompts from last 30 days
  pt review api-client           # Review specific prompt
  pt review -s 7d                # Review last 7 days
  pt review -f json              # Output as JSON
  pt review -o review.json       # Save to file
`)
  .action(async (promptName, options) => {
    try {
      await reviewCommand(promptName, {
        format: options.format,
        since: options.since,
        output: options.output
      });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Help command
program
  .command('help [command]')
  .description('Display help information for a command')
  .action(async (command) => {
    try {
      await helpCommand(command);
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  const unknownCommand = operands[0];
  const similarCommands = findSimilarCommands(unknownCommand);
  displayError(errors.commandNotFound(unknownCommand, similarCommands, VALID_COMMANDS));
  process.exit(1);
});

program.parse();
