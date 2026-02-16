# Prompt Tool (pt) - Initial Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for the Prompt Tool using Test-Driven Development (TDD). Each step builds upon the previous one, ensuring the tool is functional and testable at every stage.

## Development Approach

1. **Test-Driven Development (TDD)**: Write tests first, then implement code to pass them
2. **Incremental Development**: Each step produces a working version of `pt`
3. **Continuous Testing**: Run tests after each implementation
4. **Cross-Platform Validation**: Ensure each step works on Linux, macOS, and Windows

## Step 0: Project Setup

### 0.1 Initialize Project

```bash
npm init -y
git init
```

### 0.2 Install Core Dependencies

```bash
# Development dependencies
npm install -D typescript vitest @types/node @vitest/ui
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier vite

# Initial production dependencies
npm install commander chalk
```

### 0.3 Configure TypeScript

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 0.4 Configure Vitest

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### 0.5 Setup Package.json Scripts

Update `package.json`:
```json
{
  "name": "prompt-tool",
  "version": "0.1.0",
  "description": "CLI tool for managing AI prompts",
  "main": "dist/index.js",
  "bin": {
    "pt": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "prepublishOnly": "npm run build"
  }
}
```

### 0.6 Create Initial Project Structure

```
prompt-tool/
├── src/
│   ├── cli.ts           # Entry point
│   ├── index.ts         # Main exports
│   └── utils/
│       └── platform.ts  # Platform utilities
├── test/
│   └── cli.test.ts
├── design/
│   ├── overall-design.md
│   └── initial-implementation.md
├── .gitignore
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

Create `.gitignore`:
```
node_modules/
dist/
coverage/
.env
.DS_Store
*.log
```

## Step 1: Basic CLI Foundation

### 1.1 Test: CLI Entry Point

Create `test/cli.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('pt CLI', () => {
  const cliPath = path.join(__dirname, '../dist/cli.js');
  
  beforeEach(() => {
    // Build the project before testing
    execSync('npm run build', { stdio: 'ignore' });
  });

  it('should display version with --version flag', () => {
    const output = execSync(`node ${cliPath} --version`).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should display help with --help flag', () => {
    const output = execSync(`node ${cliPath} --help`).toString();
    expect(output).toContain('Usage:');
    expect(output).toContain('Options:');
  });

  it('should run without arguments and show interactive mode message', () => {
    // For now, just check it doesn't crash
    const result = execSync(`node ${cliPath}`, { 
      stdio: 'pipe',
      input: '\n' // Send enter to exit
    });
    expect(result).toBeDefined();
  });
});
```

### 1.2 Implementation: Basic CLI

Create `src/cli.ts`:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import chalk from 'chalk';

const program = new Command();

program
  .name('pt')
  .description('CLI tool for managing AI prompts')
  .version(version);

program
  .action(async () => {
    console.log(chalk.blue('Welcome to Prompt Tool!'));
    console.log('Interactive mode will be implemented in the next step.');
  });

program.parse(process.argv);
```

Create `src/index.ts`:
```typescript
export const VERSION = '0.1.0';
```

### 1.3 Test Platform Utilities

Create `test/utils/platform.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PlatformUtils } from '../../src/utils/platform';
import os from 'os';
import path from 'path';

describe('PlatformUtils', () => {
  it('should detect the current platform', () => {
    const platform = os.platform();
    if (platform === 'win32') {
      expect(PlatformUtils.isWindows).toBe(true);
      expect(PlatformUtils.isMacOS).toBe(false);
      expect(PlatformUtils.isLinux).toBe(false);
    } else if (platform === 'darwin') {
      expect(PlatformUtils.isWindows).toBe(false);
      expect(PlatformUtils.isMacOS).toBe(true);
      expect(PlatformUtils.isLinux).toBe(false);
    } else if (platform === 'linux') {
      expect(PlatformUtils.isWindows).toBe(false);
      expect(PlatformUtils.isMacOS).toBe(false);
      expect(PlatformUtils.isLinux).toBe(true);
    }
  });

  it('should normalize paths correctly', () => {
    const testPath = 'foo/bar\\baz';
    const normalized = PlatformUtils.normalizePath(testPath);
    expect(normalized).toBe(path.normalize(testPath));
  });

  it('should join paths correctly', () => {
    const joined = PlatformUtils.joinPath('foo', 'bar', 'baz');
    expect(joined).toBe(path.join('foo', 'bar', 'baz'));
  });

  it('should get home directory', () => {
    const home = PlatformUtils.getHomeDir();
    expect(home).toBe(os.homedir());
  });

  it('should get config directory for current platform', () => {
    const configDir = PlatformUtils.getConfigDir();
    expect(configDir).toBeTruthy();
    expect(configDir).toContain(os.homedir());
  });

  it('should normalize line endings', () => {
    const mixed = 'line1\r\nline2\rline3\nline4';
    const normalized = PlatformUtils.normalizeLineEndings(mixed);
    expect(normalized).toBe('line1\nline2\nline3\nline4');
  });
});
```

### 1.4 Implementation: Platform Utilities

