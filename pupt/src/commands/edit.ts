import { ConfigManager } from '../config/config-manager.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { editorLauncher } from '../utils/editor.js';
import { errors } from '../utils/errors.js';

export async function editCommand(): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();
  
  // Discover prompts
  const promptManager = new PromptManager(config.promptDirs);
  const prompts = await promptManager.discoverPrompts();
  
  if (prompts.length === 0) {
    throw errors.noPromptsFound(config.promptDirs);
  }
  
  // Interactive search
  const search = new InteractiveSearch();
  const selected = await search.selectPrompt(prompts);
  
  // Find an editor
  const editor = await editorLauncher.findEditor();
  if (!editor) {
    throw errors.noEditor();
  }
  
  // Open in editor
  try {
    await editorLauncher.openInEditor(editor, selected.path);
  } catch (error) {
    throw new Error(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`);
  }
}