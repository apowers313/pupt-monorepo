import { ConfigManager } from '../config/config-manager.js';
import { PuptService } from '../services/pupt-service.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { editorLauncher } from '../utils/editor.js';
import { errors } from '../utils/errors.js';

export async function editCommand(): Promise<void> {
  // Load configuration
  const config = await ConfigManager.load();

  // Discover prompts
  const puptService = new PuptService({ promptDirs: config.promptDirs, libraries: config.libraries, environment: config.environment });
  await puptService.init();
  const prompts = puptService.getPromptsAsAdapted();
  
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