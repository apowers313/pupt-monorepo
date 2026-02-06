import { input, confirm, select } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../types/config.js';
import { isGitRepository, addToGitignore } from '../utils/gitignore.js';
import { detectInstalledTools, getToolByName } from '../utils/tool-detection.js';
import { logger } from '../utils/logger.js';

export async function initCommand(): Promise<void> {
  // Check for existing config
  const configPath = path.join(process.cwd(), '.pt-config.json');
  if (await fs.pathExists(configPath)) {
    const overwrite = await confirm({
      message: 'Config file already exists. Overwrite?',
      default: false
    });
    if (!overwrite) return;
  }

  // Prompt for configuration
  const promptDir = await input({
    message: 'Where should prompts be stored?',
    default: './.prompts'
  });

  const enableHistory = await confirm({
    message: 'Enable prompt history?',
    default: true
  });

  let historyDir: string | undefined;
  let annotationDir: string | undefined;

  if (enableHistory) {
    historyDir = await input({
      message: 'Where should history be stored?',
      default: './.pthistory'
    });

    const enableAnnotations = await confirm({
      message: 'Enable history annotations?',
      default: true
    });

    if (enableAnnotations) {
      annotationDir = await input({
        message: 'Where should annotations be stored?',
        default: './.pthistory'
      });
    }
  }

  // Ask about output capture
  const enableOutputCapture = await confirm({
    message: 'Capture command output?',
    default: true
  });

  // Create directories
  const outputCaptureDir = enableOutputCapture ? (historyDir || '.pt-output') : undefined;
  const dirsToCreate = [promptDir];
  if (historyDir) dirsToCreate.push(historyDir);
  if (annotationDir && annotationDir !== historyDir) dirsToCreate.push(annotationDir);
  if (outputCaptureDir && outputCaptureDir !== historyDir) dirsToCreate.push(outputCaptureDir);

  for (const dir of dirsToCreate) {
    if (!dir) continue; // Skip undefined or empty directories
    const resolvedDir = dir.startsWith('~')
      ? path.join(process.env.HOME || '', dir.slice(2))
      : path.resolve(dir);
    await fs.ensureDir(resolvedDir);
  }

  // Detect installed tools and prompt for default command
  const installedTools = detectInstalledTools();
  let selectedTool: string | undefined;
  let defaultCmd: string | undefined;
  let defaultCmdArgs: string[] | undefined;
  let defaultCmdOptions: Record<string, string> | undefined;
  let autoRun = false; // Default to false

  if (installedTools.length > 0) {
    const toolChoices = [
      ...installedTools.map(tool => ({
        name: tool.displayName,
        value: tool.name
      })),
      { name: 'None', value: 'none' }
    ];

    selectedTool = await select({
      message: 'Select a default AI tool to use with prompts:',
      choices: toolChoices
    });

    if (selectedTool !== 'none') {
      const toolConfig = getToolByName(selectedTool);
      if (toolConfig) {
        defaultCmd = toolConfig.command;
        defaultCmdArgs = toolConfig.defaultArgs;
        defaultCmdOptions = toolConfig.defaultOptions;
        autoRun = true; // Set autoRun to true when a tool is selected
      }
    }
  }

  // Generate config
  // Create base config from DEFAULT_CONFIG, excluding tool-specific settings
  const { defaultCmd: _, defaultCmdArgs: __, defaultCmdOptions: ___, autoRun: ____, ...baseDefaults } = DEFAULT_CONFIG;
  
  const config = {
    ...baseDefaults,
    promptDirs: [promptDir],
    ...(historyDir && { historyDir }),
    ...(annotationDir && { annotationDir }),
    ...(defaultCmd && { defaultCmd }),
    ...(defaultCmdArgs && defaultCmdArgs.length > 0 && { defaultCmdArgs }),
    ...(defaultCmdOptions && Object.keys(defaultCmdOptions).length > 0 && { defaultCmdOptions }),
    autoRun, // Always set autoRun based on tool selection
    outputCapture: {
      enabled: enableOutputCapture,
      directory: outputCaptureDir || '.pt-output',
      maxSizeMB: 50,
      retentionDays: 30
    }
  };

  // Save config
  await fs.writeJson(configPath, config, { spaces: 2 });

  // Add to .gitignore if in git repository
  if (await isGitRepository()) {
    const entriesToIgnore: string[] = [];
    
    // Add config backup file
    entriesToIgnore.push('.pt-config.json.backup');
    
    // Add history directory if it's a local directory
    if (historyDir && !path.isAbsolute(historyDir) && !historyDir.startsWith('~')) {
      // Remove leading ./ for cleaner gitignore entries
      const normalizedHistoryDir = historyDir.replace(/^\.\//, '');
      entriesToIgnore.push(normalizedHistoryDir);
    }
    
    // Add output capture directory if it's local and different from history dir
    if (outputCaptureDir && outputCaptureDir !== historyDir && !path.isAbsolute(outputCaptureDir) && !outputCaptureDir.startsWith('~')) {
      const normalizedOutputDir = outputCaptureDir.replace(/^\.\//, '');
      entriesToIgnore.push(normalizedOutputDir);
    }

    // Add git prompts directory
    const gitPromptDir = config.gitPromptDir || DEFAULT_CONFIG.gitPromptDir || '.git-prompts';
    entriesToIgnore.push(gitPromptDir);
    
    // Add all entries to .gitignore
    for (const entry of entriesToIgnore) {
      await addToGitignore(entry);
    }
  }

  logger.log(chalk.green('✓ Configuration created successfully!'));
}