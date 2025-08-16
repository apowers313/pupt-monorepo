import fileSearchPrompt, { type FileSearchConfig } from './file-search-prompt.js';
import { ConfigManager } from '../../config/config-manager.js';
import { editorLauncher } from '../../utils/editor.js';
import { errors } from '../../utils/errors.js';

export async function reviewFilePrompt(config: FileSearchConfig): Promise<string> {
  // First, let the user select a file using the file search prompt
  const selectedFile = await fileSearchPrompt(config);
  
  // Load configuration to check autoReview setting
  const appConfig = await ConfigManager.load();
  
  // Default autoReview to true if not specified
  const autoReview = appConfig.autoReview ?? true;
  
  if (autoReview) {
    // Find an editor and open the file
    const editor = await editorLauncher.findEditor();
    if (!editor) {
      throw errors.noEditor();
    }
    
    try {
      await editorLauncher.openInEditor(editor, selectedFile);
    } catch (error) {
      throw new Error(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Return the selected file path regardless of whether we opened it in an editor
  return selectedFile;
}

export default reviewFilePrompt;