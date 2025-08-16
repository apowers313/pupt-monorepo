# Implementation Plan: Prompt Tool Refactoring
Date: 2025-08-16

## Executive Summary

This implementation plan addresses the critical issues identified in the code review using a test-driven development approach. The plan is organized into 5 phases, each delivering verifiable functionality while progressively refactoring the codebase to eliminate duplication and improve maintainability.

## Implementation Strategy

### Key Principles
1. **Test-Driven Development**: Write tests first, then implement features
2. **Incremental Refactoring**: Each phase delivers working functionality
3. **Backward Compatibility**: Existing functionality remains intact during refactoring
4. **Isolation**: Tests use proper mocking to avoid environment dependencies
5. **Reusability**: Create shared utilities and test helpers

### Technology Choices
- **Schema Validation**: Zod (TypeScript-first, zero dependencies)
- **Logging**: Pino (performance-focused, good defaults)
- **Testing**: Vitest with custom test utilities
- **Error Handling**: Enhanced PromptToolError with factory functions

## Phase 1: Foundation Layer (Day 1-2)

### Overview
Create the fundamental utilities and test infrastructure that all subsequent phases will build upon.

### Steps

#### 1.1 Test Infrastructure Setup
1. Create `test/utils/mock-factories.ts` for reusable mocks
2. Create `test/utils/test-helpers.ts` for common setup/teardown
3. Create `test/utils/fixtures.ts` for shared test data
4. Write tests for the test utilities themselves

#### 1.2 Editor Utilities
1. Write tests for `src/utils/editor.ts` covering all editor scenarios
2. Extract and consolidate editor logic from 3 locations
3. Update all consuming code to use the new utility
4. Verify all editor-related tests still pass

#### 1.3 Security Utilities
1. Write tests for `src/utils/security.ts`
2. Extract sensitive data detection logic
3. Add value masking functionality
4. Update HistoryManager and TemplateContext to use new utilities

#### 1.4 Date Formatting Utilities
1. Write tests for `src/utils/date-formatter.ts`
2. Consolidate all date formatting logic
3. Update all date formatting code to use centralized utilities
4. Ensure consistent date handling across the application

### Verification
- All existing tests pass
- New utility tests provide 100% coverage
- Editor functionality works identically to before
- Sensitive data masking works correctly
- Date formatting is consistent

## Phase 2: Service Layer Architecture (Day 3-4)

### Overview
Introduce service layer to separate business logic from commands and create proper abstractions.

### Steps

#### 2.1 File System Service
1. Write tests for `src/services/file-system-service.ts`
2. Merge FileUtils and FileSearchEngine functionality
3. Create unified caching layer
4. Consolidate path operations (including tilde expansion)

#### 2.2 Git Service
1. Write tests for `src/services/git-service.ts`
2. Extract all git operations from commands
3. Create consistent error handling for git operations
4. Add proper TypeScript types for git responses

#### 2.3 Prompt Service
1. Write tests for `src/services/prompt-service.ts`
2. Extract prompt discovery and loading logic
3. Add prompt validation with Zod schemas
4. Create prompt caching layer

#### 2.4 UI Service
1. Write tests for `src/ui/console-ui.ts`
2. Centralize all console output formatting
3. Create consistent color scheme
4. Add output level control (verbose, quiet, etc.)

### Verification
- Services have clear interfaces and responsibilities
- All git operations go through GitService
- File operations are centralized
- Console output is consistent

## Phase 3: Command Abstraction (Day 5-6)

### Overview
Refactor commands to use common patterns and reduce duplication.

### Steps

#### 3.1 Command Base Class
1. Write tests for command abstraction
2. Create `src/commands/base-command.ts` with common lifecycle
3. Define Command interface with validate/collect/execute pattern
4. Add error handling wrapper

#### 3.2 Refactor Commands
1. Update each command to extend BaseCommand
2. Move common validation to base class
3. Standardize error handling across commands
4. Use dependency injection for services

#### 3.3 Configuration Validation
1. Write Zod schemas for all configuration types
2. Add configuration migration tests
3. Implement schema-based validation in ConfigManager
4. Add helpful error messages for validation failures

