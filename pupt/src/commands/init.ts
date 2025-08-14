import { input, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../types/config.js';

export async function initCommand(): Promise<void> {
  // Check for existing config
  const configPath = path.join(process.cwd(), '.ptrc.json');
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
    default: './prompts'
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

  // Create directories
  const dirsToCreate = [promptDir];
  if (historyDir) dirsToCreate.push(historyDir);
  if (annotationDir && annotationDir !== historyDir) dirsToCreate.push(annotationDir);

  for (const dir of dirsToCreate) {
    if (!dir) continue; // Skip undefined or empty directories
    const resolvedDir = dir.startsWith('~') 
      ? path.join(process.env.HOME || '', dir.slice(2))
      : path.resolve(dir);
    await fs.ensureDir(resolvedDir);
  }

  // Generate config
  const config = {
    promptDirs: [promptDir],
    ...(historyDir && { historyDir }),
    ...(annotationDir && { annotationDir }),
    ...DEFAULT_CONFIG
  };

  // Save config
  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(chalk.green('✓ Configuration created successfully!'));
}