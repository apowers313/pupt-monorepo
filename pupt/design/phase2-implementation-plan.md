# Phase 2 Implementation Plan

## Overview

This implementation plan follows Test-Driven Development (TDD) principles. Each phase delivers working functionality that can be verified by users. Tests are written before implementation.

## Phase 1: Enhanced Configuration System

**Goal**: Extend configuration to support new features while maintaining backward compatibility.

### Steps:

1. **Test Configuration Schema Validation**
   - Write tests in `test/config/config-schema.test.ts`
   - Test new optional fields: `historyDir`, `annotationDir`, `codingTool`, `codingToolArgs`, `codingToolOptions`
   - Test backward compatibility - old configs without these fields should still work
   - Test validation rejects invalid field types
   - Test default values are applied when fields are missing

2. **Implement Config Schema Updates**
   - Update `src/types/config.ts` to add new optional fields to Config interface
   - Update `src/config/config-manager.ts` to apply defaults in the load() method
   - Add validation logic to ensure field types are correct
   - Preserve all existing functionality

3. **Test Configuration Migration**
   - Write tests for detecting old config versions
   - Test automatic migration adds new fields with defaults
   - Test existing settings are preserved during migration
   - Test version number is added/updated in config

4. **Implement Config Migration**
   - Add `version` field to config (current: "1.0.0", new: "2.0.0")
   - Create `migrateConfig()` method in ConfigManager
   - Call migration automatically during load()
   - Save migrated config back to disk

**Verification**: Run existing `pt` command - should work with both old and new config formats.

## Phase 2: `pt init` Command

**Goal**: Interactive configuration setup for new users.

### Steps:

1. **Test Init Command Registration**
   - Create `test/commands/init.test.ts`
   - Test command appears in help output
   - Test command can be invoked
   - Test --help flag shows init-specific help

2. **Test Directory Creation Logic**
   - Mock `fs-extra` methods
   - Test creates prompt directory at user-specified path
   - Test creates history directory when enabled
   - Test creates annotation directory when enabled
   - Test handles existing directories gracefully (no error)
   - Test handles permission errors with helpful message

3. **Test Interactive Prompts**
   - Mock `@inquirer/prompts` functions
   - Test prompt for directory location with default
   - Test history enable/disable flow
   - Test annotation enable/disable flow (only shown if history enabled)
   - Test all paths are resolved to absolute paths
   - Test home directory expansion (~/)

4. **Test Config File Generation**
   - Test creates .ptrc.json in current directory
   - Test config contains user selections
   - Test asks before overwriting existing config
   - Test generates valid JSON
   - Test sets appropriate file permissions

5. **Implement Init Command**
   - Create `src/commands/init.ts`
   - Add command registration in `src/cli.ts`
   - Implement interactive prompt flow using inquirer
   - Use fs-extra for directory creation
   - Generate and save config file
   - Show success summary with created paths

**Verification**: Run `pt init` and complete setup flow, verify config file and directories created.

## Phase 3: History Foundation

**Goal**: Implement history storage system needed by multiple commands.

### Steps:

1. **Test History Manager Core**
   - Enhance existing `test/history/history-manager.test.ts`
   - Test history filename format: `YYYYMMDD-HHMMSS-<random>.json`
   - Test HistoryEntry interface includes all required fields
   - Test savePrompt creates file in history directory
   - Test listHistory returns entries sorted by date (newest first)
   - Test getHistoryEntry retrieves by index (1-based)

2. **Implement History Manager Enhancement**
   - Update `src/history/history-manager.ts`
   - Add `listHistory()` method that reads all history files
   - Add `getHistoryEntry(index: number)` method
   - Implement efficient sorting using file timestamps
   - Add caching for performance with large histories

3. **Test History Integration**
   - Update main command tests
   - Test history is saved after successful prompt generation
   - Test history is not saved when disabled
   - Test history directory is created if missing
   - Test handles write errors gracefully

4. **Integrate History with Main Flow**
   - Modify `src/cli.ts` main action
   - Check if history is enabled in config
   - Save after successful template processing
   - Include all context: template, variables, result
   - Show subtle confirmation when saved

**Verification**: Run `pt` with history enabled, check history files are created in configured directory.

## Phase 4: `pt history` Command

**Goal**: View past prompt executions.

### Steps:

1. **Test History Command Registration**
   - Create `test/commands/history.test.ts`
   - Test command registration
   - Test error message when history not enabled
   - Test empty history message

2. **Test History Display Formatting**
   - Test entry format: `<number>. [<date> <time>] <title> - <first line>...`
   - Test prompt truncation at 60 characters
   - Test ellipsis added when truncated
   - Test handles prompts without titles
   - Test ANSI color codes in output

