# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PUPT (Powerful Universal Prompt Tool) is a CLI tool for managing and using AI prompts with template support. It's designed to be your faithful prompt companion, enabling efficient prompt management, template processing, and execution tracking.

## Building, Testing, and Development Commands

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Development mode (watch for changes)
npm run dev

# Run tests with vitest
npm test

# Run tests in verbose mode
npm run test:verbose

# Run tests for CI (no coverage, pass with no tests)
npm run test:ci

# Run tests with UI interface
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run a single test file
npm test test/commands/add.test.ts

# Run tests matching a pattern
npm test -- -t "pattern"

# Lint the codebase
npm run lint

# Format code with prettier
npm run format

# Run full check (lint + build + test:coverage)
npm run check

# Documentation commands
npm run docs:dev     # Start documentation dev server
npm run docs:build   # Build documentation
npm run docs:preview # Preview built documentation on port 9010
```

## Using pt Commands

```bash
# Initialize pt in a directory
pt init

# Run a prompt interactively (will prompt for input)
pt run <prompt-name>

# Run a prompt without user input (using defaults or pre-filled values)
pt run <prompt-name> --no-input

# Run a prompt with specific variable values
pt run <prompt-name> --var key=value --var another=value

# Run a prompt and save output to file
pt run <prompt-name> --output result.txt

# Search for prompts
pt run                           # Interactive search
pt run test                      # Search for prompts containing "test"

# View execution history (filtered by current git directory by default)
pt history                       # Show recent executions for current directory
pt history --limit 20           # Show last 20 executions
pt history --all-dir            # Show executions from all directories
pt history -d /path/to/.git     # Filter by specific git directory
pt history --prompt <name>      # Filter by prompt name

# View history with annotations
pt history --annotations        # Include user and auto-annotations
pt history --annotations --verbose  # Show full annotation details

# View history with captured output
pt history --output             # Show output file paths
pt history --output --content   # Display actual output content

# Find specific history entries
pt history --id <history-id>    # Show specific execution
pt history --search "error"     # Search in history metadata
pt history --failed             # Show only failed executions
pt history --success            # Show only successful executions

# Access history files directly
# History files are stored in ~/.pt-history/ as JSON files
# Named: YYYY-MM-DD-HH-mm-ss-SSS-<prompt-name>.json
ls ~/.pt-history/               # List all history files
cat ~/.pt-history/2024-*.json   # View specific history entries

# Add annotations to history
pt annotate <history-id>        # Add annotation to specific execution
pt annotate --last              # Annotate the last execution
pt annotate --category "bug-fix" --notes "Fixed parsing issue"

# Review prompt usage patterns
pt review                       # Analyze all history
pt review --days 30            # Analyze last 30 days
pt review --prompt <name>      # Review specific prompt usage
pt review --output review.json # Save review as JSON
pt review --format markdown    # Generate markdown report

# Managing prompts
pt add <name> <path>           # Add a new prompt file
pt edit <name>                 # Edit existing prompt
pt list                        # List all available prompts
pt install <git-url>           # Install prompts from git repo

# Debugging and development helpers
pt run <prompt> --dry-run      # Show processed template without executing
pt run <prompt> --verbose      # Show detailed execution information
pt history --raw               # Show raw JSON history data
pt config                      # Show current configuration
pt help <command>              # Get detailed help for any command

