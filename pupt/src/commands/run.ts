import { ConfigManager } from '../config/config-manager.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { TemplateEngine } from '../template/template-engine.js';
import { HistoryManager } from '../history/history-manager.js';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { errors, PromptToolError } from '../utils/errors.js';
import ora from 'ora';

export interface RunOptions {
  historyIndex?: number;
}

interface ParsedArgs {
  tool: string | undefined;
  toolArgs: string[];
  extraArgs: string[];
}

export function parseRunArgs(args: string[]): ParsedArgs {
  const separatorIndex = args.indexOf('--');
  
  if (separatorIndex === -1) {
    // No separator, all args go to tool
    return {
      tool: args[0],
      toolArgs: args.slice(1),
      extraArgs: []
    };
  }
  
  // Split at separator
  const beforeSeparator = args.slice(0, separatorIndex);
  const afterSeparator = args.slice(separatorIndex + 1);
  
  return {
    tool: beforeSeparator[0],
    toolArgs: beforeSeparator.slice(1),
    extraArgs: afterSeparator
  };
}

export async function runCommand(args: string[], options: RunOptions): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();
  
  // Parse arguments
  const { tool, toolArgs, extraArgs } = parseRunArgs(args);
  
  // Determine which tool to use
  let finalTool: string;
  let finalArgs: string[];
  
  if (tool) {
    // Explicit tool specified
    finalTool = tool;
    finalArgs = [...toolArgs, ...extraArgs];
  } else if (config.codingTool) {
    // Use configured tool
    finalTool = config.codingTool;
    finalArgs = [...(config.codingToolArgs || []), ...extraArgs];
  } else {
    throw new PromptToolError(
      'No tool specified',
      'NO_TOOL',
      [
        { text: 'Specify a tool', command: 'pt run <tool>' },
        { text: 'Configure default tool', command: 'pt init' },
        { text: 'Example', command: 'pt run claude' }
      ],
      '🔧'
    );
  }
  
  let promptResult: string;
  
  // Check if using history
  if (options.historyIndex) {
    // Validate history is enabled
    if (!config.historyDir) {
      throw errors.featureNotEnabled('History tracking', [
        'Track all your prompts',
        'Re-run previous prompts',
        'Add annotations'
      ]);
    }
    
    // Load prompt from history
    const historySpinner = ora('Loading from history...').start();
    const historyManager = new HistoryManager(config.historyDir);
    const historyEntry = await historyManager.getHistoryEntry(options.historyIndex);
    historySpinner.stop();
    
    if (!historyEntry) {
      const entries = await historyManager.listHistory();
      throw errors.historyNotFound(options.historyIndex, entries.length);
    }
    
    console.log(chalk.blue(`\nUsing prompt from history #${options.historyIndex}`));
    console.log(chalk.dim(`Original: ${historyEntry.title || 'Untitled'}`));
    console.log(chalk.dim(`From: ${new Date(historyEntry.timestamp).toLocaleString()}\n`));
    
    promptResult = historyEntry.finalPrompt;
  } else {
    // Normal flow - discover and process prompts
    const discoverSpinner = ora('Discovering prompts...').start();
    const promptManager = new PromptManager(config.promptDirs);
    const prompts = await promptManager.discoverPrompts();
    discoverSpinner.stop();
    
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
    promptResult = await engine.processTemplate(selected.content, selected);
    
    // Save to history if configured
    if (config.historyDir) {
      const historyManager = new HistoryManager(config.historyDir);
      await historyManager.savePrompt({
        templatePath: selected.path,
        templateContent: selected.content,
        variables: engine.getContext().getMaskedValues(),
        finalPrompt: promptResult,
        title: selected.title
      });
    }
  }
  
  // Handle coding tool options
  if (!tool && config.codingTool && config.codingToolOptions) {
    // Prompt for each option
    const selectedOptions: string[] = [];
    
    for (const [question, arg] of Object.entries(config.codingToolOptions)) {
      const answer = await confirm({
        message: question,
        default: false
      });
      
      if (answer) {
        selectedOptions.push(arg);
      }
    }
    
    // Insert options before extra args
    finalArgs = [
      ...(config.codingToolArgs || []),
      ...selectedOptions,
      ...extraArgs
    ];
  }
  
  // Execute tool with prompt
  console.log(chalk.blue(`\nRunning: ${finalTool} ${finalArgs.join(' ')}`));
  console.log(chalk.dim('─'.repeat(60)));
  
  const executeSpinner = ora('Executing tool...').start();
  executeSpinner.stop(); // Stop immediately as tool will show output
  
  await executeTool(finalTool, finalArgs, promptResult);
}

async function executeTool(tool: string, args: string[], prompt: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(tool, args, {
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    child.on('error', (error: Error & { code?: string }) => {
      if (error.code === 'ENOENT') {
        // Try to suggest similar tools
        const commonTools = ['claude', 'code', 'cat', 'less', 'vim'];
        const suggestions = commonTools.filter(t => 
          t.toLowerCase().includes(tool.toLowerCase()) || 
          tool.toLowerCase().includes(t.toLowerCase())
        );
        reject(errors.toolNotFound(tool, suggestions));
      } else {
        reject(error);
      }
    });
    
    child.on('close', (code) => {
      if (code !== null) {
        process.exit(code);
      }
      resolve();
    });
    
    // Write prompt to stdin
    try {
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch (error) {
      reject(new Error(`Failed to write prompt to tool: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}