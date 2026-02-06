import chalk from 'chalk';
import path from 'node:path';
import fs from 'fs-extra';
import { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';

export interface ConfigCommandOptions {
  show?: boolean;
  fixPaths?: boolean;
}

/**
 * Display the current configuration with resolved paths
 */
async function showConfig(): Promise<void> {
  const result = await ConfigManager.loadWithPath();
  const config = result.config;

  logger.log(chalk.bold('\nCurrent Configuration'));
  logger.log(chalk.dim('─'.repeat(50)));

  if (result.filepath) {
    logger.log(chalk.gray(`Config file: ${result.filepath}`));
  } else {
    logger.log(chalk.yellow('No config file found (using defaults)'));
  }

  logger.log('');

  // Display prompt directories
  logger.log(chalk.bold('Prompt Directories:'));
  if (config.promptDirs && config.promptDirs.length > 0) {
    for (const dir of config.promptDirs) {
      const exists = await fs.pathExists(dir);
      const status = exists ? chalk.green('✓') : chalk.red('✗');
      logger.log(`  ${status} ${dir}`);
    }
  } else {
    logger.log(chalk.gray('  (none)'));
  }

  // Display history directory
  if (config.historyDir) {
    const exists = await fs.pathExists(config.historyDir);
    const status = exists ? chalk.green('✓') : chalk.red('✗');
    logger.log(`\n${chalk.bold('History Directory:')} ${status} ${config.historyDir}`);
  }

  // Display annotation directory
  if (config.annotationDir) {
    const exists = await fs.pathExists(config.annotationDir);
    const status = exists ? chalk.green('✓') : chalk.red('✗');
    logger.log(`${chalk.bold('Annotation Directory:')} ${status} ${config.annotationDir}`);
  }

  // Display git prompt directory
  if (config.gitPromptDir) {
    logger.log(`${chalk.bold('Git Prompt Directory:')} ${config.gitPromptDir}`);
  }

  // Display default command
  if (config.defaultCmd) {
    logger.log(`\n${chalk.bold('Default Command:')} ${config.defaultCmd}`);
    if (config.defaultCmdArgs && config.defaultCmdArgs.length > 0) {
      logger.log(`${chalk.bold('Default Args:')} ${config.defaultCmdArgs.join(' ')}`);
    }
  }

  // Display autoRun status
  logger.log(`\n${chalk.bold('Auto Run:')} ${config.autoRun ? chalk.green('enabled') : chalk.gray('disabled')}`);

  logger.log('');
}

/**
 * Fix paths in the configuration file to use portable format
 */
async function fixPaths(): Promise<void> {
  const result = await ConfigManager.loadWithPath();

  if (!result.filepath) {
    logger.error(chalk.red('No config file found. Run "pt init" first.'));
    process.exit(1);
  }

  const configDir = path.dirname(result.filepath);

  // Contract paths to portable format
  const portableConfig = ConfigManager.contractPaths(result.config, configDir);

  // Read the original file to preserve any fields we don't know about
  const originalContent = await fs.readJson(result.filepath);

  // Merge portable paths into original content
  const updatedConfig = {
    ...originalContent,
    promptDirs: portableConfig.promptDirs,
    ...(portableConfig.historyDir && { historyDir: portableConfig.historyDir }),
    ...(portableConfig.annotationDir && { annotationDir: portableConfig.annotationDir }),
    ...(portableConfig.gitPromptDir && { gitPromptDir: portableConfig.gitPromptDir }),
  };

  // Write back to file
  await fs.writeJson(result.filepath, updatedConfig, { spaces: 2 });

  logger.log(chalk.green('✓ Config paths updated to portable format'));
  logger.log(chalk.gray(`  Updated: ${result.filepath}`));

  // Show what was changed
  logger.log(chalk.bold('\nUpdated paths:'));

  if (updatedConfig.promptDirs) {
    logger.log(chalk.bold('  promptDirs:'));
    for (const dir of updatedConfig.promptDirs) {
      logger.log(`    - ${dir}`);
    }
  }

  if (updatedConfig.historyDir) {
    logger.log(`  ${chalk.bold('historyDir:')} ${updatedConfig.historyDir}`);
  }

  if (updatedConfig.annotationDir) {
    logger.log(`  ${chalk.bold('annotationDir:')} ${updatedConfig.annotationDir}`);
  }

  if (updatedConfig.gitPromptDir) {
    logger.log(`  ${chalk.bold('gitPromptDir:')} ${updatedConfig.gitPromptDir}`);
  }

  logger.log('');
}

/**
 * Config command - show or fix configuration
 */
export async function configCommand(options: ConfigCommandOptions): Promise<void> {
  if (options.fixPaths) {
    await fixPaths();
  } else if (options.show) {
    await showConfig();
  } else {
    // Default: show config
    await showConfig();
  }
}