### Verification
- Commands follow consistent patterns
- Configuration validation provides clear errors
- All commands use services instead of direct operations
- Error handling is uniform

## Phase 4: Enhanced Error Handling and Logging (Day 7-8)

### Overview
Implement comprehensive error handling and logging strategy.

### Steps

#### 4.1 Error System Enhancement
1. Write tests for error factories
2. Create error factory functions for common scenarios
3. Add error categorization (user error, system error, etc.)
4. Implement error recovery suggestions

#### 4.2 Logging Implementation
1. Write tests for logging service
2. Implement Pino-based logging service
3. Add log rotation and formatting
4. Create debug mode with detailed logging
5. Add performance logging for slow operations

#### 4.3 Monitoring Integration
1. Add operation timing
2. Create metrics collection
3. Add anonymous usage analytics (opt-in)
4. Implement crash reporting (opt-in)

### Verification
- Errors provide actionable feedback
- Logging helps with debugging
- Performance bottlenecks are visible
- No sensitive data in logs

## Phase 5: Testing and Documentation (Day 9-10)

### Overview
Complete the refactoring with comprehensive testing improvements and documentation.

### Steps

#### 5.1 Test Suite Optimization
1. Reduce test file sizes by 50% using shared utilities
2. Add integration tests using new test helpers
3. Improve test isolation with proper mocking
4. Add performance benchmarks for critical paths

#### 5.2 Constants and Configuration
1. Create `src/constants.ts` for all magic values
2. Document all configuration options
3. Add environment variable documentation
4. Create migration guide for breaking changes

#### 5.3 Developer Documentation
1. Document all new patterns and utilities
2. Create contribution guidelines
3. Add architecture diagrams
4. Write troubleshooting guide

### Verification
- Test suite runs faster
- Tests are more maintainable
- Documentation is comprehensive
- New developers can onboard easily

## Implementation Metrics

### Expected Improvements
- **Code Reduction**: ~30% fewer lines of code
- **Test Maintenance**: 50% reduction in test boilerplate
- **Bug Fix Time**: 3x faster (no triple implementations)
- **Test Execution**: 20% faster with proper mocking
- **Type Safety**: 100% type coverage (no `any` in production code)

### Success Criteria
1. All existing functionality preserved
2. All tests passing
3. No performance regressions
4. Improved developer experience
5. Reduced maintenance burden

## Risk Mitigation

### Potential Risks
1. **Breaking Changes**: Mitigated by comprehensive test coverage
2. **Performance Impact**: Mitigated by benchmarking critical paths
3. **Migration Complexity**: Mitigated by incremental approach
4. **Team Adoption**: Mitigated by clear documentation

### Rollback Strategy
- Each phase is independently revertable
- Git branches for each phase
- Feature flags for gradual rollout
- Comprehensive test suite ensures safety

## Code Examples

### Test Utility Examples

#### Mock Factory Pattern
```typescript
// test/utils/mock-factories.ts
import { vi } from 'vitest';
import type { Config } from '../../src/types/config';

export function createMockConfig(overrides: Partial<Config> = {}): Config {
  return {
    promptDirectory: ['./prompts'],
    historyDirectory: './.pthistory',
    editor: 'code',
    ...overrides
  };
}

export function createMockConsole() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    restore: () => {
      vi.restoreAllMocks();
    }
  };
}

export function createMockSpawn() {
  const mockSpawn = vi.fn();
  const mockProcess = {
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 10);
      }
    }),
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() }
  };
  
  mockSpawn.mockReturnValue(mockProcess);
  return { mockSpawn, mockProcess };
}
```

