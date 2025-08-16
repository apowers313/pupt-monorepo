import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';
import { z } from 'zod';
import { Prompt, VariableDefinition } from '../types/prompt.js';
import { normalizeLineEndings } from '../utils/platform.js';
import { errors } from '../utils/errors.js';

// Zod schemas for validation
const VariableSchema = z.object({
  name: z.string(),
  type: z.enum(['input', 'select', 'multiselect', 'confirm', 'file', 'review-file']),
  message: z.string().optional(),
  default: z.any().optional(),
  choices: z.array(z.string()).optional(),
  validate: z.string().optional(),
  basePath: z.string().optional(),
  filter: z.string().optional(),
  autoReview: z.boolean().optional()
});

const PromptSchema = z.object({
  path: z.string(),
  relativePath: z.string(),
  filename: z.string(),
  title: z.string(),
  labels: z.array(z.string()),
  content: z.string(),
  frontmatter: z.record(z.string(), z.any()),
  variables: z.array(VariableSchema).optional()
});

export interface PromptServiceOptions {
  cacheTimeout?: number;
}

export interface PromptValidationResult {
  success: boolean;
  errors?: string[];
}

export class PromptService {
  private promptDirs: string[];
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private searchIndex: MiniSearch<Prompt & { id: number }> | null = null;
  private options: Required<PromptServiceOptions>;

  constructor(promptDirs: string[], options: PromptServiceOptions = {}) {
    this.promptDirs = promptDirs;
    this.options = {
      cacheTimeout: options.cacheTimeout ?? 5000
    };
  }

  async discoverPrompts(): Promise<Prompt[]> {
    const cacheKey = 'discover:all';
    const cached = this.getFromCache<Prompt[]>(cacheKey);
    if (cached) return cached;

    const allPrompts: Prompt[] = [];

    for (const dir of this.promptDirs) {
      if (await fs.pathExists(dir)) {
        const prompts = await this.discoverPromptsInDir(dir);
        allPrompts.push(...prompts);
      }
    }

    this.setCache(cacheKey, allPrompts);
    
    // Build search index
    await this.buildSearchIndex(allPrompts);
    
    return allPrompts;
  }

  async loadPrompt(promptPath: string): Promise<Prompt> {
    const cacheKey = `load:${promptPath}`;
    const cached = this.getFromCache<Prompt>(cacheKey);
    if (cached) return cached;

    try {
      const content = await fs.readFile(promptPath, 'utf-8');
      const normalized = normalizeLineEndings(content);
      const { data: frontmatter, content: markdownContent } = matter(normalized);

      const filename = path.basename(promptPath);
      
      // Find base directory
      let baseDir = path.dirname(promptPath);
      for (const dir of this.promptDirs) {
        if (promptPath.startsWith(dir)) {
          baseDir = dir;
          break;
        }
      }
      
      const relativePath = path.relative(baseDir, promptPath);

      // Extract title from frontmatter or filename
      const title = frontmatter.title || path.basename(filename, '.md');

      // Extract labels
      const labels = Array.isArray(frontmatter.labels) ? frontmatter.labels : [];

      // Extract variables
      const variables = this.parseVariables(frontmatter.variables);

      const prompt: Prompt = {
        path: promptPath,
        relativePath,
        filename,
        title,
        labels,
        content: markdownContent.trim(),
        frontmatter,
        variables,
      };

      this.setCache(cacheKey, prompt);
      return prompt;
    } catch {
      throw errors.fileNotFound(promptPath);
    }
  }