Create `src/utils/platform.ts`:
```typescript
import * as path from 'path';
import * as os from 'os';

export class PlatformUtils {
  static isWindows = os.platform() === 'win32';
  static isMacOS = os.platform() === 'darwin';
  static isLinux = os.platform() === 'linux';

  static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  static getHomeDir(): string {
    return os.homedir();
  }

  static getConfigDir(): string {
    if (this.isWindows) {
      return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    } else if (this.isMacOS) {
      return path.join(os.homedir(), 'Library', 'Application Support');
    } else {
      return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    }
  }

  static normalizeLineEndings(text: string): string {
    return text.replace(/\r\n|\r|\n/g, '\n');
  }

  static getPlatformLineEnding(): string {
    return this.isWindows ? '\r\n' : '\n';
  }
}
```

### 1.5 Run Tests

```bash
npm test
```

All tests should pass. The CLI can now be run with:
```bash
npm run build
node dist/cli.js --version
```

## Step 2: Configuration Management

### 2.1 Test: Configuration Loading

Create `test/config/config-manager.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../../src/config/config-manager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  const testDir = path.join(os.tmpdir(), 'pt-test-config');
  
  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });
  
  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should load default config when no config file exists', async () => {
    const config = await ConfigManager.load(testDir);
    expect(config.promptDirs).toEqual(['./prompts']);
    expect(config.historyDir).toBeUndefined();
  });

  it('should load config from .ptrc.json', async () => {
    const configPath = path.join(testDir, '.ptrc.json');
    const testConfig = {
      promptDirs: ['/custom/prompts'],
      historyDir: '/custom/history'
    };
    await fs.writeJson(configPath, testConfig);
    
    const config = await ConfigManager.load(testDir);
    expect(config.promptDirs).toEqual(['/custom/prompts']);
    expect(config.historyDir).toBe('/custom/history');
  });

  it('should load config from .ptrc.yaml', async () => {
    const configPath = path.join(testDir, '.ptrc.yaml');
    const yamlContent = `
promptDirs:
  - /yaml/prompts
  - ~/prompts
historyDir: ~/.pt/history
`;
    await fs.writeFile(configPath, yamlContent);
    
    const config = await ConfigManager.load(testDir);
    expect(config.promptDirs).toContain('/yaml/prompts');
    expect(config.historyDir).toBe('~/.pt/history');
  });

  it('should merge configs from multiple directories', async () => {
    // Create parent config
    const parentConfig = path.join(testDir, '.ptrc.json');
    await fs.writeJson(parentConfig, {
      promptDirs: ['/parent/prompts'],
      historyDir: '/parent/history'
    });
    
    // Create child config
    const childDir = path.join(testDir, 'child');
    await fs.ensureDir(childDir);
    const childConfig = path.join(childDir, '.ptrc.json');
    await fs.writeJson(childConfig, {
      promptDirs: ['/child/prompts']
      // historyDir not specified, should inherit from parent
    });
    
    const config = await ConfigManager.load(childDir);
    expect(config.promptDirs).toContain('/parent/prompts');
    expect(config.promptDirs).toContain('/child/prompts');
    expect(config.historyDir).toBe('/parent/history');
  });

  it('should expand home directory paths', async () => {
    const configPath = path.join(testDir, '.ptrc.json');
    await fs.writeJson(configPath, {
      promptDirs: ['~/prompts'],
      historyDir: '~/.pt/history'
    });
    
    const config = await ConfigManager.load(testDir);
    const homeDir = os.homedir();
    expect(config.promptDirs[0]).toBe(path.join(homeDir, 'prompts'));
    expect(config.historyDir).toBe(path.join(homeDir, '.pt/history'));
  });
});
```

### 2.2 Implementation: Configuration Manager

First, install cosmiconfig and yaml:
```bash
npm install cosmiconfig yaml
npm install -D @types/yaml
```

Create `src/types/config.ts`:
```typescript
export interface Config {
  promptDirs: string[];
  historyDir?: string;
  partials?: Record<string, PartialConfig>;
}

export interface PartialConfig {
  type: 'inline' | 'file';
  value?: string;
  path?: string;
}

export const DEFAULT_CONFIG: Config = {
  promptDirs: ['./prompts']
};
```

Create `src/config/config-manager.ts`:
```typescript
import { cosmiconfig } from 'cosmiconfig';
import { Config, DEFAULT_CONFIG } from '../types/config';
import path from 'path';
import os from 'os';
import { PlatformUtils } from '../utils/platform';

export class ConfigManager {
  private static explorer = cosmiconfig('pt', {
    searchPlaces: [
      '.ptrc',
      '.ptrc.json',
      '.ptrc.yaml',
      '.ptrc.yml',
      '.ptrc.js',
      '.ptrc.cjs',
      'pt.config.js'
    ]
  });

  static async load(startDir?: string): Promise<Config> {
    const searchFrom = startDir || process.cwd();
    const result = await this.explorer.search(searchFrom);
    
    if (!result) {
      return { ...DEFAULT_CONFIG };
    }

    // Merge all configs from current to root
    const configs: Config[] = [];
    let current = result;
    
    while (current) {
      configs.unshift(current.config);
      
      // Search parent directory
      const parentDir = path.dirname(path.dirname(current.filepath));
      if (parentDir === path.dirname(current.filepath)) break;
      
      current = await this.explorer.search(parentDir);
    }

    // Check home directory
    const homeConfig = await this.explorer.search(os.homedir());
    if (homeConfig && !configs.find(c => c === homeConfig.config)) {
      configs.unshift(homeConfig.config);
    }

    // Merge configs
    const merged = this.mergeConfigs(configs);
    
    // Expand paths
    return this.expandPaths(merged);
  }

  private static mergeConfigs(configs: Config[]): Config {
    const merged: Config = { ...DEFAULT_CONFIG };
    
    for (const config of configs) {
      if (config.promptDirs) {
        merged.promptDirs = [...(merged.promptDirs || []), ...config.promptDirs];
      }
      
      if (config.historyDir) {
        merged.historyDir = config.historyDir;
      }
      
      if (config.partials) {
        merged.partials = { ...merged.partials, ...config.partials };
      }
    }
    
    // Remove duplicates from promptDirs
    merged.promptDirs = [...new Set(merged.promptDirs)];
    
    return merged;
  }

  private static expandPaths(config: Config): Config {
    const expanded = { ...config };
    
    // Expand prompt directories
    expanded.promptDirs = config.promptDirs.map(dir => 
      this.expandPath(dir)
    );
    
    // Expand history directory
    if (config.historyDir) {
      expanded.historyDir = this.expandPath(config.historyDir);
    }
    
    // Expand partial paths
    if (config.partials) {
      expanded.partials = {};
      for (const [name, partial] of Object.entries(config.partials)) {
        expanded.partials[name] = { ...partial };
        if (partial.type === 'file' && partial.path) {
          expanded.partials[name].path = this.expandPath(partial.path);
        }
      }
    }
    
    return expanded;
  }

  private static expandPath(filepath: string): string {
    if (filepath.startsWith('~/')) {
      return PlatformUtils.joinPath(PlatformUtils.getHomeDir(), filepath.slice(2));
    }
    return path.resolve(filepath);
  }
}
```

