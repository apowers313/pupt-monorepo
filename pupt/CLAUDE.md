# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Building, Testing, and Development Commands

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Run tests with vitest
npm test

# Run tests with UI interface
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run a single test file
npm test test/commands/add.test.ts

# Run tests matching a pattern
npm test -- -t "pattern"

# Lint the codebase
npm run lint

# Format code with prettier
npm run format

# Watch mode for development
npm run dev
```

## High-Level Architecture

This is a CLI tool for managing AI prompts with template support, built with TypeScript and using an ESM module system.

### Core Components

1. **CLI Layer** (`src/cli.ts`): The main entry point using Commander.js. Defines all commands (init, add, edit, run, history, annotate, install, example).

2. **Configuration System** (`src/config/`):
   - `ConfigManager`: Loads and merges configuration from multiple sources using cosmiconfig
   - `migration.ts`: Handles version migrations between config formats
   - Supports `.pt-config.json`, `.pt-config.yaml`, and `.pt-config.js` files

3. **Prompt Management** (`src/prompts/`):
   - `PromptManager`: Discovers and loads prompt files from configured directories
   - Supports custom input types (file selection, review file)
   - Prompts are markdown files with optional YAML frontmatter

4. **Template Engine** (`src/template/`):
   - `TemplateEngine`: Processes Handlebars templates with custom helpers
   - `TemplateContext`: Manages variable storage and masking sensitive values
   - Supports static helpers (date, time, uuid, etc.) and interactive helpers (input, select, etc.)

5. **Search System** (`src/search/`, `src/ui/`):
   - `SearchEngine`: Uses MiniSearch for fuzzy searching through prompts
   - `InteractiveSearch`: Provides interactive prompt selection UI using Inquirer

6. **History Management** (`src/history/`):
   - `HistoryManager`: Saves executed prompts with metadata and supports annotations
   - Masks sensitive values (passwords, API keys) in history

7. **Command Implementations** (`src/commands/`):
   - Each command has its own module (init, add, edit, run, history, annotate, install)
   - Commands handle user interaction and coordinate between other components

### Key Design Patterns

- **Modular Architecture**: Each major feature is isolated in its own module
- **Configuration Cascading**: Configs merge from multiple sources with precedence
- **Template Processing Pipeline**: Content → Parse frontmatter → Process templates → Collect inputs → Generate output
- **Error Handling**: Custom error types with helpful suggestions in `src/utils/errors.ts`
- **Cross-Platform Support**: Platform-specific logic abstracted in `src/utils/platform.ts`

### Testing Strategy

- Uses Vitest for all testing
- Tests organized to mirror src structure
- Integration tests in `test/integration/` for end-to-end flows
- Extensive use of temporary directories for file system operations
- Mock implementations for interactive prompts

### Important Implementation Notes

- All paths support `~` expansion for home directory
- File system operations use fs-extra for consistency
- Interactive UI built with Inquirer.js components
- Git repository installations supported via simple-git
- History entries are timestamped JSON files with masked sensitive data