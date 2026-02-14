import { input, confirm, select } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../types/config.js';
import { detectInstalledTools, getToolByName } from '../utils/tool-detection.js';
import { logger } from '../utils/logger.js';
import { getConfigPath, getDataDir } from '../config/global-paths.js';

export async function initCommand(): Promise<void> {
  const configPath = getConfigPath();
  const dataDir = getDataDir();

  // Check for existing config
  if (await fs.pathExists(configPath)) {
    const reconfigure = await confirm({
      message: 'Global config already exists. Reconfigure?',
      default: false
    });
    if (!reconfigure) return;
  }

  // Prompt for prompt directory
  const defaultPromptDir = path.join(dataDir, 'prompts');
  const promptDir = await input({
    message: 'Where should prompts be stored?',
    default: defaultPromptDir
  });

  // Ask about output capture
  const enableOutputCapture = await confirm({
    message: 'Capture command output?',
    default: true
  });

  // Create directories
  const promptDirResolved = promptDir.startsWith('~')
    ? path.join(process.env.HOME || '', promptDir.slice(2))
    : path.resolve(promptDir);
  await fs.ensureDir(promptDirResolved);

  // Detect installed tools and prompt for default command
  const installedTools = detectInstalledTools();
  let defaultCmd: string | undefined;
  let defaultCmdArgs: string[] | undefined;
  let defaultCmdOptions: Record<string, string> | undefined;
  let autoRun = false;

  if (installedTools.length > 0) {
    const toolChoices = [
      ...installedTools.map(tool => ({
        name: tool.displayName,
        value: tool.name
      })),
      { name: 'None', value: 'none' }
    ];

    const selectedTool = await select({
      message: 'Select a default AI tool to use with prompts:',
      choices: toolChoices
    });

    if (selectedTool !== 'none') {
      const toolConfig = getToolByName(selectedTool);
      if (toolConfig) {
        defaultCmd = toolConfig.command;
        defaultCmdArgs = toolConfig.defaultArgs;
        defaultCmdOptions = toolConfig.defaultOptions;
        autoRun = true;
      }
    }
  }

  // Generate config
  const historyDir = path.join(dataDir, 'history');
  const outputDir = path.join(dataDir, 'output');

  const config = {
    promptDirs: [promptDir],
    historyDir,
    annotationDir: historyDir,
    ...(defaultCmd && { defaultCmd }),
    ...(defaultCmdArgs && defaultCmdArgs.length > 0 && { defaultCmdArgs }),
    ...(defaultCmdOptions && Object.keys(defaultCmdOptions).length > 0 && { defaultCmdOptions }),
    autoReview: DEFAULT_CONFIG.autoReview,
    autoRun,
    version: '8.0.0',
    outputCapture: {
      enabled: enableOutputCapture,
      directory: outputDir,
      maxSizeMB: 50,
      retentionDays: 30
    },
    libraries: [],
  };

  // Ensure config directory exists and save config
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });

  // Create data directories
  await fs.ensureDir(historyDir);
  if (enableOutputCapture) {
    await fs.ensureDir(outputDir);
  }

  logger.log(chalk.green('\u2713 Configuration created successfully!'));
  logger.log(chalk.gray(`  Config: ${configPath}`));
  logger.log(chalk.gray(`  Prompts: ${promptDir}`));
}
