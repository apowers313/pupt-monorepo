import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { HistoryEntry } from '../types/history.js';
import { sanitizeObject } from '../utils/security.js';
import { DateFormats } from '../utils/date-formatter.js';

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
    // Don't save empty prompts
    if (!options.finalPrompt || !options.finalPrompt.trim()) {
      return '';
    }

    try {
      await fs.ensureDir(this.historyDir);

      const now = new Date();
      const timestamp = DateFormats.UTC_DATETIME(now);
      
      // Generate filename using local time: YYYYMMDD-HHMMSS-<random>.json
      const dateStr = DateFormats.YYYYMMDD(now);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const timeStr = `${hours}${minutes}${seconds}`;
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
    const obj = Object.fromEntries(variables);
    return sanitizeObject(obj);
  }
}