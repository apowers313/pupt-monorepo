import path from 'node:path';

import { confirm,input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';

import { ConfigManager } from '../config/config-manager.js';
import { editorLauncher } from '../utils/editor.js';
import { errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/project-root.js';
import { findLocalPromptsDir } from '../utils/prompt-dir-resolver.js';

export interface AddCommandOptions {
  global?: boolean;
}

export async function addCommand(options: AddCommandOptions = {}): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();

  // Determine target directory based on --global flag and local .prompts/
  let targetDir: string;

  if (options.global) {
    // --global: use global config promptDirs
    if (!config.promptDirs || config.promptDirs.length === 0) {
      throw errors.noPromptsFound([]);
    }
    targetDir = config.promptDirs[0];
    if (config.promptDirs.length > 1) {
      targetDir = await select({
        message: 'Save to global directory:',
        choices: config.promptDirs.map(dir => ({ value: dir, name: dir }))
      });
    }
  } else {
    // Default: prefer local .prompts/ if it exists or can be created
    const localDir = await findLocalPromptsDir();
    if (localDir) {
      targetDir = localDir;
    } else {
      // Check if we're in a project root where we could create .prompts/
      const projectRoot = findProjectRoot(process.cwd());
      if (projectRoot) {
        const potentialLocal = path.join(projectRoot, '.prompts');
        // Fall back to global if available, but offer local as option
        if (config.promptDirs && config.promptDirs.length > 0) {
          const allDirs = [potentialLocal, ...config.promptDirs];
          targetDir = await select({
            message: 'Save to directory:',
            choices: allDirs.map(dir => ({
              value: dir,
              name: dir === potentialLocal ? `${dir} (local project)` : dir
            }))
          });
        } else {
          targetDir = potentialLocal;
        }
      } else if (config.promptDirs && config.promptDirs.length > 0) {
        // No project root; use global config dirs
        targetDir = config.promptDirs[0];
        if (config.promptDirs.length > 1) {
          targetDir = await select({
            message: 'Save to directory:',
            choices: config.promptDirs.map(dir => ({ value: dir, name: dir }))
          });
        }
      } else {
        throw errors.noPromptsFound([]);
      }
    }
  }

  // Ensure target directory exists
  await fs.ensureDir(targetDir);

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

  // Get tags
  const tagsInput = await input({
    message: 'Tags (comma-separated, optional):',
    default: ''
  });

  const tags = tagsInput
    .split(',')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const ext = '.prompt';

  // Generate filename
  const filename = await generateFilename(title, targetDir, ext);
  const filepath = path.join(targetDir, filename);

  // Escape JSX string values (double quotes)
  const escapedTitle = title.replace(/"/g, '\\"');
  const tagsJsx = tags.length > 0
    ? `tags={[${tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]}`
    : '';

  const content = `<Prompt name="${escapedTitle}" description="" ${tagsJsx}>
  <Task>
    {/* Add your prompt content here */}
  </Task>
</Prompt>
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

async function generateFilename(title: string, directory: string, ext: string = '.prompt'): Promise<string> {
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
  let filename = `${base}${ext}`;
  let counter = 1;

  // Check for existing files and increment if needed
  while (await fs.pathExists(path.join(directory, filename))) {
    filename = `${base}-${counter}${ext}`;
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