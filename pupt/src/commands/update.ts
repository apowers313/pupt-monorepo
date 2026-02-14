import * as path from 'node:path';
import simpleGit from 'simple-git';
import { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';
import { getDataDir } from '../config/global-paths.js';
import { loadConfigFromDirectory } from './install.js';
import { GlobalPackageManager } from '../services/package-manager.js';
import fs from 'fs-extra';
import type { GitLibraryEntry, NpmLibraryEntry } from '../types/config.js';

async function updateGitLibrary(library: GitLibraryEntry): Promise<void> {
  const dataDir = getDataDir();
  const libraryPath = path.join(dataDir, 'libraries', library.name);

  // Check if library directory exists
  if (!await fs.pathExists(libraryPath)) {
    throw new Error(`Library directory not found: ${libraryPath}. Try reinstalling with "pt install ${library.source}".`);
  }

  logger.log(`Updating library "${library.name}"...`);

  // Git pull to update
  const git = simpleGit(libraryPath);
  try {
    await git.pull();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update library "${library.name}": ${errorMessage}`);
  }

  // Get new commit hash
  let newVersion: string | undefined;
  try {
    const log = await git.log({ maxCount: 1 });
    newVersion = log.latest?.hash?.substring(0, 8);
  } catch {
    // Version is optional
  }

  // Re-read library config to detect promptDirs changes
  const newPromptDirs = await loadConfigFromDirectory(libraryPath);

  // Update the library entry
  if (newVersion) {
    library.version = newVersion;
  }
  if (newPromptDirs && newPromptDirs.length > 0) {
    library.promptDirs = newPromptDirs;
  }

  logger.log(`Successfully updated library "${library.name}"${newVersion ? ` to ${newVersion}` : ''}`);
}

async function updateNpmLibrary(library: NpmLibraryEntry): Promise<void> {
  const dataDir = getDataDir();
  const packageManager = new GlobalPackageManager(dataDir);

  logger.log(`Updating package "${library.name}"...`);

  await packageManager.update(library.name);

  // Get new version
  const newVersion = await packageManager.getInstalledVersion(library.name);
  if (newVersion) {
    library.version = newVersion;
  }

  // Re-detect promptDirs in case they changed
  const newPromptDirs = await packageManager.detectPromptDirs(library.name);
  if (newPromptDirs.length > 0) {
    library.promptDirs = newPromptDirs;
  }

  logger.log(`Successfully updated package "${library.name}"${newVersion ? ` to v${newVersion}` : ''}`);
}

export async function updateCommand(name?: string): Promise<void> {
  const config = await ConfigManager.load();
  const libraries = config.libraries ?? [];

  if (libraries.length === 0) {
    logger.log('No libraries installed. Use "pt install" to install a library.');
    return;
  }

  if (name) {
    // Update specific library
    const library = libraries.find(lib => lib.name === name);
    if (!library) {
      throw new Error(`Library "${name}" not found. Use "pt config" to see installed libraries.`);
    }

    if (library.type === 'git') {
      await updateGitLibrary(library);
    } else if (library.type === 'npm') {
      await updateNpmLibrary(library);
    }
  } else {
    // Update all libraries
    let successCount = 0;
    let errorCount = 0;

    for (const library of libraries) {
      try {
        if (library.type === 'git') {
          await updateGitLibrary(library);
        } else if (library.type === 'npm') {
          await updateNpmLibrary(library);
        }
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to update "${library.name}": ${errorMessage}`);
        errorCount++;
      }
    }

    if (successCount > 0) {
      logger.log(`\nUpdated ${successCount} library${successCount > 1 ? 'ies' : ''}.`);
    }
    if (errorCount > 0) {
      logger.log(`${errorCount} library${errorCount > 1 ? 'ies' : ''} failed to update.`);
    }
  }

  // Save updated config
  await ConfigManager.save(config);
}
