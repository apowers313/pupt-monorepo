import fs from 'node:fs';
import path from 'node:path';

import { findProjectRoot } from './project-root.js';

const LOCAL_PROMPTS_DIR = '.prompts';

/**
 * Find the local .prompts/ directory at the project root, if it exists.
 */
export function findLocalPromptsDir(startDir?: string): Promise<string | null> {
  const root = findProjectRoot(startDir ?? process.cwd());
  if (!root) {return Promise.resolve(null);}

  const localDir = path.join(root, LOCAL_PROMPTS_DIR);
  try {
    const stat = fs.statSync(localDir);
    if (stat.isDirectory()) {
      return Promise.resolve(localDir);
    }
  } catch {
    // .prompts/ doesn't exist
  }
  return Promise.resolve(null);
}
