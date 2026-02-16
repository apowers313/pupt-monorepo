import chalk from 'chalk';
import fs from 'fs-extra';

import { ConfigManager } from '../config/config-manager.js';
import { getCacheDir,getConfigDir, getDataDir } from '../config/global-paths.js';
import { logger } from '../utils/logger.js';

export interface ConfigCommandOptions {
  show?: boolean;
}

/**
 * Display the current configuration with resolved paths
 */
async function showConfig(): Promise<void> {
  const result = await ConfigManager.loadWithPath();
  const {config} = result;

  logger.log(chalk.bold('\nCurrent Configuration'));
  logger.log(chalk.dim('\u2500'.repeat(50)));

  if (result.filepath) {
    logger.log(chalk.gray(`Config file: ${result.filepath}`));
  } else {
    logger.log(chalk.yellow('No config file found (using defaults)'));
  }

  // Show global paths
  logger.log(chalk.gray(`Config dir: ${getConfigDir()}`));
  logger.log(chalk.gray(`Data dir: ${getDataDir()}`));
  logger.log(chalk.gray(`Cache dir: ${getCacheDir()}`));

  if (config.version) {
    logger.log(chalk.gray(`Version: ${config.version}`));
  }

  logger.log('');

  // Display prompt directories
  logger.log(chalk.bold('Prompt Directories:'));
  if (config.promptDirs && config.promptDirs.length > 0) {
    for (const dir of config.promptDirs) {
      const exists = await fs.pathExists(dir);
      const status = exists ? chalk.green('\u2713') : chalk.red('\u2717');
      logger.log(`  ${status} ${dir}`);
    }
  } else {
    logger.log(chalk.gray('  (none)'));
  }

  // Display installed libraries
  if (config.libraries && config.libraries.length > 0) {
    logger.log(`\n${chalk.bold('Installed Libraries:')}`);
    for (const lib of config.libraries) {
      const version = lib.version ? ` (${lib.version})` : '';
      logger.log(`  ${chalk.cyan(lib.name)} [${lib.type}]${version}`);
      for (const dir of lib.promptDirs) {
        logger.log(chalk.gray(`    prompts: ${dir}`));
      }
    }
  }

  // Display history directory
  if (config.historyDir) {
    const exists = await fs.pathExists(config.historyDir);
    const status = exists ? chalk.green('\u2713') : chalk.red('\u2717');
    logger.log(`\n${chalk.bold('History Directory:')} ${status} ${config.historyDir}`);
  }

  // Display annotation directory
  if (config.annotationDir) {
    const exists = await fs.pathExists(config.annotationDir);
    const status = exists ? chalk.green('\u2713') : chalk.red('\u2717');
    logger.log(`${chalk.bold('Annotation Directory:')} ${status} ${config.annotationDir}`);
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

  // Display output capture
  if (config.outputCapture) {
    logger.log(`${chalk.bold('Output Capture:')} ${config.outputCapture.enabled ? chalk.green('enabled') : chalk.gray('disabled')}`);
    if (config.outputCapture.directory) {
      logger.log(`${chalk.bold('Output Directory:')} ${config.outputCapture.directory}`);
    }
  }

  logger.log('');
}

/**
 * Config command - show configuration
 */
export async function configCommand(options: ConfigCommandOptions): Promise<void> {
  if (options.show) {
    await showConfig();
  } else {
    // Default: show config
    await showConfig();
  }
}
