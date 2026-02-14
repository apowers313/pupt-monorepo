import * as path from 'node:path';
import fs from 'fs-extra';
import { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';
import { getDataDir } from '../config/global-paths.js';
import { GlobalPackageManager } from '../services/package-manager.js';

export async function uninstallCommand(name: string): Promise<void> {
  if (!name) {
    throw new Error('Please provide a library name to uninstall. Use "pt config" to see installed libraries.');
  }

  const config = await ConfigManager.load();
  const libraries = config.libraries ?? [];

  const libraryIndex = libraries.findIndex(lib => lib.name === name);
  if (libraryIndex === -1) {
    throw new Error(`Library "${name}" not found. Use "pt config" to see installed libraries.`);
  }

  const library = libraries[libraryIndex];
  const dataDir = getDataDir();

  if (library.type === 'npm') {
    // Uninstall npm package
    const packageManager = new GlobalPackageManager(dataDir);
    try {
      await packageManager.uninstall(library.name);
      logger.log(`Removed npm package: ${library.name}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Warning: Failed to uninstall npm package: ${errorMessage}`);
    }
  } else {
    // Remove git library directory
    const libraryPath = path.join(dataDir, 'libraries', library.name);
    if (await fs.pathExists(libraryPath)) {
      await fs.remove(libraryPath);
      logger.log(`Removed library directory: ${libraryPath}`);
    }
  }

  // Remove library entry from config
  libraries.splice(libraryIndex, 1);
  config.libraries = libraries;
  await ConfigManager.save(config);

  logger.log(`Successfully uninstalled library "${name}".`);
}