# Common flags for debugging
--config <path>                # Use specific config file
--no-history                   # Don't save execution to history
--no-auto-annotate            # Disable automatic annotation
--debug                       # Enable debug logging
```

### Key Features for Development

1. **Running prompts without interaction**: Use `--no-input` flag or provide variables via `--var` flags
2. **History inspection**: Access full execution context including environment, timing, and output
3. **Output capture**: All command outputs are saved in `~/.pt-history/outputs/` with both JSON metadata and raw text
4. **Auto-annotation**: Automatically detects success/failure patterns in output
5. **Review system**: Analyzes usage patterns to identify improvement opportunities

### History File Structure

Each history entry contains:
- Prompt metadata and variables used
- Environment info (git status, OS, working directory)
- Execution metrics (duration, exit code, active time)
- Output references (links to captured output files)
- Annotations (both user-added and auto-generated)
- Masked sensitive values for security

## High-Level Architecture

This is a CLI tool for managing AI prompts with template support, built with TypeScript and using an ESM module system.

### Core Components

1. **CLI Layer** (`src/cli.ts`): The main entry point using Commander.js. Defines all commands (init, add, edit, run, history, annotate, install, review, help).

2. **Configuration System** (`src/config/`):
   - `ConfigManager`: Loads and merges configuration from multiple sources using cosmiconfig
   - `migration.ts`: Handles version migrations between config formats
   - Supports `.pt-config.json`, `.pt-config.yaml`, and `.pt-config.js` files
   - Configuration schema validation with Zod

3. **Prompt Management** (`src/prompts/`):
   - `PromptManager`: Discovers and loads prompt files from configured directories
   - Supports custom input types (file selection, review file, file search)
   - Prompts are markdown files with optional YAML frontmatter
   - Schema validation for prompt metadata

4. **Template Engine** (`src/template/`):
   - `TemplateEngine`: Processes Handlebars templates with custom helpers
   - `TemplateContext`: Manages variable storage and masking sensitive values
   - Supports static helpers (date, time, uuid, etc.) and interactive helpers (input, select, etc.)
   - Custom helper registration system

5. **Search System** (`src/search/`, `src/ui/`):
   - `SearchEngine`: Uses MiniSearch for fuzzy searching through prompts
   - `FileSearchEngine`: Specialized search for file patterns within projects
   - `InteractiveSearch`: Provides interactive prompt selection UI using Inquirer

6. **History Management** (`src/history/`):
   - `EnhancedHistoryManager`: Saves executed prompts with rich metadata
   - Tracks environment info (git status, OS, shell, working directory)
   - Execution metrics (duration, exit code, active time, user input count)
   - Masks sensitive values (passwords, API keys) in history
   - Supports annotations for categorizing and reviewing executions

7. **Output Capture** (`src/services/output-capture-service.ts`):
   - Captures command output using PTY (pseudo-terminal) for accurate representation
   - Tracks user input/output interactions with timestamps
   - Calculates active execution time (excluding user input wait time)
   - Saves output in both JSON and plain text formats
   - Key indicators extraction (errors, test failures, completion claims)

8. **Review System** (`src/commands/review.ts`, `src/services/review-data-builder.ts`):
   - Analyzes prompt usage patterns across history
   - Detects patterns: verification gaps, incomplete tasks, environment-specific issues
   - Generates improvement suggestions based on execution data
   - Supports JSON and Markdown output formats

9. **Auto-annotation** (`src/services/auto-annotation-service.ts`):
   - Automatic analysis of command executions
   - Detects success/failure patterns from output
   - Identifies issues like test failures, build errors, incomplete tasks
   - Adds structured annotations to history entries

10. **Command Implementations** (`src/commands/`):
    - Each command has its own module with focused responsibility
    - Commands handle user interaction and coordinate between services
    - Comprehensive error handling with helpful suggestions

### Key Design Patterns

- **Modular Architecture**: Each major feature is isolated in its own module
- **Service Layer Pattern**: Business logic separated from command implementations
- **Configuration Cascading**: Configs merge from multiple sources with precedence
- **Template Processing Pipeline**: Content → Parse frontmatter → Process templates → Collect inputs → Generate output
- **Error Handling**: Custom error types with context-aware suggestions in `src/utils/errors.ts`
- **Cross-Platform Support**: Platform-specific logic abstracted in `src/utils/platform.ts`

### Recent Enhancements

1. **Output Capture System**: New comprehensive output capture using PTY for accurate terminal interaction recording
2. **Enhanced History**: Rich metadata including environment, execution metrics, and output references
3. **Review Command**: Analyze prompt usage patterns and generate improvement suggestions
4. **Auto-annotation**: Automatic analysis of command outputs to detect success/failure
5. **Active Time Tracking**: Distinguishes between actual execution time and user input wait time

### Testing Strategy

- Uses Vitest for all testing with fork pool for isolation
- Tests organized to mirror src structure
- Integration tests in `test/integration/` for end-to-end flows
- Regression tests in `test/regression/` for specific bug fixes
- Extensive use of temporary directories for file system operations
- Mock implementations for interactive prompts and external commands
- Claude mock system for testing AI tool integration
- Coverage thresholds: 80% for statements, branches, functions, and lines

### Important Implementation Notes

- All paths support `~` expansion for home directory
- File system operations use fs-extra for consistency
- Interactive UI built with Inquirer.js components
- Git repository installations supported via simple-git
- History entries are timestamped JSON files with masked sensitive data
- PTY usage for accurate terminal output capture (Linux/macOS)
- Fallback to standard process spawning on Windows
- Security: Automatic masking of passwords, API keys, and tokens in history

### Key Types and Interfaces

- `EnhancedHistoryEntry`: Extended history with environment and execution details
- `ReviewData`: Comprehensive analysis data for prompt usage
- `CapturedOutput`: Metadata about captured command outputs
- `DetectedPattern`: Patterns found in prompt executions
- `ParsedAnnotation`: User and auto-generated annotations

## Claude Coding Guidelines

- If you need a simple prompt without any user input create a simple prompt, don't randomly run existing prompts
- When implementing new features, follow the existing service layer pattern
- Ensure all new commands have comprehensive tests
- Use the existing error handling patterns for consistency
- Always validate user input using the established schemas
- Consider cross-platform compatibility for all file system operations

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.