3. **Test History Pagination**
   - Test default shows last 20 entries
   - Test `--limit` flag changes count
   - Test `--all` flag shows everything
   - Test numbering is consistent

4. **Implement History Command**
   - Create `src/commands/history.ts`
   - Add command with options in `src/cli.ts`
   - Format entries with chalk for colors
   - Implement smart truncation preserving words
   - Show helpful message for empty history

**Verification**: Run `pt history` to see formatted list of past executions.

## Phase 5: `pt add` Command

**Goal**: Create new prompts with metadata.

### Steps:

1. **Test Add Command Registration**
   - Create `test/commands/add.test.ts`
   - Test command appears in help
   - Test runs without errors
   - Test requires configuration

2. **Test Git Integration**
   - Mock `child_process.execSync`
   - Test extracts git user.name and user.email
   - Test handles missing git gracefully
   - Test handles unconfigured git user
   - Test fallback to system username

3. **Test Filename Generation**
   - Test converts title to kebab-case
   - Test removes special characters
   - Test handles unicode properly
   - Test prevents overwriting existing files
   - Test adds number suffix for duplicates

4. **Test Prompt Creation**
   - Test generates correct frontmatter
   - Test includes all metadata fields
   - Test date format is YYYYMMDD
   - Test creates file in selected directory
   - Test handles write errors

5. **Implement Add Command**
   - Create `src/commands/add.ts`
   - Use inquirer for interactive prompts
   - Implement git author extraction with try/catch
   - Generate safe filenames with sanitization
   - Create markdown with YAML frontmatter
   - Option to open in editor immediately

**Verification**: Run `pt add`, create a new prompt, verify file created with correct metadata.

## Phase 6: `pt edit` Command

**Goal**: Edit existing prompts in user's editor.

### Steps:

1. **Test Edit Command Registration**
   - Create `test/commands/edit.test.ts`
   - Test command registration
   - Test help documentation

2. **Test Editor Detection**
   - Mock process.env
   - Test checks $VISUAL first
   - Test falls back to $EDITOR
   - Test OS-specific fallbacks
   - Test error when no editor found

3. **Test Editor Launching**
   - Mock `child_process.spawn`
   - Test spawns with correct arguments
   - Test inherits stdio for interactivity
   - Test waits for editor to close
   - Test handles editor exit codes

4. **Implement Edit Command**
   - Create `src/commands/edit.ts`
   - Reuse existing prompt selection UI
   - Implement editor detection function
   - Launch with proper stdio inheritance
   - Show success/error based on exit code

**Verification**: Run `pt edit`, select prompt, verify it opens in editor.

## Phase 7: `pt run` Command - Basic

**Goal**: Execute prompts with external tools.

### Steps:

1. **Test Run Command Registration**
   - Create `test/commands/run.test.ts`
   - Test command registration
   - Test help includes usage examples
   - Test `--` argument parsing

2. **Test Command Building**
   - Test combines tool + args + options
   - Test handles spaces in arguments
   - Test preserves argument order
   - Test `--` separates pt args from tool args

3. **Test Tool Execution**
   - Mock `child_process.spawn`
   - Test pipes prompt to stdin
   - Test inherits stdout/stderr
   - Test propagates exit code
   - Test handles missing tool error

4. **Implement Basic Run Command**
   - Create `src/commands/run.ts`
   - Parse command line arguments
   - Build command array
   - Spawn process with pipe stdin
   - Write prompt and close stdin
   - Exit with tool's exit code

**Verification**: Run `pt run` with a simple echo command as the tool.

## Phase 8: `pt run` Command - Advanced Features

**Goal**: Add options and history support to run command.

### Steps:

1. **Test Coding Tool Options**
   - Test reads options from config
   - Test prompts for each option
   - Test adds args for "yes" answers
   - Test skips args for "no" answers
   - Test preserves argument order

2. **Test History Flag**
   - Test `-h <number>` flag parsing
   - Test loads correct history entry
   - Test skips all prompts when using history
   - Test error for invalid history number
   - Test error when history disabled

3. **Implement Advanced Run Features**
   - Add option parsing to run command
   - Load history when -h flag present
   - Prompt for each configured option
   - Merge all arguments in correct order
   - Execute with final command

**Verification**: Run `pt run -h 1` to re-run from history, test option prompts.

## Phase 9: `pt annotate` Command

**Goal**: Add notes to historical prompt runs.

### Steps:

