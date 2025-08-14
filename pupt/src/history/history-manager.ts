import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { HistoryEntry } from '../types/history.js';

interface HistorySaveOptions {
  templatePath: string;
  templateContent: string;
  variables: Map<string, unknown>;
  finalPrompt: string;
  title?: string;
}


export class HistoryManager {
  constructor(private historyDir: string) {}

  async savePrompt(options: HistorySaveOptions): Promise<string> {
    try {
      await fs.ensureDir(this.historyDir);

      const now = new Date();
      const timestamp = now.toISOString();
      
      // Generate filename: YYYYMMDD-HHMMSS-<random>.json
      const dateStr = timestamp.slice(0, 10).replace(/-/g, '');
      const timeStr = timestamp.slice(11, 19).replace(/:/g, '');
      const random = crypto.randomBytes(4).toString('hex');
      const filename = `${dateStr}-${timeStr}-${random}.json`;

      // Create history entry
      const entry: Omit<HistoryEntry, 'filename'> = {
        timestamp,
        templatePath: options.templatePath,
        templateContent: options.templateContent,
        variables: this.maskSensitiveVariables(options.variables),
        finalPrompt: options.finalPrompt,
        title: options.title
      };

      // Save to history
      const filePath = path.join(this.historyDir, filename);
      await fs.writeJson(filePath, entry, { spaces: 2 });
      
      return filename;
    } catch (error) {
      throw new Error(`Failed to save prompt to history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listHistory(limit?: number): Promise<HistoryEntry[]> {
    try {
      await fs.ensureDir(this.historyDir);
      const files = await fs.readdir(this.historyDir);
      
      // Filter for JSON files with expected format
      const historyFiles = files.filter(f => 
        f.match(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/)
      );

      // Sort by date (newest first)
      historyFiles.sort((a, b) => b.localeCompare(a));

      // Apply limit if specified
      const filesToLoad = limit ? historyFiles.slice(0, limit) : historyFiles;

      // Load entries
      const entries: HistoryEntry[] = [];
      for (const filename of filesToLoad) {
        try {
          const filePath = path.join(this.historyDir, filename);
          const entry = await fs.readJson(filePath) as Omit<HistoryEntry, 'filename'>;
          entries.push({ ...entry, filename });
        } catch {
          // Skip invalid files silently in tests
          if (process.env.NODE_ENV !== 'test') {
            console.warn(`Skipping invalid history file: ${filename}`);
          }
        }
      }

      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getHistoryEntry(index: number): Promise<HistoryEntry | null> {
    try {
      // Get all history files sorted by date (newest first)
      const files = await fs.readdir(this.historyDir);
      const historyFiles = files
        .filter(f => f.match(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/))
        .sort((a, b) => b.localeCompare(a));

      // Check if index is valid (1-based)
      if (index < 1 || index > historyFiles.length) {
        return null;
      }

      // Load the entry (convert 1-based to 0-based index)
      const filename = historyFiles[index - 1];
      const filePath = path.join(this.historyDir, filename);
      const entry = await fs.readJson(filePath) as Omit<HistoryEntry, 'filename'>;
      
      return { ...entry, filename };
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`Failed to get history entry ${index}:`, error);
      }
      return null;
    }
  }


  private maskSensitiveVariables(variables: Map<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    const sensitivePatterns = [/apikey/i, /password/i, /secret/i, /token/i, /credential/i];

    for (const [key, value] of variables) {
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
      masked[key] = isSensitive ? '***' : value;
    }

    return masked;
  }
}