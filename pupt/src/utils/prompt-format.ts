/**
 * Prompt format types supported by pupt.
 *
 * - `jsx`: Build-time JSX, imported as ES modules (.tsx/.jsx files)
 * - `jsx-runtime`: Runtime-parsed JSX via createPromptFromSource (.prompt files)
 */
export type PromptFormat = 'jsx' | 'jsx-runtime';

/**
 * File extensions recognized as pupt-lib JSX prompt formats.
 */
export const PUPT_LIB_EXTENSIONS = ['.tsx', '.jsx', '.prompt'];

/**
 * All file extensions recognized as prompt files.
 */
export const ALL_PROMPT_EXTENSIONS = [...PUPT_LIB_EXTENSIONS];

/**
 * Detect the prompt format based on file extension.
 *
 * @param filePath - Path or filename to check
 * @returns The detected prompt format
 */
export function detectPromptFormat(filePath: string): PromptFormat {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    return 'jsx';
  }
  return 'jsx-runtime';
}

/**
 * Check if a file is a pupt-lib prompt format.
 */
export function isPuptLibFormat(filePath: string): boolean {
  const format = detectPromptFormat(filePath);
  return format === 'jsx' || format === 'jsx-runtime';
}
