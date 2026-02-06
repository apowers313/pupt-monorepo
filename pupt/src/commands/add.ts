import { input, select, confirm } from '@inquirer/prompts';
import { ConfigManager } from '../config/config-manager.js';
import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { editorLauncher } from '../utils/editor.js';
import { errors } from '../utils/errors.js';
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

  // Get tags
  const tagsInput = await input({
    message: 'Tags (comma-separated, optional):',
    default: ''
  });
  
  const tags = tagsInput
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