#### Test Helper Pattern
```typescript
// test/utils/test-helpers.ts
import { mkdtemp, rm } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { beforeEach, afterEach } from 'vitest';

export interface TestContext {
  tempDir: string;
  cleanup: () => Promise<void>;
}

export function setupTestEnvironment(): TestContext {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pt-test-'));
  });
  
  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  
  return {
    get tempDir() { return tempDir; },
    cleanup: async () => {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  };
}

export function mockConsoleOutput() {
  const console = createMockConsole();
  
  beforeEach(() => {
    vi.spyOn(globalThis.console, 'log').mockImplementation(console.log);
    vi.spyOn(globalThis.console, 'error').mockImplementation(console.error);
  });
  
  afterEach(() => {
    console.restore();
  });
  
  return console;
}
```

### Utility Implementation Examples

#### Editor Utility
```typescript
// src/utils/editor.ts
import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

export interface EditorLauncher {
  findEditor(): Promise<string | null>;
  isEditorAvailable(editor: string): Promise<boolean>;
  openInEditor(editor: string, filepath: string): Promise<void>;
}

export class DefaultEditorLauncher implements EditorLauncher {
  private static readonly COMMON_EDITORS = [
    'code',
    'vim',
    'nano',
    'emacs',
    'subl',
    'atom',
    'gedit',
    'notepad'
  ];

  async findEditor(): Promise<string | null> {
    // Check environment variables first
    const envEditor = process.env.VISUAL || process.env.EDITOR;
    if (envEditor && await this.isEditorAvailable(envEditor)) {
      return envEditor;
    }

    // Try common editors
    for (const editor of DefaultEditorLauncher.COMMON_EDITORS) {
      if (await this.isEditorAvailable(editor)) {
        return editor;
      }
    }

    return null;
  }

  async isEditorAvailable(editor: string): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        await execFileAsync('where', [editor]);
      } else {
        await execFileAsync('which', [editor]);
      }
      return true;
    } catch {
      return false;
    }
  }

  async openInEditor(editor: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(editor, [filepath], {
        detached: true,
        stdio: 'ignore'
      });

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });

      child.unref();
    });
  }
}

export const editorLauncher = new DefaultEditorLauncher();
```

#### Security Utility
```typescript
// src/utils/security.ts
export const SENSITIVE_PATTERNS = [
  /apikey/i,
  /password/i,
  /secret/i,
  /token/i,
  /credential/i,
  /private[_-]?key/i,
  /auth/i,
  /bearer/i
] as const;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

export function maskSensitiveValue(key: string, value: unknown): unknown {
  if (!isSensitiveKey(key)) {
    return value;
  }
  
  if (typeof value === 'string') {
    return '***';
  }
  
  if (Array.isArray(value)) {
    return value.map(() => '***');
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((masked, k) => ({
      ...masked,
      [k]: maskSensitiveValue(k, (value as any)[k])
    }), {});
  }
  
  return '***';
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T
): T {
  return Object.entries(obj).reduce((sanitized, [key, value]) => ({
    ...sanitized,
    [key]: maskSensitiveValue(key, value)
  }), {} as T);
}
```

#### Date Formatter Utility
```typescript
// src/utils/date-formatter.ts
export const DateFormats = {
  YYYYMMDD: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  },

  UTC_DATETIME: (date: Date): string => {
    return date.toISOString();
  },

  LOCAL_DATE: (date: Date): string => {
    return date.toLocaleDateString();
  },

  LOCAL_TIME: (date: Date): string => {
    return date.toLocaleTimeString();
  },

  LOCAL_DATETIME: (date: Date): string => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  },

  RELATIVE: (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
};

export function formatDate(date: Date, format: keyof typeof DateFormats): string {
  const formatter = DateFormats[format];
  if (!formatter) {
    throw new Error(`Unknown date format: ${format}`);
  }
  return formatter(date);
}
```

### Service Layer Examples

