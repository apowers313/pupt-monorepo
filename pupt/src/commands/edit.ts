import { ConfigManager } from '../config/config-manager.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { spawn } from 'child_process';
import { errors } from '../utils/errors.js';
import ora from 'ora';

export async function editCommand(): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();
  
  // Discover prompts
  const spinner = ora('Discovering prompts...').start();
  const promptManager = new PromptManager(config.promptDirs);
  const prompts = await promptManager.discoverPrompts();
  spinner.stop();
  
  if (prompts.length === 0) {
    throw errors.noPromptsFound(config.promptDirs);
  }
  
  // Interactive search
  const search = new InteractiveSearch();
  const selected = await search.selectPrompt(prompts);
  
  // Find an editor
  const editor = await findEditor();
  if (!editor) {
    throw errors.noEditor();
  }
  
  // Open in editor
  const openSpinner = ora(`Opening in ${editor}...`).start();
  
  try {
    await openInEditor(editor, selected.path);
    openSpinner.succeed('Editor closed');
  } catch (error) {
    openSpinner.fail();
    throw new Error(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function findEditor(): Promise<string | null> {
  // Check environment variables
  if (process.env.VISUAL) {
    return process.env.VISUAL;
  }
  
  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }
  
  // Try common editors
  const editors = ['vim', 'nano', 'code'];
  
  // Add OS-specific editors
  if (process.platform === 'win32') {
    editors.push('notepad');
  } else if (process.platform === 'darwin') {
    editors.push('open -t'); // TextEdit on macOS
  }
  
  for (const editor of editors) {
    if (await isEditorAvailable(editor)) {
      return editor;
    }
  }
  
  return null;
}

async function isEditorAvailable(editor: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [command, ...args] = editor.split(' ');
    const child = spawn(command, [...args, '--version'], { 
      stdio: 'ignore',
      shell: false 
    });
    
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function openInEditor(editor: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const [command, ...args] = editor.split(' ');
    const child = spawn(command, [...args, filepath], { stdio: 'inherit' });
    
    child.on('error', (error) => {
      reject(error);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        resolve();
      }
    });
  });
}