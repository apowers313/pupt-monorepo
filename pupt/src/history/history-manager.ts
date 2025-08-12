import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import matter from 'gray-matter';
import { getUsername } from '../utils/platform.js';

interface HistorySaveOptions {
  templatePath: string;
  templateContent: string;
  variables: Map<string, unknown>;
  finalPrompt: string;
}

interface HistoryEntry {
  filename: string;
  metadata: Record<string, unknown>;
  content: string;
}

export class HistoryManager {
  constructor(private historyDir: string) {}

  async savePrompt(options: HistorySaveOptions): Promise<void> {
    try {
      await fs.ensureDir(this.historyDir);

      // Generate metadata
      const metadata = {
        template: {
          path: options.templatePath,
          hash: this.hashContent(options.templateContent),
        },
        execution: {
          date: new Date().toISOString().split('T')[0],
          user: getUsername(),
          cwd: process.cwd(),
        },
        variables: this.maskSensitiveVariables(options.variables),
        system: {
          platform: process.platform,
          ptVersion: '0.1.0', // TODO: Get from package.json
          nodeVersion: process.version,
        },
      };

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const templateName = path.basename(options.templatePath, '.md');
      const shortHash = metadata.template.hash.substring(0, 6);
      const filename = `${timestamp}_${templateName}_${shortHash}.md`;

      // Create history content
      const historyContent = matter.stringify(options.finalPrompt, metadata);

      // Save to history
      const filePath = path.join(this.historyDir, filename);
      await fs.writeFile(filePath, historyContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save prompt to history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listHistory(limit: number = 50): Promise<HistoryEntry[]> {
    try {
      const files = await fs.readdir(this.historyDir);
      
      // Filter for markdown files with expected format
      const historyFiles = files.filter(f => 
        f.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_.*\.md$/)
      );

      // Sort by date (newest first)
      historyFiles.sort((a, b) => b.localeCompare(a));

      // Limit results
      const limitedFiles = historyFiles.slice(0, limit);

      // Load entries
      const entries: HistoryEntry[] = [];
      for (const filename of limitedFiles) {
        const entry = await this.getEntry(filename);
        if (entry) {
          entries.push(entry);
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

  async getEntry(filename: string): Promise<HistoryEntry> {
    const filePath = path.join(this.historyDir, filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      filename,
      metadata: data,
      content: content.trim(),
    };
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
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