import chalk from 'chalk';
import { ModuleCache } from '../services/module-cache.js';
import { getCacheDir } from '../config/global-paths.js';
import { logger } from '../utils/logger.js';

export interface CacheCommandOptions {
  clear?: boolean;
  url?: string;
}

/**
 * Cache command - manage the module cache for URL/GitHub imports.
 */
export async function cacheCommand(options: CacheCommandOptions): Promise<void> {
  const cacheDir = getCacheDir();
  const cache = new ModuleCache(cacheDir);

  if (options.clear) {
    if (options.url) {
      await cache.clear(options.url);
      logger.log(chalk.green(`Cleared cache for: ${options.url}`));
    } else {
      await cache.clear();
      logger.log(chalk.green('Cleared all cached modules'));
    }
    return;
  }

  // Default: show cache statistics
  const stats = await cache.getStats();
  logger.log(chalk.bold('\nModule Cache'));
  logger.log(chalk.dim('\u2500'.repeat(40)));
  logger.log(`Cache directory: ${chalk.gray(cacheDir)}`);
  logger.log(`Cached entries: ${stats.entryCount}`);
  logger.log(`Total size: ${stats.totalSizeMB.toFixed(2)} MB`);
  logger.log('');
}
