import type { Theme } from '@inquirer/core';
import { search } from '@inquirer/prompts';
import type { PartialDeep } from '@inquirer/type';
import { FileSearchEngine } from '@pupt/lib';

export interface FileSearchConfig {
  message: string;
  basePath?: string;
  filter?: string;
  default?: string;
  theme?: PartialDeep<Theme>;
}

export async function fileSearchPrompt(config: FileSearchConfig): Promise<string> {
  const searchEngine = await FileSearchEngine.create({ basePath: config.basePath || '.', filter: config.filter });
  
  return await search<string>({
    message: config.message,
    source: async (input: string | undefined, { signal }: { signal: AbortSignal }) => {
      // CRITICAL: This function is called on EVERY keystroke
      // ensuring real-time updates as the user types
      
      // If no input, show contents of current directory
      if (!input) {
        const currentDirFiles = await searchEngine.listDirectory(config.basePath || '.');
        return currentDirFiles.map(file => {
          const formatted = searchEngine.formatFileInfo(file);
          return {
            name: formatted.display,
            value: formatted.value,
            description: formatted.description,
          };
        });
      }
      
      // Always return results, even for partial input
      // Example: "des" should immediately return ["design/", "desktop.ini", etc.]
      const results = await searchEngine.search(input, signal);
      
      const choices = results.map(file => {
        const formatted = searchEngine.formatFileInfo(file);
        return {
          name: formatted.display,
          value: formatted.value,
          description: formatted.description,
        };
      });
      
      // Add option to use the manually typed path if it doesn't exist in results
      // Only add this option if the input looks like a valid path
      if (input && input.trim() !== '') {
        const normalizedInput = searchEngine.normalizePathInput(input);
        const absolutePath = searchEngine.resolveToAbsolutePath(normalizedInput);
        
        // Check if this exact path is already in the results
        const pathAlreadyInResults = choices.some(choice => choice.value === absolutePath);
        
        if (!pathAlreadyInResults) {
          // Add the manual input option at the end
          choices.push({
            name: `📝 Use typed path: ${input}`,
            value: absolutePath,
            description: 'Create or use non-existent file',
          });
        }
      }
      
      return choices;
    },
  });
}

