import fs from 'fs-extra';
import { Config } from '../types/config.js';
import { DateFormats } from '../utils/date-formatter.js';

export interface ConfigMigration {
  version: string;
  migrate: (config: Record<string, unknown>) => Record<string, unknown>;
}

export const migrations: ConfigMigration[] = [
  {
    version: '3.0.0',
    migrate: (config) => {
      const migrated = { ...config };
      
      // Rename fields
      if ('codingTool' in config) {
        migrated.defaultCmd = config.codingTool;
        delete migrated.codingTool;
      }
      if ('codingToolArgs' in config) {
        migrated.defaultCmdArgs = config.codingToolArgs;
        delete migrated.codingToolArgs;
      }
      if ('codingToolOptions' in config) {
        migrated.defaultCmdOptions = config.codingToolOptions;
        delete migrated.codingToolOptions;
      }
      
      // Add new fields with defaults
      migrated.version = '3.0.0';
      migrated.autoReview = migrated.autoReview ?? true;
      migrated.autoRun = migrated.autoRun ?? false;
      migrated.gitPromptDir = migrated.gitPromptDir ?? '.git-prompts';
      migrated.handlebarsExtensions = migrated.handlebarsExtensions ?? [];
      
      // Set defaults for renamed fields if they don't exist
      migrated.defaultCmd = migrated.defaultCmd ?? 'claude';
      migrated.defaultCmdArgs = migrated.defaultCmdArgs ?? [];
      migrated.defaultCmdOptions = migrated.defaultCmdOptions ?? {
        'Continue with last context?': '--continue'
      };
      
      // Ensure required fields exist
      migrated.promptDirs = migrated.promptDirs ?? ['./prompts'];
      
      return migrated;
    }
  }
];

export const migrateConfig = Object.assign(
  function(config: Record<string, unknown>): Config {
    // Find and apply the latest migration
    const latestMigration = migrations[migrations.length - 1];
    return latestMigration.migrate(config) as unknown as Config;
  },
  {
    needsMigration(config: Record<string, unknown>): boolean {
      // Check if config has old field names
      if ('codingTool' in config || 'codingToolArgs' in config || 'codingToolOptions' in config) {
        return true;
      }
      
      // Check if version is missing or old
      if (!config.version || config.version !== '3.0.0') {
        return true;
      }
      
      return false;
    },
    
    async createBackup(configPath: string): Promise<void> {
      const backupPath = configPath + '.backup';
      
      // If backup already exists, create timestamped backup
      if (await fs.pathExists(backupPath)) {
        const now = new Date();
        const dateStr = DateFormats.YYYYMMDD(now);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${dateStr}${hours}${minutes}${seconds}`;
        const timestampedBackup = configPath + '.backup.' + timestamp;
        await fs.copy(configPath, timestampedBackup);
      } else {
        await fs.copy(configPath, backupPath);
      }
    }
  }
);