1. **Test Annotate Command Registration**
   - Create `test/commands/annotate.test.ts`
   - Test command registration
   - Test requires annotation directory
   - Test accepts optional history number

2. **Test Annotation File Creation**
   - Test filename: `<history-timestamp>-annotation-<uuid>.md`
   - Test creates valid YAML frontmatter
   - Test links to correct history file
   - Test includes timestamp
   - Test allows multiple annotations per history

3. **Test Annotation UI**
   - Test shows history list when no number given
   - Test prompts for status (success/failure/partial)
   - Test prompts for tags (comma-separated)
   - Test opens editor for notes
   - Test handles empty notes

4. **Implement Annotate Command**
   - Create `src/commands/annotate.ts`
   - Show history selection if needed
   - Collect annotation metadata
   - Open editor for detailed notes
   - Save annotation file with frontmatter
   - Show success with annotation path

**Verification**: Run `pt annotate`, add notes to a history entry, verify annotation file created.

## Phase 10: Polish and Integration

**Goal**: Refine user experience and ensure all features work together.

### Steps:

1. **Test Cross-Feature Integration**
   - Create `test/integration/full-flow.test.ts`
   - Test complete user journey
   - Test all commands with various configs
   - Test error recovery scenarios

2. **Add Progress Indicators**
   - Add ora spinner for long operations
   - Test spinner appears/disappears correctly
   - Add progress messages during operations
   - Test cancellation handling (Ctrl+C)

3. **Enhance Error Messages**
   - Create consistent error format
   - Add suggestions for common issues
   - Test all error paths have helpful messages
   - Include relevant documentation links

4. **Update Documentation**
   - Update README with new commands
   - Add examples for each command
   - Create troubleshooting guide
   - Document configuration options

**Verification**: Complete full workflow from init to annotate, all features working smoothly.

---

## Code Examples

### Config Interface Updates (`src/types/config.ts`)
```typescript
export interface Config {
  promptDirs: string[];
  historyDir?: string;
  annotationDir?: string;
  codingTool?: string;
  codingToolArgs?: string[];
  codingToolOptions?: Record<string, string>;
  version?: string;
}

export const DEFAULT_CONFIG: Partial<Config> = {
  codingTool: 'claude',
  codingToolArgs: [],
  codingToolOptions: {
    'Continue with last context?': '--continue'
  },
  version: '2.0.0'
};
```

### History Entry Interface (`src/types/history.ts`)
```typescript
export interface HistoryEntry {
  timestamp: string;
  templatePath: string;
  templateContent: string;
  variables: Record<string, unknown>;
  finalPrompt: string;
  title?: string;
}
```

### Init Command Structure (`src/commands/init.ts`)
```typescript
import { input, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function initCommand(): Promise<void> {
  // Check for existing config
  const configPath = path.join(process.cwd(), '.ptrc.json');
  if (await fs.pathExists(configPath)) {
    const overwrite = await confirm({
      message: 'Config file already exists. Overwrite?',
      default: false
    });
    if (!overwrite) return;
  }

  // Prompt for configuration
  const promptDir = await input({
    message: 'Where should prompts be stored?',
    default: './prompts'
  });

  const enableHistory = await confirm({
    message: 'Enable prompt history?',
    default: true
  });

  let historyDir: string | undefined;
  let annotationDir: string | undefined;

  if (enableHistory) {
    historyDir = await input({
      message: 'Where should history be stored?',
      default: './.pthistory'
    });

    const enableAnnotations = await confirm({
      message: 'Enable history annotations?',
      default: true
    });

    if (enableAnnotations) {
      annotationDir = await input({
        message: 'Where should annotations be stored?',
        default: './.pthistory'
      });
    }
  }

  // Create directories
  await fs.ensureDir(path.resolve(promptDir));
  if (historyDir) await fs.ensureDir(path.resolve(historyDir));
  if (annotationDir) await fs.ensureDir(path.resolve(annotationDir));

  // Generate config
  const config = {
    promptDirs: [promptDir],
    ...(historyDir && { historyDir }),
    ...(annotationDir && { annotationDir }),
    ...DEFAULT_CONFIG
  };

  // Save config
  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(chalk.green('✓ Configuration created successfully!'));
}
```