#### File System Service
```typescript
// src/services/file-system-service.ts
import { readdir, stat, readFile } from 'fs/promises';
import { join, resolve, relative } from 'path';
import { homedir } from 'os';
import { glob } from 'glob';
import MiniSearch from 'minisearch';

export interface FileInfo {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
}

export interface FileSystemServiceOptions {
  cacheTimeout?: number;
  excludePatterns?: string[];
}

export class FileSystemService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private searchIndex: MiniSearch<FileInfo> | null = null;

  constructor(private options: FileSystemServiceOptions = {}) {
    this.options.cacheTimeout = options.cacheTimeout ?? 5000;
    this.options.excludePatterns = options.excludePatterns ?? [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'coverage/**'
    ];
  }

  expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(homedir(), path.slice(2));
    }
    return resolve(path);
  }

  async listFiles(directory: string, pattern?: string): Promise<FileInfo[]> {
    const cacheKey = `list:${directory}:${pattern}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const expandedDir = this.expandPath(directory);
    const files = await this.scanDirectory(expandedDir, pattern);
    
    this.setCache(cacheKey, files);
    return files;
  }

  async searchFiles(directory: string, query: string): Promise<FileInfo[]> {
    if (!this.searchIndex) {
      await this.buildSearchIndex(directory);
    }

    const results = this.searchIndex!.search(query, {
      fuzzy: 0.2,
      prefix: true,
      boost: { name: 2 }
    });

    return results.map(result => result as unknown as FileInfo);
  }

  private async scanDirectory(dir: string, pattern?: string): Promise<FileInfo[]> {
    const globPattern = pattern || '**/*';
    const files = await glob(globPattern, {
      cwd: dir,
      ignore: this.options.excludePatterns,
      absolute: false
    });

    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const fullPath = join(dir, file);
        const stats = await stat(fullPath);
        return {
          path: fullPath,
          name: file.split('/').pop()!,
          relativePath: file,
          size: stats.size,
          modified: stats.mtime,
          isDirectory: stats.isDirectory()
        };
      })
    );

    return fileInfos;
  }

  private async buildSearchIndex(directory: string): Promise<void> {
    const files = await this.listFiles(directory);
    
    this.searchIndex = new MiniSearch({
      fields: ['name', 'relativePath'],
      storeFields: ['path', 'name', 'relativePath', 'size', 'modified', 'isDirectory'],
      searchOptions: {
        boost: { name: 2 },
        fuzzy: 0.2
      }
    });

    this.searchIndex.addAll(files.map((file, id) => ({ ...file, id })));
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.options.cacheTimeout!) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
    this.searchIndex = null;
  }
}
```

#### UI Service
```typescript
// src/ui/console-ui.ts
import chalk from 'chalk';
import ora from 'ora';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface UIOptions {
  logLevel?: LogLevel;
  useColor?: boolean;
  silent?: boolean;
}

export class ConsoleUI {
  private logLevel: LogLevel;
  private useColor: boolean;
  private silent: boolean;

  constructor(options: UIOptions = {}) {
    this.logLevel = options.logLevel ?? LogLevel.INFO;
    this.useColor = options.useColor ?? true;
    this.silent = options.silent ?? false;
  }

  success(message: string): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const formatted = this.useColor ? chalk.green('✅ ' + message) : '✅ ' + message;
    console.log(formatted);
  }

  error(error: Error | string): void {
    if (this.silent || this.logLevel < LogLevel.ERROR) return;
    const message = error instanceof Error ? error.message : error;
    const formatted = this.useColor ? chalk.red('❌ ' + message) : '❌ ' + message;
    console.error(formatted);
  }

  warn(message: string): void {
    if (this.silent || this.logLevel < LogLevel.WARN) return;
    const formatted = this.useColor ? chalk.yellow('⚠️  ' + message) : '⚠️  ' + message;
    console.warn(formatted);
  }

  info(message: string): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const formatted = this.useColor ? chalk.blue('ℹ️  ' + message) : 'ℹ️  ' + message;
    console.log(formatted);
  }

  debug(message: string): void {
    if (this.silent || this.logLevel < LogLevel.DEBUG) return;
    const formatted = this.useColor ? chalk.gray('🐛 ' + message) : '🐛 ' + message;
    console.log(formatted);
  }

  spinner(text: string) {
    if (this.silent) {
      return {
        start: () => {},
        succeed: () => {},
        fail: () => {},
        stop: () => {}
      };
    }
    return ora(text);
  }

  table(data: any[]): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    console.table(data);
  }

  json(data: any, pretty = true): void {
    if (this.silent || this.logLevel < LogLevel.INFO) return;
    const output = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    console.log(output);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }
}

