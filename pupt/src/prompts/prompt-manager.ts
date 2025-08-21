import fs from 'fs-extra';
import path from 'node:path';
import matter from 'gray-matter';
import { Prompt, VariableDefinition } from '../types/prompt.js';
import { normalizeLineEndings } from '../utils/platform.js';

export class PromptManager {
  constructor(private promptDirs: string[]) {}

  async discoverPrompts(): Promise<Prompt[]> {
    const allPrompts: Prompt[] = [];

    for (const dir of this.promptDirs) {
      if (await fs.pathExists(dir)) {
        const prompts = await this.discoverPromptsInDir(dir);
        allPrompts.push(...prompts);
      }
    }

    return allPrompts;
  }

  private async discoverPromptsInDir(dir: string, baseDir?: string): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    const base = baseDir || dir;

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subPrompts = await this.discoverPromptsInDir(fullPath, base);
        prompts.push(...subPrompts);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const prompt = await this.loadPrompt(fullPath, base);
        prompts.push(prompt);
      }
    }

    return prompts;
  }

  private async loadPrompt(filePath: string, baseDir: string): Promise<Prompt> {
    const content = await fs.readFile(filePath, 'utf-8');
    const normalized = normalizeLineEndings(content);
    const { data: frontmatter, content: markdownContent } = matter(normalized);

    const filename = path.basename(filePath);
    const relativePath = path.relative(baseDir, filePath);

    // Extract title from frontmatter or filename
    const title = frontmatter.title || path.basename(filename, '.md');

    // Extract labels
    const labels = Array.isArray(frontmatter.labels) ? frontmatter.labels : [];

    // Extract variables
    const variables = this.parseVariables(frontmatter.variables);

    // Extract summary
    const summary = typeof frontmatter.summary === 'string' ? frontmatter.summary : undefined;

    return {
      path: filePath,
      relativePath,
      filename,
      title,
      labels,
      content: markdownContent.trim(),
      frontmatter,
      variables,
      summary,
    };
  }

  private parseVariables(variables: unknown): VariableDefinition[] | undefined {
    if (!Array.isArray(variables)) {
      return undefined;
    }

    return variables.map(v => {
      const variable = v as Record<string, unknown>;
      return {
        name: variable.name as string,
        type: (variable.type as VariableDefinition['type']) || 'input',
        message: variable.message as string | undefined,
        default: variable.default,
        choices: variable.choices as string[] | undefined,
        validate: variable.validate as string | undefined,
        basePath: variable.basePath as string | undefined,
        filter: variable.filter as string | undefined,
        autoReview: variable.autoReview as boolean | undefined,
      };
    });
  }

  async findPrompt(name: string): Promise<Prompt | null> {
    const prompts = await this.discoverPrompts();
    // Match by filename without extension or by title
    const nameWithoutExt = name.replace(/\.(md|markdown)$/i, '');
    return prompts.find(p => 
      p.filename.replace(/\.(md|markdown)$/i, '') === nameWithoutExt ||
      p.title === name
    ) || null;
  }

  async loadPromptByPath(promptPath: string): Promise<Prompt> {
    // Find which prompt directory this path belongs to
    for (const dir of this.promptDirs) {
      if (promptPath.startsWith(dir)) {
        return this.loadPrompt(promptPath, dir);
      }
    }

    // If not in any prompt directory, use parent directory as base
    const baseDir = path.dirname(promptPath);
    return this.loadPrompt(promptPath, baseDir);
  }
}
