import { ConfigManager } from '../config/config-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import { resolvePrompt } from '../services/prompt-resolver.js';
import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import * as path from 'node:path';
import { pathExists } from 'fs-extra';
import { editorLauncher } from '../utils/editor.js';
import { OutputCaptureService } from '../services/output-capture-service.js';
import { DateFormats } from '../utils/date-formatter.js';
import type { Config } from '../types/config.js';
import crypto from 'node:crypto';
import { isInteractiveTUI, getToolByCommand } from '../utils/tool-detection.js';

export interface RunOptions {
  historyIndex?: number;
  prompt?: string;
  skipPromptSelection?: boolean;
  templateInfo?: {
    templatePath: string;
    templateContent: string;
    variables: Map<string, unknown>;
    finalPrompt: string;
    title?: string;
    summary?: string;
    reviewFiles?: Array<{ name: string; value: unknown }>;
    timestamp?: Date;
  };
  isAutoRun?: boolean;
  promptName?: string;
  noInteractive?: boolean;
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
  // Capture start timestamp for history
  const startTimestamp = new Date();
  
  // Generate filename components once for synchronized naming
  const dateStr = DateFormats.YYYYMMDD(startTimestamp);
  const hours = String(startTimestamp.getHours()).padStart(2, '0');
  const minutes = String(startTimestamp.getMinutes()).padStart(2, '0');
  const seconds = String(startTimestamp.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${minutes}${seconds}`;
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  
  // Load configuration
  const configResult = await ConfigManager.loadWithPath();
  const config = configResult.config;
  
  // Parse arguments
  const { tool, toolArgs, extraArgs } = parseRunArgs(args);
  
  // Determine which tool to use
  let finalTool: string;
  let finalArgs: string[];
  
  if (tool) {
    // Explicit tool specified
    finalTool = tool;
    if (toolArgs.length === 0) {
      // No explicit args — use defaults from SUPPORTED_TOOLS if available
      const toolConfig = getToolByCommand(tool);
      finalArgs = [...(toolConfig?.defaultArgs || []), ...extraArgs];
    } else {
      finalArgs = [...toolArgs, ...extraArgs];
    }
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
    timestamp?: Date;
    rerunFrom?: string;
  } | undefined;
  let exitCode: number | null = null;
  
  // Check if using provided prompt (from autoRun)
  if (options.prompt) {
    promptResult = options.prompt;
    // Use templateInfo if provided
    if (options.templateInfo) {
      templateInfo = options.templateInfo;
    }
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
    
    // Set up templateInfo for saving to history with rerun reference
    templateInfo = {
      templatePath: historyEntry.templatePath,
      templateContent: historyEntry.templateContent,
      variables: new Map(Object.entries(historyEntry.variables)),
      finalPrompt: historyEntry.finalPrompt,
      title: historyEntry.title,
      timestamp: startTimestamp,
      summary: historyEntry.summary,
      // Store the original history filename for rerun reference
      rerunFrom: historyEntry.filename
    };
  } else {
    // Normal flow - discover, select, collect inputs, render
    const resolved = await resolvePrompt({
      promptDirs: config.promptDirs,
      libraries: config.libraries,
      promptName: options.promptName,
      noInteractive: options.noInteractive,
      startTimestamp,
      environment: config.environment,
    });
    promptResult = resolved.text;
    templateInfo = resolved.templateInfo;
  }
  
  // Handle coding tool options - always prompt when using default tool with options configured
  if (!tool && ((config.defaultCmd && config.defaultCmd.trim() !== '') || (config.codingTool && config.codingTool.trim() !== '')) && (config.defaultCmdOptions || config.codingToolOptions)) {
    // Prompt for each option
    const selectedOptions: string[] = [];
    
    if (options.noInteractive) {
      // In no-interactive mode, don't add any optional flags
      logger.log(chalk.dim('Skipping tool options in non-interactive mode'));
    } else {
      for (const [question, arg] of Object.entries(config.defaultCmdOptions || config.codingToolOptions || {})) {
        const answer = await confirm({
          message: question,
          default: false
        });
        
        if (answer) {
          selectedOptions.push(arg);
        }
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

  const startTime = Date.now();
  let outputFile: string | undefined;
  let outputSize: number | undefined;

  try {
    // Check if output capture is enabled
    if (config.outputCapture?.enabled && config.historyDir) {
      const isTUI = isInteractiveTUI(finalTool);
      const result = await executeToolWithCapture(finalTool, finalArgs, promptResult, config, {
        dateStr,
        timeStr,
        randomSuffix
      }, isTUI);
      exitCode = result.exitCode;
      outputFile = result.outputFile;
      outputSize = result.outputSize;
    } else {
      exitCode = await executeTool(finalTool, finalArgs, promptResult, isInteractiveTUI(finalTool));
    }
  } finally {
    const executionTime = Date.now() - startTime;
    
    // Save to history regardless of exit code
    if (config.historyDir && templateInfo && promptResult.trim().length > 0) {
      const historyManager = new HistoryManager(config.historyDir, config.annotationDir);
      await historyManager.savePrompt({
        ...templateInfo,
        outputFile,
        outputSize,
        executionTime,
        exitCode,
        filenameComponents: {
          dateStr,
          timeStr,
          randomSuffix
        }
      });

    }
    
    // Handle post-run file reviews
    if (templateInfo?.reviewFiles && templateInfo.reviewFiles.length > 0) {
      await handlePostRunReviews(templateInfo.reviewFiles, config, options.isAutoRun || options.noInteractive);
    }
  }
  
  // Exit with the same code as the tool
  if (exitCode !== null && exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function executeToolWithCapture(
  tool: string,
  args: string[],
  prompt: string,
  config: Config,
  filenameComponents: { dateStr: string; timeStr: string; randomSuffix: string },
  isTUI: boolean = false
): Promise<{ exitCode: number | null; outputFile?: string; outputSize?: number }> {
  const outputCapture = new OutputCaptureService({
    outputDirectory: config.outputCapture?.directory || config.historyDir!,
    maxOutputSize: (config.outputCapture?.maxSizeMB || 10) * 1024 * 1024
  });

  // Use provided filename components for synchronized naming
  const { dateStr, timeStr, randomSuffix } = filenameComponents;
  const outputFilename = `${dateStr}-${timeStr}-${randomSuffix}-output.json`;
  const outputPath = path.join(
    config.outputCapture?.directory || config.historyDir!,
    outputFilename
  );

  // For interactive TUI tools (Claude, Kiro), pass prompt as argument; for others, use stdin
  let finalArgs = args;
  let finalPrompt = prompt;
  if (isTUI) {
    finalArgs = [...args, prompt];
    finalPrompt = ''; // Don't send via stdin
  }

  const result = await outputCapture.captureCommand(tool, finalArgs, finalPrompt, outputPath);

  return {
    exitCode: result.exitCode,
    outputFile: outputPath,
    outputSize: result.outputSize
  };
}

async function executeTool(tool: string, args: string[], prompt: string, isTUI: boolean = false): Promise<number | null> {
  // For interactive TUI tools (Claude, Kiro), pass prompt as argument; for others, use stdin
  let finalArgs = args;
  let finalPrompt = prompt;
  if (isTUI) {
    finalArgs = [...args, prompt];
    finalPrompt = ''; // Don't send via stdin
  }

  return new Promise((resolve, reject) => {
    // When running interactive TUI tools, inherit stdin for TTY access
    // For other tools, pipe stdin to send the prompt
    const child = spawn(tool, finalArgs, {
      stdio: [isTUI ? 'inherit' : 'pipe', 'inherit', tool === 'claude' ? 'pipe' : 'inherit']
    });

    let _stderrData = '';
    let errorDetected = false;

    // Capture stderr for Claude-specific error detection
    if (tool === 'claude' && child.stderr) {
      child.stderr.on('data', (data) => {
        const output = data.toString();
        _stderrData += output;

        // Still write to stderr so user sees the output
        process.stderr.write(data);

        // Check for the raw mode error
        if (output.includes('Raw mode is not supported') && output.includes('Ink')) {
          errorDetected = true;
        }
      });
    }

    child.on('error', (error: Error & { code?: string }) => {
      if (error.code === 'ENOENT') {
        // Try to suggest similar tools
        const commonTools = ['claude', 'kiro-cli', 'code', 'cat', 'less', 'vim'];
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
      // Handle Claude raw mode error specifically
      // Only show error if Claude actually failed (non-zero exit code)
      if (tool === 'claude' && errorDetected && code !== 0) {
        logger.error(chalk.red('\nError: Claude cannot run in interactive mode when launched from pt.'));
        logger.log(chalk.yellow('\nThis typically happens when Claude needs to ask for directory trust permissions.'));
        logger.log(chalk.blue('\nTo fix this:'));
        logger.log(chalk.white('1. Run Claude directly in this directory: ') + chalk.cyan('claude'));
        logger.log(chalk.white('2. When prompted, trust the directory'));
        logger.log(chalk.white('3. Then run your pt command again\n'));
        logger.log(chalk.dim('Alternatively, you can use: ') + chalk.cyan('pt run claude -- --permission-mode acceptEdits'));
        reject(new Error('Claude requires interactive trust setup. Please see instructions above.'));
        return;
      }
      resolve(code);
    });

    // Write prompt to stdin (only if not Claude Code)
    if (finalPrompt) {
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
          child.stdin.write(finalPrompt);
          child.stdin.end();
        }
      } catch (error) {
        // Ignore EPIPE errors which happen when the tool closes stdin early
        const errorCode = (error as NodeJS.ErrnoException).code;
        if (errorCode !== 'EPIPE') {
          reject(new Error(`Failed to write prompt to tool: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    } else if (child.stdin) {
      // Close stdin even if we're not writing to it
      child.stdin.end();
    }
  });
}

async function handlePostRunReviews(reviewFiles: Array<{ name: string; value: unknown }>, config: Config, isAutoRun?: boolean): Promise<void> {
  logger.log(chalk.dim('\n' + '─'.repeat(60)));
  
  for (const { name, value } of reviewFiles) {
    const filePath = String(value);
    
    // Check if file exists
    const fileExists = await pathExists(filePath);
    if (!fileExists) {
      logger.log(chalk.yellow(`\nFile for '${name}' not found: ${filePath}`));
      continue;
    }
    
    // In autoRun mode, skip the confirmation prompt and directly open the file
    let shouldReview = false;
    if (isAutoRun) {
      shouldReview = true;
      logger.log(chalk.blue(`\nAuto-reviewing file '${name}' (${filePath})`));
    } else {
      // Prompt user to review the file
      shouldReview = await confirm({
        message: `Would you like to review the file '${name}' (${filePath})?`,
        default: true
      });
    }
    
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