export const ui = new ConsoleUI();
```

### Command Abstraction Example

```typescript
// src/commands/base-command.ts
import { Config } from '../types/config';
import { ConsoleUI } from '../ui/console-ui';
import { PromptToolError } from '../utils/errors';
import pino from 'pino';

export interface CommandContext {
  config: Config;
  ui: ConsoleUI;
  logger: pino.Logger;
}

export interface CommandOptions {
  verbose?: boolean;
  quiet?: boolean;
}

export abstract class BaseCommand<TInput, TOutput = void> {
  protected context: CommandContext;
  protected options: CommandOptions;

  constructor(context: CommandContext, options: CommandOptions = {}) {
    this.context = context;
    this.options = options;
    
    if (options.verbose) {
      context.ui.setLogLevel(LogLevel.DEBUG);
    }
    if (options.quiet) {
      context.ui.setSilent(true);
    }
  }

  async execute(): Promise<TOutput> {
    try {
      this.context.logger.info({ command: this.name }, 'Executing command');
      
      await this.validatePreconditions();
      const input = await this.collectInput();
      const result = await this.performAction(input);
      
      this.context.logger.info({ command: this.name }, 'Command completed');
      return result;
    } catch (error) {
      this.context.logger.error({ command: this.name, error }, 'Command failed');
      
      if (error instanceof PromptToolError) {
        this.context.ui.error(error);
        if (error.suggestions.length > 0) {
          this.context.ui.info('Suggestions:');
          error.suggestions.forEach(s => this.context.ui.info(`  - ${s}`));
        }
      } else {
        this.context.ui.error(error as Error);
      }
      
      throw error;
    }
  }

  protected abstract get name(): string;
  protected abstract validatePreconditions(): Promise<void>;
  protected abstract collectInput(): Promise<TInput>;
  protected abstract performAction(input: TInput): Promise<TOutput>;
}
```

### Zod Schema Examples

```typescript
// src/schemas/config-schema.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  promptDirectory: z.array(z.string()).min(1),
  historyDirectory: z.string().default('./.pthistory'),
  editor: z.string().optional(),
  defaultModel: z.string().optional(),
  apiKeys: z.record(z.string()).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional()
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;

// src/schemas/prompt-schema.ts
export const PromptMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  inputs: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'select', 'multiselect', 'number', 'boolean', 'file']),
    description: z.string().optional(),
    required: z.boolean().default(true),
    default: z.any().optional(),
    options: z.array(z.string()).optional(),
    validation: z.string().optional()
  })).optional()
});

export type PromptMetadata = z.infer<typeof PromptMetadataSchema>;
```

### Logging Configuration Example

```typescript
// src/services/logging-service.ts
import pino from 'pino';
import { Config } from '../types/config';

export function createLogger(config: Config): pino.Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;

  return pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard'
      }
    } : undefined,
    redact: {
      paths: [
        'apiKeys.*',
        '*.password',
        '*.secret',
        '*.token',
        '*.credential'
      ],
      censor: '***'
    },
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    }
  });
}

// Usage in commands
export function enhanceWithLogging<T extends BaseCommand<any, any>>(
  CommandClass: new (...args: any[]) => T
): new (...args: any[]) => T {
  return class extends CommandClass {
    async execute() {
      const start = Date.now();
      try {
        const result = await super.execute();
        const duration = Date.now() - start;
        this.context.logger.info({ duration }, 'Command completed');
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.context.logger.error({ error, duration }, 'Command failed');
        throw error;
      }
    }
  };
}
```

## Conclusion

This implementation plan provides a structured approach to addressing all issues identified in the code review. By following test-driven development and implementing changes in phases, we ensure that the codebase remains functional throughout the refactoring process while significantly improving maintainability and reducing duplication.

Each phase delivers concrete value and can be verified independently, making it easy to track progress and ensure quality. The extensive code examples provide clear implementation guidance while maintaining flexibility for adjustments during development.