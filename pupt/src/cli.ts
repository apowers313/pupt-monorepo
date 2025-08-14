#!/usr/bin/env node
import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
import fs from 'fs-extra';
import { errors, displayError } from './utils/errors.js';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

program
  .name('pt')
  .description('CLI tool for managing AI prompts')
  .version(packageJson.version)
  .action(async () => {
    try {
      // Load configuration
      const config = await ConfigManager.load();
      
      // Ensure prompt directories exist
      for (const dir of config.promptDirs) {
        await fs.ensureDir(dir);
      }

      // Discover prompts
      const spinner = ora('Discovering prompts...').start();
      const promptManager = new PromptManager(config.promptDirs);
      const prompts = await promptManager.discoverPrompts();
      spinner.stop();

      if (prompts.length === 0) {
        throw errors.noPromptsFound(config.promptDirs);
      }

      // Interactive search
      const search = new InteractiveSearch();
      const selected = await search.selectPrompt(prompts);

      console.log(chalk.blue(`\nProcessing: ${selected.title}`));
      console.log(chalk.dim(`Location: ${selected.path}\n`));

      // Process template
      const engine = new TemplateEngine();
      const result = await engine.processTemplate(selected.content, selected);

      // Display result
      console.log(chalk.green('\n' + '='.repeat(60)));
      console.log(chalk.bold('Generated Prompt:'));
      console.log(chalk.green('='.repeat(60) + '\n'));
      console.log(result);
      console.log(chalk.green('\n' + '='.repeat(60)));
      
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
        console.log(chalk.dim(`\nSaved to history: ${config.historyDir}`));
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
  .command('history')
  .description('Show prompt execution history')
  .option('-l, --limit <number>', 'Number of entries to show', '20')
  .option('-a, --all', 'Show all history entries')
  .action(async (options) => {
    try {
      await historyCommand({
        limit: options.all ? undefined : parseInt(options.limit),
        all: options.all
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

// Add example command
program
  .command('example')
  .description('Create an example prompt in the current directory')
  .action(async () => {
    const examplePath = './prompts/example-api-client.md';
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
    
    await fs.ensureDir('./prompts');
    await fs.writeFile(examplePath, exampleContent);
    
    console.log(chalk.green(`Created example prompt: ${examplePath}`));
    console.log(chalk.dim('\nRun "pt" to try it out!'));
  });

program.parse();
