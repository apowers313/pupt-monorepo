# Development

This guide covers how to contribute to PUPT development or build it from source.

## Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- Git

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/apowers313/pupt.git
cd pupt
```

### Install Dependencies

```bash
npm install
```

## Development Commands

### Building

```bash
# Build the TypeScript project
npm run build

# Watch mode for development
npm run dev
```

### Testing

PUPT uses Vitest for testing with comprehensive coverage:

```bash
# Run all tests
npm test

# Run tests with verbose output
npm run test:verbose

# Run tests in watch mode
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

#### Running Specific Tests

```bash
# Run a single test file
npm test test/commands/add.test.ts

# Run tests matching a pattern
npm test -- -t "pattern"

# Run tests for a specific component
npm test -- test/template/
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code with prettier
npm run format

# Run all checks (lint, build, test with coverage)
npm run check
```

### Running Locally

After building, you can run PUPT locally:

```bash
# Run the CLI directly
node dist/cli.js

# Or use npm link for global access
npm link
pt --version
```

## Project Structure

```
pupt/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── commands/          # Command implementations
│   ├── config/            # Configuration management
│   ├── history/           # History tracking
│   ├── prompts/           # Prompt management
│   ├── search/            # Search functionality
│   ├── template/          # Template engine
│   ├── ui/                # User interface components
│   └── utils/             # Utility functions
├── test/                   # Test files
│   ├── commands/          # Command tests
│   ├── integration/       # Integration tests
│   └── fixtures/          # Test fixtures
├── docs/                   # Documentation
├── prompts/               # Example prompts
└── dist/                  # Compiled output
```

## Architecture

### Core Components

1. **CLI Layer** (`src/cli.ts`)
   - Uses Commander.js for command parsing
   - Handles global options and command routing

2. **Configuration System** (`src/config/`)
   - `ConfigManager`: Loads and merges configurations
   - Supports multiple file formats

3. **Prompt Management** (`src/prompts/`)
   - `PromptManager`: Discovers and loads prompts
   - Handles frontmatter parsing
   - Manages prompt metadata

4. **Template Engine** (`src/template/`)
   - `TemplateEngine`: Processes Handlebars templates
   - `TemplateContext`: Manages variables
   - Custom helpers for user input

5. **Search System** (`src/search/`)
   - `SearchEngine`: Fuzzy search using MiniSearch
   - `InteractiveSearch`: UI for prompt selection

6. **History Management** (`src/history/`)
   - `HistoryManager`: Saves execution history
   - Masks sensitive values
   - Supports annotations

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock external dependencies
- Focus on edge cases and error conditions

### Integration Tests
- Test complete workflows
- Use temporary directories for file operations
- Verify component interactions

### E2E Tests
- Test CLI commands end-to-end
- Simulate user interactions
- Verify output and side effects

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **Make your changes**
   - Write tests for new functionality
   - Update documentation as needed
   - Follow existing code style

4. **Run tests and checks**
   ```bash
   npm run check
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/my-new-feature
   ```

### Commit Convention

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

### Code Style

- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier for formatting
- 100 character line limit

## Debugging

### VS Code Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["add"],
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Debug Logging

Enable debug logs:
```bash
PT_LOG_LEVEL=debug node dist/cli.js
```

### Memory Profiling

```bash
node --inspect dist/cli.js
# Open chrome://inspect in Chrome
```

## Release Process

1. **Update version**
   ```bash
   npm version patch|minor|major
   ```

2. **Run checks**
   ```bash
   npm run check
   ```

3. **Build and test**
   ```bash
   npm run build
   npm test
   ```

4. **Publish**
   ```bash
   npm publish
   ```

5. **Create GitHub release**
   - Tag the version
   - Add release notes
   - Upload artifacts if needed