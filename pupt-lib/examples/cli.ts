#!/usr/bin/env node
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { search } from '@inquirer/prompts';
import chalk from 'chalk';
import { createPrompt } from '../src/create-prompt';
import { render } from '../src/render';
import { createInputIterator } from '../src/services/input-iterator';
import { createSearchEngine, type SearchEngine } from '../src/services/search-engine';
import type { SearchablePrompt } from '../src/types';
import '../components';

const PROMPT_DIR = './tmp';
const PROMPT_EXTENSIONS = ['.prompt', '.tsx'];

interface PromptFile extends SearchablePrompt {
  path: string;
  relativePath: string;
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function findPromptFiles(dir: string): PromptFile[] {
  const files: PromptFile[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...findPromptFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (PROMPT_EXTENSIONS.includes(ext)) {
          const relativePath = path.relative(PROMPT_DIR, fullPath);
          const name = path.basename(entry.name, ext);

          // Try to extract metadata from file
          const { description, tags } = extractMetadata(fullPath);

          files.push({
            path: fullPath,
            relativePath,
            name,
            description,
            tags,
            library: 'local',
          });
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract metadata (description, tags) from a prompt file.
 * Looks for JSDoc-style comments or frontmatter.
 */
function extractMetadata(filePath: string): { description: string; tags: string[] } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let description = '';
    const tags: string[] = [];

    // Look for Prompt component with description/tags props
    const promptMatch = content.match(/<Prompt[^>]*\s+name=["']([^"']+)["'][^>]*>/);
    if (promptMatch) {
      const descMatch = content.match(/<Prompt[^>]*\s+description=["']([^"']+)["']/);
      if (descMatch) {
        description = descMatch[1];
      }

      const tagsMatch = content.match(/<Prompt[^>]*\s+tags=\{?\[([^\]]+)\]/);
      if (tagsMatch) {
        const tagStr = tagsMatch[1];
        const parsedTags = tagStr.match(/["']([^"']+)["']/g);
        if (parsedTags) {
          tags.push(...parsedTags.map(t => t.replace(/["']/g, '')));
        }
      }
    }

    // Look for JSDoc comments at the top of the file
    const jsdocMatch = content.match(/^\/\*\*\s*\n([\s\S]*?)\*\//);
    if (jsdocMatch && !description) {
      const jsdoc = jsdocMatch[1];
      const descLine = jsdoc.match(/\*\s*@description\s+(.+)/);
      if (descLine) {
        description = descLine[1].trim();
      } else {
        // First non-tag line is the description
        const lines = jsdoc.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim());
        const firstLine = lines.find(l => l && !l.startsWith('@'));
        if (firstLine) {
          description = firstLine;
        }
      }

      const tagLine = jsdoc.match(/\*\s*@tags?\s+(.+)/);
      if (tagLine) {
        tags.push(...tagLine[1].split(/[,\s]+/).filter(Boolean));
      }
    }

    return { description, tags };
  } catch {
    return { description: '', tags: [] };
  }
}

/**
 * Format a prompt for display in the search results.
 */
function formatPromptDisplay(promptFile: PromptFile): string {
  const tags = promptFile.tags.length > 0
    ? chalk.dim(` [${promptFile.tags.join(', ')}]`)
    : '';
  return `${chalk.bold(promptFile.name)}${tags}`;
}

async function selectPromptFile(): Promise<string | null> {
  const files = findPromptFiles(PROMPT_DIR);

  if (files.length === 0) {
    console.error(`No prompt files found in ${PROMPT_DIR}`);
    console.error(`Supported extensions: ${PROMPT_EXTENSIONS.join(', ')}`);
    return null;
  }

  // Create search engine and index prompts
  const engine: SearchEngine = createSearchEngine({
    fuzzy: true,
    prefix: true,
    combineWith: 'AND',
  });
  engine.index(files);

  console.error(chalk.cyan('\n  Type to search prompts, use arrow keys to navigate, Enter to select\n'));

  try {
    const selected = await search<PromptFile>({
      message: 'Search prompts:',
      source: async (input) => {
        let results: PromptFile[];

        if (!input || input.trim() === '') {
          // Show all prompts when no search term
          results = files;
        } else {
          // Use search engine for fuzzy matching
          const searchResults = engine.search(input);
          results = searchResults.map(r => {
            // Find the original PromptFile from search results
            const found = files.find(f => f.name === r.prompt.name);
            return found!;
          }).filter(Boolean);
        }

        return results.map(p => ({
          name: formatPromptDisplay(p),
          value: p,
          description: chalk.dim(p.relativePath) + (p.description ? ` - ${p.description}` : ''),
        }));
      },
    });

    return selected.path;
  } catch (error) {
    // User cancelled (Ctrl+C)
    if ((error as Error).name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

async function runPrompt(filePath: string, rl: readline.Interface): Promise<void> {
  console.error(`\nLoading: ${filePath}\n`);

  const element = await createPrompt(filePath);

  // Create input iterator to collect required inputs
  const iterator = createInputIterator(element);
  iterator.start();

  // If there are inputs to collect, prompt the user
  if (!iterator.isDone()) {
    while (!iterator.isDone()) {
      const req = iterator.current();
      if (!req) break;

      // Show the input requirement details from pupt-lib
      console.error('\n--- Input Required ---');
      console.error(`  Name: ${req.name}`);
      console.error(`  Type: ${req.type}`);
      console.error(`  Label: ${req.label}`);
      if (req.description && req.description !== req.label) {
        console.error(`  Description: ${req.description}`);
      }
      console.error(`  Required: ${req.required ? 'yes' : 'no'}`);
      if (req.default !== undefined) {
        console.error(`  Default: ${req.default}`);
      }
      if (req.options) {
        console.error(`  Options: ${req.options.map(o => o.label || o.value).join(', ')}`);
      }
      console.error('');

      let value: unknown;

      if (req.type === 'select' && req.options && req.options.length > 0) {
        // Show options for select type
        console.error('  Choose one:');
        req.options.forEach((opt, i) => {
          console.error(`    ${i + 1}. ${opt.label || opt.value}`);
        });
        const defaultHint = req.default !== undefined ? ` [${req.default}]` : '';
        const answer = await prompt(rl, `Enter number or value${defaultHint}: `);
        const trimmed = answer.trim();

        // Check if it's a number (1-based index)
        const idx = parseInt(trimmed, 10);
        if (!isNaN(idx) && idx >= 1 && idx <= req.options.length) {
          value = req.options[idx - 1].value;
        } else if (trimmed) {
          value = trimmed;
        } else {
          value = req.default || '';
        }
      } else if (req.type === 'boolean') {
        // Handle yes/no for confirm type
        const defaultHint = req.default !== undefined ? ` [${req.default ? 'Y' : 'N'}]` : '';
        const answer = await prompt(rl, `${req.label} (y/n)${defaultHint}: `);
        const trimmed = answer.trim().toLowerCase();

        if (trimmed === 'y' || trimmed === 'yes' || trimmed === 'true' || trimmed === '1') {
          value = true;
        } else if (trimmed === 'n' || trimmed === 'no' || trimmed === 'false' || trimmed === '0') {
          value = false;
        } else if (trimmed === '' && req.default !== undefined) {
          value = req.default;
        } else {
          value = false;
        }
      } else if (req.type === 'number') {
        // Handle number input
        const defaultHint = req.default !== undefined ? ` [${req.default}]` : '';
        const rangeHint = req.min !== undefined || req.max !== undefined
          ? ` (${req.min ?? ''}..${req.max ?? ''})`
          : '';
        const answer = await prompt(rl, `${req.label}${rangeHint}${defaultHint}: `);
        const trimmed = answer.trim();

        if (trimmed) {
          value = parseFloat(trimmed);
        } else if (req.default !== undefined) {
          value = req.default;
        } else {
          value = 0;
        }
      } else {
        // Default: string input
        const defaultHint = req.default !== undefined ? ` [${req.default}]` : '';
        const requiredHint = req.required ? '*' : '';
        const questionText = `${req.label}${requiredHint}${defaultHint}: `;
        const answer = await prompt(rl, questionText);
        value = answer.trim() || req.default || '';
      }

      const result = await iterator.submit(value);
      if (!result.valid) {
        console.error(`Invalid input: ${result.errors.map(e => e.message).join(', ')}`);
        continue; // Re-prompt for same input
      }

      iterator.advance();
    }
  }

  // Render with collected inputs
  const inputs = iterator.getValues();
  const result = render(element, { inputs });

  // Print the rendered text
  console.log(result.text);

  // Print post-execution actions if any
  if (result.postExecution.length > 0) {
    console.log('\n--- Post-Execution Actions ---');
    for (const action of result.postExecution) {
      switch (action.type) {
        case 'reviewFile':
          console.log(`[Review File] ${action.file}${action.editor ? ` (editor: ${action.editor})` : ''}`);
          break;
        case 'openUrl':
          console.log(`[Open URL] ${action.url}${action.browser ? ` (browser: ${action.browser})` : ''}`);
          break;
        case 'runCommand':
          console.log(`[Run Command] ${action.command}${action.cwd ? ` (cwd: ${action.cwd})` : ''}`);
          break;
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr, // Use stderr so prompts don't mix with output
  });

  try {
    let filePath: string | null;

    if (args.length === 0) {
      // No file specified - show interactive prompt selector
      rl.close(); // Close readline before inquirer takes over
      filePath = await selectPromptFile();
      if (!filePath) {
        process.exit(0);
      }

      // Re-create readline for input collection
      const newRl = readline.createInterface({
        input: process.stdin,
        output: process.stderr,
      });

      try {
        await runPrompt(filePath, newRl);
      } finally {
        newRl.close();
      }
      return;
    } else if (args[0] === '--list' || args[0] === '-l') {
      // Just list available prompts
      const files = findPromptFiles(PROMPT_DIR);
      if (files.length === 0) {
        console.log(`No prompt files found in ${PROMPT_DIR}`);
      } else {
        console.log(`\nPrompt files in ${PROMPT_DIR}:\n`);
        files.forEach((file) => {
          const tags = file.tags.length > 0 ? chalk.dim(` [${file.tags.join(', ')}]`) : '';
          const desc = file.description ? chalk.dim(` - ${file.description}`) : '';
          console.log(`  ${chalk.bold(file.name)}${tags}${desc}`);
          console.log(chalk.dim(`    ${file.relativePath}`));
        });
      }
      rl.close();
      return;
    } else if (args[0] === '--help' || args[0] === '-h') {
      console.log('Usage: npm run prompt [options] [prompt-file]');
      console.log('');
      console.log('Options:');
      console.log('  -l, --list    List available prompt files');
      console.log('  -h, --help    Show this help message');
      console.log('');
      console.log('If no prompt file is specified, shows an interactive fuzzy search.');
      console.log(`Searches for .prompt and .tsx files in ${PROMPT_DIR}`);
      console.log('');
      console.log('Features:');
      console.log('  - Fuzzy search: Type to filter prompts by name, tags, or description');
      console.log('  - Prefix matching: "ref" matches "refactoring"');
      console.log('  - Typo tolerance: "cod revew" matches "code review"');
      console.log('');
      console.log('Examples:');
      console.log('  npm run prompt                    # Interactive fuzzy search');
      console.log('  npm run prompt --list             # List available prompts');
      console.log('  npm run prompt ./tmp/basic.prompt # Run specific prompt');
      rl.close();
      return;
    } else {
      filePath = args[0];
    }

    await runPrompt(filePath, rl);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
