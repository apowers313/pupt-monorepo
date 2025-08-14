import { input, select, confirm } from '@inquirer/prompts';
import { ConfigManager } from '../config/config-manager.js';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { errors, PromptToolError } from '../utils/errors.js';
import ora from 'ora';

export async function addCommand(): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();
  
  if (!config.promptDirs || config.promptDirs.length === 0) {
    throw new PromptToolError(
      'No prompt directories configured',
      'NO_PROMPT_DIRS',
      [{ text: 'Initialize configuration', command: 'pt init' }],
      '⚙️'
    );
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
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  
  const content = `---
title: ${title}
author: ${author}
creationDate: ${dateStr}
labels: [${labels.join(', ')}]
---

{{!-- Add your prompt content here --}}
`;

  // Write file
  const writeSpinner = ora('Creating prompt file...').start();
  try {
    await fs.writeFile(filepath, content);
    writeSpinner.succeed(chalk.green('Created prompt: ') + filepath);
  } catch (error) {
    writeSpinner.fail();
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw errors.permissionDenied(targetDir);
    }
    throw new PromptToolError(
      `Failed to create prompt: ${err.message}`,
      'CREATE_FAILED',
      [
        { text: 'Check directory exists', command: `ls -la "${targetDir}"` },
        { text: 'Create directory', command: `mkdir -p "${targetDir}"` }
      ],
      '❌'
    );
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
  const spinner = ora('Opening in editor...').start();
  
  // Check environment variables first
  const envEditor = process.env.VISUAL || process.env.EDITOR;
  
  if (envEditor) {
    try {
      execSync(`${envEditor} "${filepath}"`, { stdio: 'inherit' });
      spinner.succeed('Opened in editor');
      return;
    } catch {
      spinner.fail();
      // Fall through to try other editors
    }
  }
  
  // Try common editors
  const editors = ['code', 'vim', 'nano', 'emacs'];
  let editorPath: string | null = null;
  
  for (const editor of editors) {
    try {
      execSync(`which ${editor}`, { encoding: 'utf8' });
      editorPath = editor;
      break;
    } catch {
      // Editor not found, try next
    }
  }

  if (!editorPath) {
    spinner.fail();
    console.log(errors.noEditor().message);
    console.log(chalk.yellow('\n📝 Open the file manually:'), filepath);
    return;
  }

  // Open the file
  try {
    execSync(`${editorPath} "${filepath}"`, { stdio: 'inherit' });
    spinner.succeed('Opened in editor');
  } catch {
    spinner.fail();
    console.log(chalk.yellow('⚠️  Failed to open editor'));
    console.log(chalk.yellow('📝 Open the file manually:'), filepath);
  }
}