### 2.3 Update CLI to Load Config

Update `src/cli.ts`:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import chalk from 'chalk';
import { ConfigManager } from './config/config-manager';

const program = new Command();

program
  .name('pt')
  .description('CLI tool for managing AI prompts')
  .version(version);

program
  .action(async () => {
    try {
      console.log(chalk.blue('Loading configuration...'));
      const config = await ConfigManager.load();
      console.log(chalk.green('Configuration loaded:'));
      console.log('Prompt directories:', config.promptDirs);
      if (config.historyDir) {
        console.log('History directory:', config.historyDir);
      }
      console.log('\nInteractive mode will be implemented in the next step.');
    } catch (error) {
      console.error(chalk.red('Error loading configuration:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

## Step 3: Prompt File Management

### 3.1 Test: Prompt Discovery

Create `test/prompts/prompt-manager.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PromptManager } from '../../src/prompts/prompt-manager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('PromptManager', () => {
  const testDir = path.join(os.tmpdir(), 'pt-test-prompts');
  const promptsDir = path.join(testDir, 'prompts');
  
  beforeEach(async () => {
    await fs.ensureDir(promptsDir);
  });
  
  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should discover markdown files in prompt directories', async () => {
    // Create test prompt files
    await fs.writeFile(
      path.join(promptsDir, 'test1.md'),
      '# Test Prompt 1'
    );
    await fs.writeFile(
      path.join(promptsDir, 'test2.md'),
      '# Test Prompt 2'
    );
    await fs.writeFile(
      path.join(promptsDir, 'not-markdown.txt'),
      'This should be ignored'
    );
    
    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    
    expect(prompts).toHaveLength(2);
    expect(prompts.map(p => p.filename)).toContain('test1.md');
    expect(prompts.map(p => p.filename)).toContain('test2.md');
  });

  it('should parse prompt with frontmatter', async () => {
    const promptContent = `---
title: API Client Generator
tags: [api, client, typescript]
variables:
  - name: serviceName
    type: input
    message: "Service name?"
---

# {{serviceName}} API Client

This is the prompt content.
`;
    
    const promptPath = path.join(promptsDir, 'api-client.md');
    await fs.writeFile(promptPath, promptContent);
    
    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    const prompt = prompts[0];
    
    expect(prompt.title).toBe('API Client Generator');
    expect(prompt.tags).toEqual(['api', 'client', 'typescript']);
    expect(prompt.content).toContain('This is the prompt content');
    expect(prompt.variables).toHaveLength(1);
    expect(prompt.variables[0].name).toBe('serviceName');
  });

  it('should handle prompts without frontmatter', async () => {
    const promptContent = `# Simple Prompt

Just a simple prompt without frontmatter.`;
    
    const promptPath = path.join(promptsDir, 'simple.md');
    await fs.writeFile(promptPath, promptContent);
    
    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    const prompt = prompts[0];
    
    expect(prompt.title).toBe('simple'); // Filename without extension
    expect(prompt.tags).toEqual([]);
    expect(prompt.content).toContain('Just a simple prompt');
  });

  it('should discover prompts in subdirectories', async () => {
    const subDir = path.join(promptsDir, 'category');
    await fs.ensureDir(subDir);
    await fs.writeFile(
      path.join(subDir, 'nested.md'),
      '# Nested Prompt'
    );
    
    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    
    expect(prompts).toHaveLength(1);
    expect(prompts[0].relativePath).toBe('category/nested.md');
  });
});
```

### 3.2 Implementation: Prompt Manager

First install gray-matter:
```bash
npm install gray-matter
npm install -D @types/gray-matter
```

Create `src/types/prompt.ts`:
```typescript
export interface Prompt {
  path: string;           // Full path to file
  relativePath: string;   // Path relative to prompt directory
  filename: string;       // Just the filename
  title: string;          // From frontmatter or filename
  tags: string[];       // From frontmatter
  content: string;        // Markdown content without frontmatter
  frontmatter: any;       // Raw frontmatter data
  variables?: VariableDefinition[];
}

export interface VariableDefinition {
  name: string;
  type: 'input' | 'select' | 'multiselect' | 'editor' | 'confirm' | 'password';
  message?: string;
  default?: any;
  choices?: string[];
  validate?: string;
}
```

Create `src/prompts/prompt-manager.ts`:
```typescript
import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { Prompt, VariableDefinition } from '../types/prompt';
import { PlatformUtils } from '../utils/platform';

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
    const normalized = PlatformUtils.normalizeLineEndings(content);
    const { data: frontmatter, content: markdownContent } = matter(normalized);
    
    const filename = path.basename(filePath);
    const relativePath = path.relative(baseDir, filePath);
    
    // Extract title from frontmatter or filename
    const title = frontmatter.title || path.basename(filename, '.md');
    
    // Extract tags
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    
    // Extract variables
    const variables = this.parseVariables(frontmatter.variables);
    
    return {
      path: filePath,
      relativePath,
      filename,
      title,
      tags,
      content: markdownContent.trim(),
      frontmatter,
      variables
    };
  }

  private parseVariables(variables: any): VariableDefinition[] | undefined {
    if (!Array.isArray(variables)) {
      return undefined;
    }
    
    return variables.map(v => ({
      name: v.name,
      type: v.type || 'input',
      message: v.message,
      default: v.default,
      choices: v.choices,
      validate: v.validate
    }));
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
```

## Step 4: Search Implementation

### 4.1 Test: Search Engine

Create `test/search/search-engine.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../../src/search/search-engine';
import { Prompt } from '../../src/types/prompt';

describe('SearchEngine', () => {
  let engine: SearchEngine;
  let testPrompts: Prompt[];
  
  beforeEach(() => {
    testPrompts = [
      {
        path: '/prompts/api-client.md',
        relativePath: 'api-client.md',
        filename: 'api-client.md',
        title: 'API Client Generator',
        tags: ['api', 'client', 'typescript'],
        content: 'Generate a TypeScript API client with authentication',
        frontmatter: {}
      },
      {
        path: '/prompts/react-component.md',
        relativePath: 'react-component.md',
        filename: 'react-component.md',
        title: 'React Component',
        tags: ['react', 'component', 'frontend'],
        content: 'Create a new React component with hooks',
        frontmatter: {}
      },
      {
        path: '/prompts/database-schema.md',
        relativePath: 'database-schema.md',
        filename: 'database-schema.md',
        title: 'Database Schema',
        tags: ['database', 'sql', 'schema'],
        content: 'Design a database schema for your application',
        frontmatter: {}
      }
    ];
    
    engine = new SearchEngine();
    engine.indexPrompts(testPrompts);
  });

  it('should find prompts by title', () => {
    const results = engine.search('api client');
    expect(results).toHaveLength(1);
    expect(results[0].item.title).toBe('API Client Generator');
  });

  it('should find prompts by tags', () => {
    const results = engine.search('typescript');
    expect(results).toHaveLength(1);
    expect(results[0].item.tags).toContain('typescript');
  });

  it('should find prompts by content', () => {
    const results = engine.search('hooks');
    expect(results).toHaveLength(1);
    expect(results[0].item.title).toBe('React Component');
  });

  it('should apply field boosting', () => {
    const results = engine.search('component');
    // Should rank "React Component" (title match) higher than content matches
    expect(results[0].item.title).toBe('React Component');
  });

  it('should handle substring matching', () => {
    const results = engine.search('data');
    expect(results).toHaveLength(1);
    expect(results[0].item.title).toBe('Database Schema');
  });

  it('should return empty array for no matches', () => {
    const results = engine.search('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('should handle empty search query', () => {
    const results = engine.search('');
    expect(results).toHaveLength(3); // All prompts
  });
});
```

### 4.2 Implementation: Search Engine

Install MiniSearch:
```bash
npm install minisearch
```

Create `src/search/search-engine.ts`:
```typescript
import MiniSearch from 'minisearch';
import { Prompt } from '../types/prompt';

export interface SearchResult {
  item: Prompt;
  score: number;
}

export class SearchEngine {
  private index: MiniSearch<Prompt>;
  private prompts: Map<string, Prompt> = new Map();

  constructor() {
    this.index = new MiniSearch<Prompt>({
      fields: ['title', 'tags', 'content'],
      storeFields: ['path'],
      searchOptions: {
        boost: {
          title: 3,
          tags: 2,
          content: 1
        },
        fuzzy: 0.2,
        prefix: true
      }
    });
  }

  indexPrompts(prompts: Prompt[]): void {
    // Clear existing index
    this.index.removeAll();
    this.prompts.clear();
    
    // Create documents for indexing
    const documents = prompts.map((prompt, index) => {
      const id = index.toString();
      this.prompts.set(id, prompt);
      
      return {
        id,
        title: prompt.title,
        tags: prompt.tags.join(' '),
        content: prompt.content,
        path: prompt.path
      };
    });
    
    // Add all documents to index
    this.index.addAll(documents);
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) {
      // Return all prompts for empty query
      return Array.from(this.prompts.values()).map(prompt => ({
        item: prompt,
        score: 1
      }));
    }
    
    const results = this.index.search(query);
    
    return results.map(result => ({
      item: this.prompts.get(result.id)!,
      score: result.score
    }));
  }

  getPromptCount(): number {
    return this.prompts.size;
  }
}
```

## Step 5: Interactive Search UI

### 5.1 Test: Interactive Search

Create `test/ui/interactive-search.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { InteractiveSearch } from '../../src/ui/interactive-search';
import { Prompt } from '../../src/types/prompt';
import * as inquirerPrompts from '@inquirer/prompts';

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  search: vi.fn()
}));

describe('InteractiveSearch', () => {
  const testPrompts: Prompt[] = [
    {
      path: '/prompts/test1.md',
      relativePath: 'test1.md',
      filename: 'test1.md',
      title: 'Test Prompt 1',
      tags: ['test'],
      content: 'Content 1',
      frontmatter: {}
    },
    {
      path: '/prompts/test2.md',
      relativePath: 'test2.md',
      filename: 'test2.md',
      title: 'Test Prompt 2',
      tags: ['test'],
      content: 'Content 2',
      frontmatter: {}
    }
  ];

  it('should present search interface and return selected prompt', async () => {
    const mockSearch = vi.mocked(inquirerPrompts.search);
    mockSearch.mockResolvedValueOnce(testPrompts[0]);
    
    const search = new InteractiveSearch();
    const result = await search.selectPrompt(testPrompts);
    
    expect(mockSearch).toHaveBeenCalledWith({
      message: 'Search for a prompt:',
      source: expect.any(Function)
    });
    expect(result).toBe(testPrompts[0]);
  });

  it('should filter prompts based on search input', async () => {
    const mockSearch = vi.mocked(inquirerPrompts.search);
    let sourceFunction: any;
    
    mockSearch.mockImplementationOnce(async (config: any) => {
      sourceFunction = config.source;
      return testPrompts[1];
    });
    
    const search = new InteractiveSearch();
    await search.selectPrompt(testPrompts);
    
    // Test the source function
    const results = await sourceFunction('2');
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(testPrompts[1]);
    expect(results[0].name).toContain('Test Prompt 2');
  });
});
```

### 5.2 Implementation: Interactive Search

Install inquirer prompts:
```bash
npm install @inquirer/prompts
```

Create `src/ui/interactive-search.ts`:
```typescript
import { search } from '@inquirer/prompts';
import { Prompt } from '../types/prompt';
import { SearchEngine } from '../search/search-engine';
import chalk from 'chalk';

export class InteractiveSearch {
  private searchEngine: SearchEngine;

  constructor() {
    this.searchEngine = new SearchEngine();
  }

  async selectPrompt(prompts: Prompt[]): Promise<Prompt> {
    this.searchEngine.indexPrompts(prompts);
    
    const selected = await search<Prompt>({
      message: 'Search for a prompt:',
      source: async (input) => {
        const results = input 
          ? this.searchEngine.search(input)
          : prompts.map(p => ({ item: p, score: 1 }));
        
        return results.map(result => ({
          name: this.formatPromptDisplay(result.item),
          value: result.item,
          description: result.item.relativePath
        }));
      }
    });
    
    return selected;
  }

  private formatPromptDisplay(prompt: Prompt): string {
    const tags = prompt.tags.length > 0 
      ? chalk.dim(` [${prompt.tags.join(', ')}]`)
      : '';
    
    return `${chalk.bold(prompt.title)}${tags}`;
  }
}
```

### 5.3 Update CLI with Search

Update `src/cli.ts`:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import chalk from 'chalk';
import { ConfigManager } from './config/config-manager';
import { PromptManager } from './prompts/prompt-manager';
import { InteractiveSearch } from './ui/interactive-search';

const program = new Command();

program
  .name('pt')
  .description('CLI tool for managing AI prompts')
  .version(version);

program
  .action(async () => {
    try {
      // Load configuration
      console.log(chalk.blue('Loading configuration...'));
      const config = await ConfigManager.load();
      
      // Discover prompts
      console.log(chalk.blue('Discovering prompts...'));
      const promptManager = new PromptManager(config.promptDirs);
      const prompts = await promptManager.discoverPrompts();
      
      if (prompts.length === 0) {
        console.log(chalk.yellow('No prompts found in configured directories:'));
        config.promptDirs.forEach(dir => console.log(`  - ${dir}`));
        process.exit(0);
      }
      
      console.log(chalk.green(`Found ${prompts.length} prompts\n`));
      
      // Interactive search
      const search = new InteractiveSearch();
      const selected = await search.selectPrompt(prompts);
      
      console.log(chalk.green('\nSelected prompt:'), selected.path);
      console.log('\nTemplate processing will be implemented in the next step.');
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        // User cancelled
        process.exit(0);
      }
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

## Step 6: Template Processing with User Input

### 6.1 Test: Template Engine

Create `test/template/template-engine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine } from '../../src/template/template-engine';
import { Prompt } from '../../src/types/prompt';
import * as inquirerPrompts from '@inquirer/prompts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn()
}));

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  
  beforeEach(() => {
    engine = new TemplateEngine();
    vi.clearAllMocks();
  });

  it('should process static helpers', async () => {
    const template = 'Today is {{date}} at {{time}}';
    const result = await engine.processTemplate(template, {});
    
    expect(result).toMatch(/Today is \d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should process input helpers and cache values', async () => {
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('MyProject');
    
    const template = `
Project: {{input "projectName" "Enter project name:"}}
Path: /src/{{projectName}}/index.ts
    `.trim();
    
    const result = await engine.processTemplate(template, {});
    
    expect(inquirerPrompts.input).toHaveBeenCalledOnce();
    expect(result).toContain('Project: MyProject');
    expect(result).toContain('Path: /src/MyProject/index.ts');
  });

  it('should handle select helpers', async () => {
    vi.mocked(inquirerPrompts.select).mockResolvedValueOnce('typescript');
    
    const template = 'Language: {{select "language" "Choose language:"}}';
    const result = await engine.processTemplate(template, {
      variables: [{
        name: 'language',
        type: 'select',
        choices: ['javascript', 'typescript']
      }]
    });
    
    expect(result).toBe('Language: typescript');
  });

  it('should use variable definitions from frontmatter', async () => {
    vi.mocked(inquirerPrompts.input).mockResolvedValueOnce('TestComponent');
    
    const prompt: Partial<Prompt> = {
      content: 'Component: {{componentName}}',
      variables: [{
        name: 'componentName',
        type: 'input',
        message: 'Component name?',
        default: 'MyComponent'
      }]
    };
    
    const result = await engine.processTemplate(prompt.content!, prompt);
    
    expect(inquirerPrompts.input).toHaveBeenCalledWith({
      message: 'Component name?',
      default: 'MyComponent'
    });
    expect(result).toBe('Component: TestComponent');
  });

  it('should mask sensitive values', async () => {
    vi.mocked(inquirerPrompts.input)
      .mockResolvedValueOnce('secret-key-123');
    
    const template = 'API Key: {{input "apiKey" "Enter API key:"}}';
    const result = await engine.processTemplate(template, {});
    
    expect(result).toBe('API Key: secret-key-123');
    
    // Check that context stores masked value for history
    const context = engine.getContext();
    expect(context.get('apiKey')).toBe('secret-key-123');
    expect(context.getMasked('apiKey')).toBe('***');
  });
});
```

### 6.2 Implementation: Template Engine

Create `src/template/helpers/index.ts`:
```typescript
import Handlebars from 'handlebars';
import { input, select, confirm, editor, checkbox, password } from '@inquirer/prompts';
import { TemplateContext } from '../template-context';
import { VariableDefinition } from '../../types/prompt';

export function registerHelpers(handlebars: typeof Handlebars, context: TemplateContext) {
  // Static helpers
  handlebars.registerHelper('date', () => {
    return new Date().toLocaleDateString();
  });
  
  handlebars.registerHelper('time', () => {
    return new Date().toLocaleTimeString();
  });
  
  handlebars.registerHelper('datetime', () => {
    return new Date().toLocaleString();
  });
  
  handlebars.registerHelper('timestamp', () => {
    return Date.now();
  });
  
  handlebars.registerHelper('uuid', () => {
    return crypto.randomUUID();
  });
  
  handlebars.registerHelper('cwd', () => {
    return process.cwd();
  });
  
  handlebars.registerHelper('hostname', () => {
    return require('os').hostname();
  });
  
  handlebars.registerHelper('username', () => {
    return require('os').userInfo().username;
  });
  
  // Input helpers
  const createInputHelper = (type: string, promptFn: any) => {
    handlebars.registerHelper(type, function(this: any, ...args: any[]) {
      const options = args[args.length - 1];
      
      // Parse arguments
      let name: string;
      let message: string | undefined;
      
      if (typeof args[0] === 'string') {
        name = args[0];
        message = args[1];
      } else if (options.hash && options.hash.name) {
        name = options.hash.name;
        message = options.hash.message;
      } else {
        throw new Error(`${type} helper requires a name`);
      }
      
      // Get cached value
      const cached = context.get(name);
      if (cached !== undefined) {
        return cached;
      }
      
      // Find variable definition
      const varDef = context.getVariableDefinition(name);
      
      // Build prompt config
      const promptConfig: any = {
        message: message || varDef?.message || generateDefaultMessage(name, type)
      };
      
      if (varDef) {
        if (varDef.default !== undefined) promptConfig.default = varDef.default;
        if (varDef.choices) promptConfig.choices = varDef.choices;
        if (varDef.validate) {
          // Convert string regex to function
          if (typeof varDef.validate === 'string') {
            const regex = new RegExp(varDef.validate);
            promptConfig.validate = (input: string) => {
              return regex.test(input) || 'Invalid format';
            };
          }
        }
      }
      
      // Handle choices from helper arguments
      if (options.hash && options.hash.choices) {
        promptConfig.choices = options.hash.choices;
      }
      
      // Create async placeholder
      const placeholder = `__ASYNC_${type}_${name}__`;
      
      // Queue the async operation
      context.queueAsyncOperation(async () => {
        const value = await promptFn(promptConfig);
        context.set(name, value);
        return { placeholder, value };
      });
      
      return placeholder;
    });
  };
  
  // Register all input helpers
  createInputHelper('input', input);
  createInputHelper('select', select);
  createInputHelper('multiselect', checkbox);
  createInputHelper('confirm', confirm);
  createInputHelper('editor', editor);
  createInputHelper('password', password);
}

function generateDefaultMessage(name: string, type: string): string {
  // Convert camelCase/snake_case to human readable
  const humanized = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
  
  const capitalized = humanized.charAt(0).toUpperCase() + humanized.slice(1);
  
  const suffix = {
    'input': ':',
    'select': ':',
    'multiselect': ' (select multiple):',
    'confirm': '?',
    'editor': ' (press enter to open editor):',
    'password': ':'
  }[type] || ':';
  
  return `${capitalized}${suffix}`;
}
```

Create `src/template/template-context.ts`:
```typescript
import { VariableDefinition } from '../types/prompt';

export class TemplateContext {
  private values = new Map<string, any>();
  private asyncOperations: Array<() => Promise<{ placeholder: string; value: any }>> = [];
  private variableDefinitions: VariableDefinition[] = [];
  
  constructor(variables?: VariableDefinition[]) {
    this.variableDefinitions = variables || [];
  }
  
  get(name: string): any {
    return this.values.get(name);
  }
  
  set(name: string, value: any): void {
    this.values.set(name, value);
  }
  
  getMasked(name: string): any {
    const value = this.get(name);
    if (value && this.isSensitive(name)) {
      return '***';
    }
    return value;
  }
  
  private isSensitive(name: string): boolean {
    const sensitivePatterns = [
      /apikey/i,
      /password/i,
      /secret/i,
      /token/i,
      /credential/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(name));
  }
  
  getVariableDefinition(name: string): VariableDefinition | undefined {
    return this.variableDefinitions.find(v => v.name === name);
  }
  
  queueAsyncOperation(operation: () => Promise<{ placeholder: string; value: any }>): void {
    this.asyncOperations.push(operation);
  }
  
  async processAsyncOperations(template: string): Promise<string> {
    let result = template;
    
    // Process all async operations
    const results = await Promise.all(
      this.asyncOperations.map(op => op())
    );
    
    // Replace placeholders with actual values
    for (const { placeholder, value } of results) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Clear operations for next run
    this.asyncOperations = [];
    
    return result;
  }
  
  getAllValues(): Map<string, any> {
    return new Map(this.values);
  }
  
  getMaskedValues(): Map<string, any> {
    const masked = new Map<string, any>();
    
    for (const [key, value] of this.values) {
      masked.set(key, this.getMasked(key));
    }
    
    return masked;
  }
}
```

Create `src/template/template-engine.ts`:
```typescript
import Handlebars from 'handlebars';
import { TemplateContext } from './template-context';
import { registerHelpers } from './helpers';
import { Prompt } from '../types/prompt';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private context: TemplateContext;
  
  constructor() {
    this.handlebars = Handlebars.create();
    this.context = new TemplateContext();
  }
  
  async processTemplate(template: string, prompt: Partial<Prompt>): Promise<string> {
    // Create new context with variable definitions
    this.context = new TemplateContext(prompt.variables);
    
    // Register helpers with context
    registerHelpers(this.handlebars, this.context);
    
    // First pass: compile and execute template
    const compiled = this.handlebars.compile(template, { noEscape: true });
    const firstPass = compiled({});
    
    // Second pass: process async placeholders
    const result = await this.context.processAsyncOperations(firstPass);
    
    // Third pass: process any remaining variables that were collected
    const finalCompiled = this.handlebars.compile(result, { noEscape: true });
    const contextData: any = {};
    
    // Add all collected values to context data
    for (const [key, value] of this.context.getAllValues()) {
      contextData[key] = value;
    }
    
    return finalCompiled(contextData);
  }
  
  getContext(): TemplateContext {
    return this.context;
  }
}
```

Install handlebars:
```bash
npm install handlebars
npm install -D @types/handlebars
```

## Step 7: Complete CLI Integration

### 7.1 Update CLI with Full Flow

Update `src/cli.ts` with the complete implementation:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import chalk from 'chalk';
import { ConfigManager } from './config/config-manager';
import { PromptManager } from './prompts/prompt-manager';
import { InteractiveSearch } from './ui/interactive-search';
import { TemplateEngine } from './template/template-engine';
import { HistoryManager } from './history/history-manager';
import * as fs from 'fs-extra';

const program = new Command();

program
  .name('pt')
  .description('CLI tool for managing AI prompts')
  .version(version);

program
  .action(async () => {
    try {
      // Load configuration
      const config = await ConfigManager.load();
      
      // Ensure prompt directories exist
      for (const dir of config.promptDirs) {
        await fs.ensureDir(dir);
      }
      
      // Discover prompts
      const promptManager = new PromptManager(config.promptDirs);
      const prompts = await promptManager.discoverPrompts();
      
      if (prompts.length === 0) {
        console.log(chalk.yellow('\nNo prompts found. Create a prompt file in one of these directories:'));
        config.promptDirs.forEach(dir => console.log(`  - ${dir}`));
        console.log(chalk.dim('\nExample prompt file (hello.md):'));
        console.log(chalk.dim('---'));
        console.log(chalk.dim('title: Hello World'));
        console.log(chalk.dim('---'));
        console.log(chalk.dim('Hello {{input "name" "What is your name?"}}!'));
        process.exit(0);
      }
      
      // Interactive search
      const search = new InteractiveSearch();
      const selected = await search.selectPrompt(prompts);
      
      console.log(chalk.blue(`\nProcessing: ${selected.title}`));
      console.log(chalk.dim(`Location: ${selected.path}\n`));
      
      // Process template
      const engine = new TemplateEngine();
      const result = await engine.processTemplate(selected.content, selected);
      
      // Display result
      console.log(chalk.green('\n' + '='.repeat(60)));
      console.log(chalk.bold('Generated Prompt:'));
      console.log(chalk.green('='.repeat(60) + '\n'));
      console.log(result);
      console.log(chalk.green('\n' + '='.repeat(60)));
      
      // Save to history if configured
      if (config.historyDir) {
        const historyManager = new HistoryManager(config.historyDir);
        await historyManager.savePrompt({
          templatePath: selected.path,
          templateContent: selected.content,
          variables: engine.getContext().getMaskedValues(),
          finalPrompt: result
        });
        console.log(chalk.dim(`\nSaved to history: ${config.historyDir}`));
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        // User cancelled
        process.exit(0);
      }
      console.error(chalk.red('\nError:'), error);
      process.exit(1);
    }
  });

// Add example command
program
  .command('example')
  .description('Create an example prompt in the current directory')
  .action(async () => {
    const examplePath = './prompts/example-api-client.md';
    const exampleContent = `---
title: API Client Generator
tags: [api, typescript, client]
variables:
  - name: serviceName
    type: input
    message: "What is the name of your API service?"
    default: "MyAPI"
  - name: authType
    type: select
    message: "Choose authentication type:"
    choices: ["none", "api-key", "oauth2", "basic"]
---

# {{serviceName}} API Client

Generate a TypeScript API client for {{serviceName}}.

## Authentication
Type: {{authType}}

## Base Configuration
\`\`\`typescript
export class {{serviceName}}Client {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  // Add methods here
}
\`\`\`

Generated on {{date}} by {{username}}.
`;
    
    await fs.ensureDir('./prompts');
    await fs.writeFile(examplePath, exampleContent);
    
    console.log(chalk.green(`Created example prompt: ${examplePath}`));
    console.log(chalk.dim('\nRun "pt" to try it out!'));
  });

program.parse(process.argv);
```

### 7.2 History Manager Implementation

Create `src/history/history-manager.ts`:
```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import matter from 'gray-matter';
import { PlatformUtils } from '../utils/platform';

interface HistorySaveOptions {
  templatePath: string;
  templateContent: string;
  variables: Map<string, any>;
  finalPrompt: string;
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
          hash: this.hashContent(options.templateContent)
        },
        execution: {
          date: new Date().toISOString().split('T')[0],
          user: require('os').userInfo().username,
          cwd: process.cwd()
        },
        variables: Object.fromEntries(options.variables),
        system: {
          platform: process.platform,
          ptVersion: require('../../package.json').version,
          nodeVersion: process.version
        }
      };
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const templateName = path.basename(options.templatePath, '.md');
      const shortHash = metadata.template.hash.substring(0, 6);
      const filename = `${timestamp}_${templateName}_${shortHash}.md`;
      
      // Create history content
      const historyContent = matter.stringify(options.finalPrompt, metadata);
      
      // Save with secure permissions
      const filePath = path.join(this.historyDir, filename);
      await fs.writeFile(filePath, historyContent, { mode: 0o600 });
      
    } catch (error) {
      // Log error but don't fail the main operation
      console.warn('Failed to save history:', error);
    }
  }
  
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

## Step 8: Testing the Complete Application

### 8.1 End-to-End Test

Create `test/e2e/pt.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('pt CLI E2E', () => {
  const testDir = path.join(os.tmpdir(), 'pt-e2e-test');
  const promptsDir = path.join(testDir, 'prompts');
  
  beforeEach(async () => {
    await fs.ensureDir(promptsDir);
    process.chdir(testDir);
    
    // Create test config
    await fs.writeJson('.ptrc.json', {
      promptDirs: ['./prompts']
    });
    
    // Create test prompt
    const promptContent = `---
title: Test Prompt
tags: [test]
---
Hello {{input "name" "Your name?"}}!
Today is {{date}}.`;
    
    await fs.writeFile(path.join(promptsDir, 'test.md'), promptContent);
    
    // Build the project
    execSync('npm run build', { 
      stdio: 'ignore',
      cwd: path.join(__dirname, '../..')
    });
  });
  
  afterEach(async () => {
    await fs.remove(testDir);
  });
  
  it('should run pt example command', () => {
    const output = execSync('pt example', {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toContain('Created example prompt');
    expect(fs.existsSync(path.join(testDir, 'prompts/example-api-client.md'))).toBe(true);
  });
  
  it('should display help', () => {
    const output = execSync('pt --help', {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toContain('Usage:');
    expect(output).toContain('pt [options]');
  });
  
  it('should display version', () => {
    const output = execSync('pt --version', {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });
});
```

## Final Steps

### Build and Link for Testing

```bash
# Build the project
npm run build

# Link globally for testing
npm link

# Now you can run 'pt' from anywhere
pt --version
pt example
pt
```

### Create Initial Prompt Directory

```bash
# Create default prompts directory
mkdir -p ~/prompts

# Create your first prompt
cat > ~/prompts/hello.md << 'EOF'
---
title: Hello World
tags: [example, greeting]
---
Hello {{input "name" "What is your name?"}}!

Welcome to Prompt Tool. Today is {{date}}.
EOF
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test -- --watch
```

## Next Implementation Steps

This initial implementation provides:

1. ✅ Basic CLI that runs with `pt` command
2. ✅ Configuration management with cosmiconfig
3. ✅ Prompt discovery and parsing
4. ✅ Interactive search with field boosting
5. ✅ Template processing with Handlebars
6. ✅ User input collection with caching
7. ✅ Cross-platform support
8. ✅ Basic history saving

To complete the full design, implement:

1. **Custom Partials** - Load and execute custom partials from config
2. **Advanced Search** - Implement fuzzy search and better ranking
3. **History Commands** - Add `pt --history search` and other history operations
4. **Better Error Handling** - Add more specific error messages
5. **Performance Optimization** - Add caching and lazy loading
6. **CI/CD Pipeline** - Set up GitHub Actions as specified in the design

Each of these can be implemented incrementally while maintaining a working `pt` command.
