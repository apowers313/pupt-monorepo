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
import fs from 'fs-extra';

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
      const promptManager = new PromptManager(config.promptDirs);
      const prompts = await promptManager.discoverPrompts();

      if (prompts.length === 0) {
        console.log(chalk.yellow('\nNo prompts found. Create a prompt file in one of these directories:'));
        config.promptDirs.forEach(dir => console.log(`  - ${dir}`));
        console.log(chalk.dim('\nExample prompt file (hello.md):'));
        console.log(chalk.dim('---'));
        console.log(chalk.dim('title: Hello World'));
        console.log(chalk.dim('---'));
        console.log(chalk.dim('Hello {{input "name" "What is your name?"}}!'));
        process.exit(0);
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
          finalPrompt: result
        });
        console.log(chalk.dim(`\nSaved to history: ${config.historyDir}`));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        // User cancelled
        process.exit(0);
      }
      console.error(chalk.red('Error:'), error);
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