  async validatePrompt(prompt: Prompt): Promise<PromptValidationResult> {
    try {
      // Validate basic structure
      PromptSchema.parse(prompt);

      // Additional validation
      const errors: string[] = [];

      // Validate variables
      if (prompt.variables) {
        for (const variable of prompt.variables) {
          if (variable.type === 'select' || variable.type === 'multiselect') {
            if (!variable.choices || variable.choices.length === 0) {
              errors.push(`Variable '${variable.name}' of type '${variable.type}' must have choices`);
            }
          }
          
          if (!['input', 'select', 'multiselect', 'confirm', 'file', 'review-file'].includes(variable.type)) {
            errors.push(`Invalid variable type: ${variable.type}`);
          }
        }
      }

      // Check for duplicate variable names
      if (prompt.variables) {
        const names = prompt.variables.map(v => v.name);
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        if (duplicates.length > 0) {
          errors.push(`Duplicate variable names: ${duplicates.join(', ')}`);
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async searchPrompts(query: string): Promise<Prompt[]> {
    if (!this.searchIndex) {
      await this.discoverPrompts(); // This will build the index
    }

    if (!this.searchIndex) {
      return [];
    }

    const results = this.searchIndex.search(query, {
      fuzzy: 0.2,
      prefix: true,
      boost: { title: 2, labels: 1.5 },
      fields: ['title', 'labels', 'content']
    });

    return results.map(result => {
      const { id: _, ...prompt } = this.searchIndex!.getStoredFields(result.id) as unknown as Prompt & { id: number };
      return prompt;
    });
  }

  async getPromptsByLabel(label: string): Promise<Prompt[]> {
    const allPrompts = await this.discoverPrompts();
    return allPrompts.filter(prompt => prompt.labels.includes(label));
  }

  private async discoverPromptsInDir(dir: string, baseDir?: string): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    const base = baseDir || dir;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subPrompts = await this.discoverPromptsInDir(fullPath, base);
          prompts.push(...subPrompts);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const prompt = await this.loadPrompt(fullPath);
            prompts.push(prompt);
          } catch (error) {
            // Log error but continue discovering other prompts
            console.error(`Error loading prompt ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the entire discovery
      console.error(`Error reading directory ${dir}:`, error);
    }

    return prompts;
  }

  private parseVariables(variables: unknown): VariableDefinition[] | undefined {
    if (!Array.isArray(variables)) {
      return undefined;
    }

    return variables.map(v => {
      const variable = v as Record<string, unknown>;
      const parsed: VariableDefinition = {
        name: variable.name as string,
        type: (variable.type as VariableDefinition['type']) || 'input',
      };

      // Add optional properties only if they exist
      if (variable.message !== undefined) parsed.message = variable.message as string;
      if (variable.default !== undefined) parsed.default = variable.default;
      if (variable.choices !== undefined) parsed.choices = variable.choices as string[];
      if (variable.validate !== undefined) parsed.validate = variable.validate as string;
      if (variable.basePath !== undefined) parsed.basePath = variable.basePath as string;
      if (variable.filter !== undefined) parsed.filter = variable.filter as string;
      if (variable.autoReview !== undefined) parsed.autoReview = variable.autoReview as boolean;

      return parsed;
    });
  }

  private async buildSearchIndex(prompts: Prompt[]): Promise<void> {
    this.searchIndex = new MiniSearch({
      fields: ['title', 'labels', 'content'],
      storeFields: ['path', 'relativePath', 'filename', 'title', 'labels', 'content', 'frontmatter', 'variables'],
      searchOptions: {
        boost: { title: 2, labels: 1.5 },
        fuzzy: 0.2
      },
      processTerm: (term) => term.toLowerCase()
    });

    // Add prompts with numeric IDs
    const promptsWithIds = prompts.map((prompt, index) => ({
      ...prompt,
      id: index
    }));

    this.searchIndex.addAll(promptsWithIds);
  }

  private getFromCache<T = unknown>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.options.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
    this.searchIndex = null;
  }

  addPromptDirectory(dir: string): void {
    if (!this.promptDirs.includes(dir)) {
      this.promptDirs.push(dir);
      this.clearCache(); // Clear cache to force re-discovery
    }
  }

  removePromptDirectory(dir: string): void {
    const index = this.promptDirs.indexOf(dir);
    if (index !== -1) {
      this.promptDirs.splice(index, 1);
      this.clearCache(); // Clear cache to force re-discovery
    }
  }

  getPromptDirectories(): string[] {
    return [...this.promptDirs];
  }
}