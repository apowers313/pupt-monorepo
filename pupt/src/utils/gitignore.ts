import fs from 'fs-extra';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

/**
 * Check if current directory is a git repository
 */
export async function isGitRepository(git: SimpleGit = simpleGit()): Promise<boolean> {
  try {
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Add entry to .gitignore file
 */
export async function addToGitignore(entry: string): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  let gitignoreContent = '';
  let exists = false;
  
  try {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    exists = true;
  } catch {
    // File doesn't exist, will create it
    gitignoreContent = '';
  }

  // Check if entry already exists
  const lines = gitignoreContent.split('\n');
  const entryExists = lines.some(line => line.trim() === entry);
  
  if (entryExists) {
    return; // Entry already exists, nothing to do
  }

  // Check if Prompt Tool section exists
  const promptToolSectionIndex = lines.findIndex(line => line.trim() === '# Prompt Tool');
  
  if (promptToolSectionIndex !== -1) {
    // Add to existing Prompt Tool section
    // Find the end of the section (next comment or end of file)
    let insertIndex = promptToolSectionIndex + 1;
    while (insertIndex < lines.length && 
           lines[insertIndex].trim() !== '' && 
           !lines[insertIndex].trim().startsWith('#')) {
      insertIndex++;
    }
    
    // Insert the new entry
    lines.splice(insertIndex, 0, entry);
  } else {
    // Add new Prompt Tool section
    // Ensure there's a newline before the section if file has content
    if (exists && gitignoreContent.trim() !== '') {
      if (!gitignoreContent.endsWith('\n')) {
        lines.push(''); // Add empty line
      }
      lines.push(''); // Add separator line
    } else if (!exists || gitignoreContent === '') {
      // For new files, remove the initial empty line
      if (lines.length === 1 && lines[0] === '') {
        lines.pop();
      }
    }
    
    lines.push('# Prompt Tool');
    lines.push(entry);
  }

  // Write back to file
  const newContent = lines.join('\n');
  await fs.writeFile(gitignorePath, newContent.endsWith('\n') ? newContent : newContent + '\n', 'utf-8');
}