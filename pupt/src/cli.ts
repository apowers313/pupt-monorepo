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
import fs from 'fs-extra';
import { logger } from './utils/logger.js';
import { errors, displayError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

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
  .action(async () => {
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

      // Process template
      const engine = new TemplateEngine(config, configDir);
      const result = await engine.processTemplate(selected.content, selected);

      // Display result
      logger.log(chalk.green('\n' + '='.repeat(60)));
      logger.log(chalk.bold('Generated Prompt:'));
      logger.log(chalk.green('='.repeat(60) + '\n'));
      logger.log(result);
      logger.log(chalk.green('\n' + '='.repeat(60)));
      
      // Save to history if configured
      if (config.historyDir) {
        const historyManager = new HistoryManager(config.historyDir);
        await historyManager.savePrompt({
          templatePath: selected.path,
          templateContent: selected.content,
          variables: engine.getContext().getMaskedValues(),
          finalPrompt: result,
          title: selected.title
        });
        logger.log(chalk.dim(`\nSaved to history: ${config.historyDir}`));
      }
      
      // Check if autoRun is enabled
      if (config.autoRun && config.defaultCmd && config.defaultCmd.trim() !== '') {
        // Use the run command implementation
        await runCommand([], {
          prompt: result
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
  .description('Initialize a new prompt tool configuration')
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
  .action(async (entry, options) => {
    try {
      await historyCommand({
        limit: options.all ? undefined : parseInt(options.limit),
        all: options.all,
        entry: entry ? parseInt(entry) : undefined
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
`)
  .action(async (tool, args, options) => {
    try {
      // Combine tool and args into single array
      const allArgs = tool ? [tool, ...args] : args;
      await runCommand(allArgs, {
        historyIndex: options.history ? parseInt(options.history) : undefined
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

// Add example command
program
  .command('example')
  .description('Create an example prompt in the current directory')
  .action(async () => {
    const examplePath = './.prompts/example-api-client.md';
    const exampleContent = `---
title: API Client Generator
labels: [api, typescript, client]
variables:
  - name: serviceName
    type: input
    message: "What is the name of your API service?"
    default: "MyAPI"
  - name: authType
    type: select
    message: "Choose authentication type:"
    choices: ["none", "api-key", "oauth2", "basic"]
---

# {{serviceName}} API Client

Generate a TypeScript API client for {{serviceName}}.

## Authentication
Type: {{authType}}

## Base Configuration
\`\`\`typescript
export class {{serviceName}}Client {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  // Add methods here
}
\`\`\`

Generated on {{date}} by {{username}}.
`;
    
    await fs.ensureDir('./.prompts');
    await fs.writeFile(examplePath, exampleContent);
    
    logger.log(chalk.green(`Created example prompt: ${examplePath}`));
    logger.log(chalk.dim('\nRun "pt" to try it out!'));
  });

program.parse();
