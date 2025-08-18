import fileSearchPrompt, { type FileSearchConfig } from './file-search-prompt.js';

export async function reviewFilePrompt(config: FileSearchConfig): Promise<string> {
  // For now, reviewFile behaves exactly like file input
  // The review will happen after the run command completes
  const selectedFile = await fileSearchPrompt(config);
  
  // Return the selected file path
  return selectedFile;
}

export default reviewFilePrompt;