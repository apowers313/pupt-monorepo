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

  // Ask about history
  const enableHistory = await confirm({
    message: 'Enable prompt history?',
    default: true
  });

  let historyDir: string | undefined;
  let annotationDir: string | undefined;
  let enableOutputCapture = false;
  let outputDir: string | undefined;

  if (enableHistory) {
    const defaultHistoryDir = path.join(dataDir, 'history');
    historyDir = await input({
      message: 'Where should history be stored?',
      default: defaultHistoryDir
    });

    const enableAnnotations = await confirm({
      message: 'Enable history annotations?',
      default: true
    });

    if (enableAnnotations) {
      annotationDir = await input({
        message: 'Where should annotations be stored?',
        default: historyDir
      });
    }

    // Ask about output capture
    enableOutputCapture = await confirm({
      message: 'Capture command output?',
      default: true
    });

    if (enableOutputCapture) {
      const defaultOutputDir = path.join(dataDir, 'output');
      outputDir = await input({
        message: 'Where should captured output be stored?',
        default: defaultOutputDir
      });
    }
  }

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
  const config: Record<string, unknown> = {
    promptDirs: [promptDir],
    ...(historyDir && { historyDir }),
    ...(annotationDir && { annotationDir }),
    ...(defaultCmd && { defaultCmd }),
    ...(defaultCmdArgs && defaultCmdArgs.length > 0 && { defaultCmdArgs }),
    ...(defaultCmdOptions && Object.keys(defaultCmdOptions).length > 0 && { defaultCmdOptions }),
    autoReview: DEFAULT_CONFIG.autoReview,
    autoRun,
    version: '8.0.0',
    libraries: [],
  };

  if (enableOutputCapture && outputDir) {
    config.outputCapture = {
      enabled: true,
      directory: outputDir,
      maxSizeMB: 50,
      retentionDays: 30
    };
  }

  // Ensure config directory exists and save config
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });

  // Create data directories
  if (historyDir) {
    await fs.ensureDir(historyDir);
  }
  if (annotationDir && annotationDir !== historyDir) {
    await fs.ensureDir(annotationDir);
  }
  if (enableOutputCapture && outputDir) {
    await fs.ensureDir(outputDir);
  }

  logger.log(chalk.green('\u2713 Configuration created successfully!'));
  logger.log(chalk.gray(`  Config: ${configPath}`));
  logger.log(chalk.gray(`  Prompts: ${promptDir}`));
}
