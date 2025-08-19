import { input, select, confirm } from '@inquirer/prompts';
import { ConfigManager } from '../config/config-manager.js';
import fs from 'fs-extra';
import path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { editorLauncher } from '../utils/editor.js';
import { errors } from '../utils/errors.js';
import { DateFormats } from '../utils/date-formatter.js';
import { logger } from '../utils/logger.js';

export async function addCommand(): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();
  
  if (!config.promptDirs || config.promptDirs.length === 0) {
    throw errors.noPromptsFound([]);
  }

  // Get prompt title
  const title = await input({
    message: 'Prompt title:',
    validate: (value) => {
      if (value.trim().length === 0) {
        return 'Title is required\n\nExamples:\n  • "API Client Generator"\n  • "React Component Builder"\n  • "Database Schema Designer"';
      }
      return true;
    }
  });

  // Get labels
  const labelsInput = await input({
    message: 'Labels (comma-separated, optional):',
    default: ''
  });
  
  const labels = labelsInput
    .split(',')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Select directory if multiple
  let targetDir = config.promptDirs[0];
  if (config.promptDirs.length > 1) {
    targetDir = await select({
      message: 'Save to directory:',
      choices: config.promptDirs.map(dir => ({ value: dir, name: dir }))
    });
  }

  // Get author info from git
  const author = getGitAuthor();
  
  // Generate filename
  const filename = await generateFilename(title, targetDir);
  const filepath = path.join(targetDir, filename);

  // Create prompt content
  const date = new Date();
  const dateStr = DateFormats.YYYYMMDD(date);
  
  const content = `---
title: ${title}
author: ${author}
creationDate: ${dateStr}
labels: [${labels.join(', ')}]
---

{{!-- Add your prompt content here --}}
`;

  // Write file
  try {
    await fs.writeFile(filepath, content);
    logger.log(chalk.green('✅ Created prompt: ') + filepath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw errors.permissionDenied(targetDir);
    }
    throw errors.fileNotFound(targetDir);
  }

  // Ask to open in editor
  const shouldOpen = await confirm({
    message: 'Open in editor now?',
    default: true
  });

  if (shouldOpen) {
    await openInEditor(filepath);
  }
}

function getGitAuthor(): string {
  try {
    let name = '';
    let email = '';
    
    try {
      name = execSync('git config user.name', { encoding: 'utf8' }).trim();
    } catch {
      // name not configured
    }
    
    try {
      email = execSync('git config user.email', { encoding: 'utf8' }).trim();
    } catch {
      // email not configured
    }
    
    if (name && email) {
      return `${name} <${email}>`;
    } else if (name) {
      return name;
    } else {
      return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}

async function generateFilename(title: string, directory: string): Promise<string> {
  // Convert to kebab-case and remove special characters
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, ' ') // Replace special chars with spaces
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Start with base filename
  let filename = `${base}.md`;
  let counter = 1;

  // Check for existing files and increment if needed
  while (await fs.pathExists(path.join(directory, filename))) {
    filename = `${base}-${counter}.md`;
    counter++;
  }

  return filename;
}

async function openInEditor(filepath: string): Promise<void> {
  const editor = await editorLauncher.findEditor();
  
  if (!editor) {
    logger.log(errors.noEditor().message);
    logger.log(chalk.yellow('\n📝 Open the file manually:'), filepath);
    return;
  }

  // Open the file
  try {
    await editorLauncher.openInEditor(editor, filepath);
  } catch {
    logger.log(chalk.yellow('⚠️  Failed to open editor'));
    logger.log(chalk.yellow('📝 Open the file manually:'), filepath);
  }
}