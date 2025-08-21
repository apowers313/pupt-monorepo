import fs from 'fs-extra';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { HistoryEntry, EnhancedHistoryEntry } from '../types/history.js';
import { AnnotationMetadata } from '../types/annotations.js';
import { sanitizeObject } from '../utils/security.js';
import { DateFormats } from '../utils/date-formatter.js';
import { logger } from '../utils/logger.js';

interface HistorySaveOptions {
  templatePath: string;
  templateContent: string;
  variables: Map<string, unknown>;
  finalPrompt: string;
  title?: string;
  summary?: string;
  timestamp?: Date;
  // Output capture metadata (optional for backward compatibility)
  outputFile?: string;
  outputSize?: number;
  executionTime?: number;
  exitCode?: number | null;
  // Optional filename components for synchronized naming
  filenameComponents?: {
    dateStr: string;
    timeStr: string;
    randomSuffix: string;
  };
}


export class HistoryManager {
  constructor(
    private historyDir: string,
    private annotationDir?: string
  ) {}

  async savePrompt(options: HistorySaveOptions): Promise<string> {
    // Don't save empty prompts
    if (!options.finalPrompt || !options.finalPrompt.trim()) {
      return '';
    }

    try {
      await fs.ensureDir(this.historyDir);

      const now = options.timestamp || new Date();
      const timestamp = DateFormats.UTC_DATETIME(now);
      
      // Use provided filename components or generate new ones
      let dateStr: string;
      let timeStr: string;
      let randomSuffix: string;
      
      if (options.filenameComponents) {
        // Use provided components for synchronized naming
        ({ dateStr, timeStr, randomSuffix } = options.filenameComponents);
      } else {
        // Generate filename using local time: YYYYMMDD-HHMMSS-<random>.json
        dateStr = DateFormats.YYYYMMDD(now);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        timeStr = `${hours}${minutes}${seconds}`;
        randomSuffix = crypto.randomBytes(4).toString('hex');
      }
      
      const filename = `${dateStr}-${timeStr}-${randomSuffix}.json`;

      // Create history entry
      const entry: Omit<HistoryEntry, 'filename'> & { execution?: Record<string, unknown> } = {
        timestamp,
        templatePath: options.templatePath,
        templateContent: options.templateContent,
        variables: this.maskSensitiveVariables(options.variables),
        finalPrompt: options.finalPrompt,
        title: options.title,
        summary: options.summary
      };
      
      // Add execution metadata if provided (for output capture)
      if (options.outputFile || options.executionTime || options.exitCode !== undefined) {
        entry.execution = {
          ...(options.outputFile && { output_file: path.relative(this.historyDir, options.outputFile) }),
          ...(options.outputSize !== undefined && { output_size: options.outputSize }),
          ...(options.executionTime !== undefined && { duration_ms: options.executionTime }),
          ...(options.exitCode !== undefined && { exit_code: options.exitCode })
        };
      }

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

      // Sort by date (oldest first)
      historyFiles.sort();

      // Apply limit if specified (get most recent entries)
      const filesToLoad = limit ? historyFiles.slice(-limit) : historyFiles;

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
            logger.warn(`Skipping invalid history file: ${filename}`);
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

  async getTotalCount(): Promise<number> {
    try {
      await fs.ensureDir(this.historyDir);
      const files = await fs.readdir(this.historyDir);
      
      // Count JSON files with expected format
      const historyFiles = files.filter(f => 
        f.match(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/)
      );
      
      return historyFiles.length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  async getHistoryEntry(index: number): Promise<HistoryEntry | null> {
    try {
      // Get all history files sorted by date (oldest first)
      const files = await fs.readdir(this.historyDir);
      const historyFiles = files
        .filter(f => f.match(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/))
        .sort();

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
        logger.error(`Failed to get history entry ${index}: ${error}`);
      }
      return null;
    }
  }


  private maskSensitiveVariables(variables: Map<string, unknown>): Record<string, unknown> {
    const obj = Object.fromEntries(variables);
    return sanitizeObject(obj);
  }

  async saveAnnotation(
    historyEntry: HistoryEntry | EnhancedHistoryEntry,
    metadata: AnnotationMetadata
  ): Promise<void> {
    if (!this.annotationDir) {
      logger.warn('Annotation directory not configured, skipping annotation save');
      return;
    }

    await fs.ensureDir(this.annotationDir);

    // Generate annotation content
    const content = `---
${yaml.dump(metadata)}---

## Notes

${metadata.auto_detected ? 'Auto-generated annotation' : ''}
`;

    // Create filename based on history entry
    const historyBasename = path.basename(
      historyEntry.filename || `${historyEntry.timestamp}.json`,
      '.json'
    );
    const filename = `${historyBasename}-annotation-${uuidv4()}.md`;
    const filepath = path.join(this.annotationDir, filename);

    try {
      await fs.writeFile(filepath, content);
      logger.debug(`Auto-annotation saved to ${filepath}`);
    } catch (error) {
      logger.error(`Failed to save annotation: ${error}`);
      throw error;
    }
  }
}