### Add Command Structure (`src/commands/add.ts`)
```typescript
import { execSync } from 'child_process';

function getGitAuthor(): string {
  try {
    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    return `${name} <${email}>`;
  } catch {
    return process.env.USER || 'Unknown';
  }
}

function generateFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
}

export async function addCommand(): Promise<void> {
  const config = await ConfigManager.load();
  
  // Select directory if multiple
  let targetDir = config.promptDirs[0];
  if (config.promptDirs.length > 1) {
    targetDir = await select({
      message: 'Select prompt directory:',
      choices: config.promptDirs.map(dir => ({ value: dir }))
    });
  }

  // Collect metadata
  const title = await input({
    message: 'Prompt title:',
    validate: (input) => input.length > 0 || 'Title is required'
  });

  const tags = await input({
    message: 'Tags (comma-separated, optional):'
  });

  // Generate content
  const author = getGitAuthor();
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const tagArray = tags ? tags.split(',').map(t => t.trim()) : [];

  const frontmatter = `---
title: ${title}
author: ${author}
creationDate: ${date}
tags: [${tagArray.join(', ')}]
---

`;

  // Save file
  const filename = generateFilename(title);
  const filepath = path.join(targetDir, filename);
  
  await fs.writeFile(filepath, frontmatter);
  console.log(chalk.green(`✓ Created ${filepath}`));
}
```

### Run Command Structure (`src/commands/run.ts`)
```typescript
export async function runCommand(options: RunOptions): Promise<void> {
  const config = await ConfigManager.load();
  let finalPrompt: string;
  
  if (options.history) {
    // Load from history
    const historyManager = new HistoryManager(config.historyDir!);
    const entry = await historyManager.getHistoryEntry(options.history);
    if (!entry) throw new Error(`History entry ${options.history} not found`);
    finalPrompt = entry.finalPrompt;
  } else {
    // Normal prompt flow
    finalPrompt = await processPromptInteractively();
  }

  // Build command
  const args = [...(config.codingToolArgs || [])];
  
  // Add optional arguments
  if (config.codingToolOptions && !options.history) {
    for (const [question, arg] of Object.entries(config.codingToolOptions)) {
      const add = await confirm({ message: question, default: false });
      if (add) args.push(arg);
    }
  }

  // Add user arguments after --
  if (options.toolArgs) {
    args.push(...options.toolArgs);
  }

  // Execute tool
  const tool = config.codingTool || 'claude';
  const child = spawn(tool, args, {
    stdio: ['pipe', 'inherit', 'inherit']
  });

  child.stdin.write(finalPrompt);
  child.stdin.end();

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
```

### History Display (`src/commands/history.ts`)
```typescript
function formatHistoryEntry(entry: HistoryEntry, index: number): string {
  const date = new Date(entry.timestamp);
  const dateStr = chalk.dim(`[${date.toLocaleDateString()} ${date.toLocaleTimeString()}]`);
  
  const title = entry.title || chalk.italic('Untitled');
  
  // Get first line of prompt
  const firstLine = entry.finalPrompt.split('\n')[0];
  const truncated = firstLine.length > 60 
    ? firstLine.substring(0, 57) + '...'
    : firstLine;
  
  return `${chalk.yellow(index.toString().padStart(3))}. ${dateStr} ${title} - ${truncated}`;
}
```

### Annotation Structure (`src/commands/annotate.ts`)
```typescript
interface AnnotationMetadata {
  historyFile: string;
  timestamp: string;
  status: 'success' | 'failure' | 'partial';
  tags: string[];
}

export async function annotateCommand(historyNumber?: number): Promise<void> {
  const config = await ConfigManager.load();
  if (!config.annotationDir) {
    throw new Error('Annotations not enabled. Run "pt init" to configure.');
  }

  // Select history entry
  const historyManager = new HistoryManager(config.historyDir!);
  const entry = historyNumber 
    ? await historyManager.getHistoryEntry(historyNumber)
    : await selectHistoryEntry(historyManager);

  // Collect annotation metadata
  const status = await select({
    message: 'How did this prompt work?',
    choices: [
      { value: 'success', name: '✓ Success' },
      { value: 'failure', name: '✗ Failure' },
      { value: 'partial', name: '~ Partial success' }
    ]
  });

  const tags = await input({
    message: 'Tags (comma-separated, optional):'
  });

  // Open editor for notes
  const notes = await editor({
    message: 'Add notes (press enter to open editor):'
  });

  // Save annotation
  const metadata: AnnotationMetadata = {
    historyFile: path.basename(entry.filename),
    timestamp: new Date().toISOString(),
    status,
    tags: tags ? tags.split(',').map(t => t.trim()) : []
  };

  const content = `---
${yaml.dump(metadata)}---

## Notes

${notes}
`;

  const filename = `${path.basename(entry.filename, '.json')}-annotation-${Date.now()}.md`;
  const filepath = path.join(config.annotationDir, filename);
  
  await fs.writeFile(filepath, content);
  console.log(chalk.green(`✓ Annotation saved to ${filepath}`));
}
```