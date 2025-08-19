import { ConfigManager } from '../config/config-manager.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { TemplateEngine } from '../template/template-engine.js';
import { HistoryManager } from '../history/history-manager.js';
import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import * as path from 'node:path';
import { pathExists } from 'fs-extra';
import { editorLauncher } from '../utils/editor.js';
import type { Config } from '../types/config.js';

export interface RunOptions {
  historyIndex?: number;
  prompt?: string;
  skipPromptSelection?: boolean;
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
  const configResult = await ConfigManager.loadWithPath();
  const config = configResult.config;
  const configDir = configResult.filepath ? path.dirname(configResult.filepath) : undefined;
  
  // Parse arguments
  const { tool, toolArgs, extraArgs } = parseRunArgs(args);
  
  // Determine which tool to use
  let finalTool: string;
  let finalArgs: string[];
  
  if (tool) {
    // Explicit tool specified
    finalTool = tool;
    finalArgs = [...toolArgs, ...extraArgs];
  } else if ((config.defaultCmd && config.defaultCmd.trim() !== '') || (config.codingTool && config.codingTool.trim() !== '')) {
    // Use configured tool (prefer new field name)
    finalTool = (config.defaultCmd && config.defaultCmd.trim() !== '' ? config.defaultCmd : config.codingTool)!;
    finalArgs = [...(config.defaultCmdArgs || config.codingToolArgs || []), ...extraArgs];
  } else {
    throw errors.toolNotFound('', ['claude', 'copilot', 'chat']);
  }
  
  let promptResult: string;
  let templateInfo: {
    templatePath: string;
    templateContent: string;
    variables: Map<string, unknown>;
    finalPrompt: string;
    title?: string;
    summary?: string;
    reviewFiles?: Array<{ name: string; value: unknown }>;
  } | undefined;
  let exitCode: number | null = null;
  
  // Check if using provided prompt (from autoRun)
  if (options.prompt) {
    promptResult = options.prompt;
  } else if (options.historyIndex) {
    // Validate history is enabled
    if (!config.historyDir) {
      throw errors.featureNotEnabled('History tracking', [
        'Track all your prompts',
        'Re-run previous prompts',
        'Add annotations'
      ]);
    }
    
    // Load prompt from history
    const historyManager = new HistoryManager(config.historyDir);
    const historyEntry = await historyManager.getHistoryEntry(options.historyIndex);
    
    if (!historyEntry) {
      const entries = await historyManager.listHistory();
      throw errors.historyNotFound(options.historyIndex, entries.length);
    }
    
    logger.log(chalk.blue(`\nUsing prompt from history #${options.historyIndex}`));
    logger.log(chalk.dim(`Original: ${historyEntry.title || 'Untitled'}`));
    logger.log(chalk.dim(`From: ${new Date(historyEntry.timestamp).toLocaleString()}\n`));
    
    promptResult = historyEntry.finalPrompt;
  } else {
    // Normal flow - discover and process prompts
    const promptManager = new PromptManager(config.promptDirs);
    const prompts = await promptManager.discoverPrompts();
    
    if (prompts.length === 0) {
      throw errors.noPromptsFound(config.promptDirs);
    }
    
    // Interactive search
    const search = new InteractiveSearch();
    const selected = await search.selectPrompt(prompts);
    
    logger.log(chalk.blue(`\nProcessing: ${selected.title}`));
    logger.log(chalk.dim(`Location: ${selected.path}\n`));
    
    // Process template
    const engine = new TemplateEngine(config, configDir);
    promptResult = await engine.processTemplate(selected.content, selected);
    
    // Store template info for history saving after successful execution
    templateInfo = {
      templatePath: selected.path,
      templateContent: selected.content,
      variables: engine.getContext().getMaskedValues(),
      finalPrompt: promptResult,
      title: selected.title,
      summary: selected.summary,
      reviewFiles: engine.getContext().getVariablesByType('reviewFile')
    };
  }
  
  // Handle coding tool options - always prompt when using default tool with options configured
  if (!tool && ((config.defaultCmd && config.defaultCmd.trim() !== '') || (config.codingTool && config.codingTool.trim() !== '')) && (config.defaultCmdOptions || config.codingToolOptions)) {
    // Prompt for each option
    const selectedOptions: string[] = [];
    
    for (const [question, arg] of Object.entries(config.defaultCmdOptions || config.codingToolOptions || {})) {
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
      ...(config.defaultCmdArgs || config.codingToolArgs || []),
      ...selectedOptions,
      ...extraArgs
    ];
  }
  
  // Execute tool with prompt
  logger.log(chalk.blue(`\nRunning: ${finalTool} ${finalArgs.join(' ')}`));
  logger.log(chalk.dim('─'.repeat(60)));
  
  try {
    exitCode = await executeTool(finalTool, finalArgs, promptResult);
  } finally {
    // Save to history regardless of exit code
    if (config.historyDir && templateInfo && promptResult.trim().length > 0) {
      const historyManager = new HistoryManager(config.historyDir);
      await historyManager.savePrompt(templateInfo);
    }
    
    // Handle post-run file reviews
    if (templateInfo?.reviewFiles && templateInfo.reviewFiles.length > 0) {
      await handlePostRunReviews(templateInfo.reviewFiles, config);
    }
  }
  
  // Exit with the same code as the tool
  if (exitCode !== null && exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function executeTool(tool: string, args: string[], prompt: string): Promise<number | null> {
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
      resolve(code);
    });
    
    // Write prompt to stdin
    try {
      if (child.stdin) {
        // Only add error handler if stdin has on method (not mocked in tests)
        if (typeof child.stdin.on === 'function') {
          child.stdin.on('error', (error) => {
            // Ignore EPIPE errors which happen when the tool closes stdin early
            const errorCode = (error as NodeJS.ErrnoException).code;
            if (errorCode !== 'EPIPE') {
              logger.error(`stdin error: ${error}`);
            }
          });
        }
        child.stdin.write(prompt);
        child.stdin.end();
      }
    } catch (error) {
      // Ignore EPIPE errors which happen when the tool closes stdin early
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode !== 'EPIPE') {
        reject(new Error(`Failed to write prompt to tool: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  });
}

async function handlePostRunReviews(reviewFiles: Array<{ name: string; value: unknown }>, config: Config): Promise<void> {
  logger.log(chalk.dim('\n' + '─'.repeat(60)));
  
  for (const { name, value } of reviewFiles) {
    const filePath = String(value);
    
    // Check if file exists
    const fileExists = await pathExists(filePath);
    if (!fileExists) {
      logger.log(chalk.yellow(`\nFile for '${name}' not found: ${filePath}`));
      continue;
    }
    
    // Prompt user to review the file
    const shouldReview = await confirm({
      message: `Would you like to review the file '${name}' (${filePath})?`,
      default: true
    });
    
    if (shouldReview) {
      // Check autoReview setting (default to true)
      const autoReview = config.autoReview ?? true;
      
      if (autoReview) {
        // Find an editor and open the file
        const editor = await editorLauncher.findEditor();
        if (!editor) {
          logger.log(chalk.yellow('No editor found. Please configure an editor or set autoReview to false.'));
          continue;
        }
        
        try {
          logger.log(chalk.blue(`Opening ${filePath} in ${editor}...`));
          await editorLauncher.openInEditor(editor, filePath);
        } catch (error) {
          logger.error(chalk.red(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`));
        }
      } else {
        logger.log(chalk.dim(`File saved at: ${filePath}`));
      }
    }
  }
}