  [![Build Status](https://github.com/apowers313/prompt-tool/workflows/CI/badge.svg)](https://github.com/apowers313/prompt-tool/actions)
  [![npm version](https://badge.fury.io/js/pupt.svg)](https://www.npmjs.com/package/pupt)
  [![Coverage Status](https://coveralls.io/repos/github/apowers313/prompt-tool/badge.svg?branch=master)](https://coveralls.io/github/apowers313/prompt-tool?branch=master)

# PUPT (Powerful Universal Prompt Tool)
A powerful CLI tool for managing and using AI prompts with template support, designed to be your faithful prompt companion.

<div align="center">
  <img src="./assets/pupt.png" alt="PUPT Logo" width="200">
  
  # PUPT
  **Your Faithful Prompt Companion**
</div>


## Features

- ✏️ **Prompt Management** - Create, edit, and organize prompts easily
- 📝 **Template Support** - Use Handlebars templates with user input
- 🔍 **Interactive Search** - Quickly find prompts with fuzzy search
- 🔧 **Cross-platform** - Works on Windows, macOS, and Linux
- 🚀 **Tool Integration** - Run prompts with Claude Code, Amazon Q, or any command line tool
- 📊 **History Tracking** - Keep track of generated prompts and re-run them
- 📊 **Output Capture** - Capture and save command outputs (configurable)
- 🏷️ **Annotations** - Add notes and tags to your prompt history
- 🤖 **Auto-annotation** - Automatically analyze and annotate prompt executions
- 📋 **Review Command** - Analyze prompt usage patterns and generate improvement suggestions
- 📦 **Install Prompts** - Install and share prompts from git or npm

## Installation

```bash
npm install -g pupt
```

## Quick Start

1. Initialize your configuration:

```bash
pt init
```

2. Create your first prompt:

```bash
pt add
```

3. Run the tool:

```bash
pt
```

## Commands

### `pt`
Interactive prompt selection and generation. This is the default command that lets you:
- Search through all your prompts with fuzzy search
- Preview prompt content before selection
- Fill in template variables interactively
- View the generated result

### `pt help [command]`
Display detailed help information for a specific command.

### `pt init`
Initialize configuration interactively. Sets up:
- Prompt directories
- History tracking (optional)
- Annotation support (optional)
- Default coding tool configuration

### `pt add`
Create a new prompt interactively. Features:
- Guided prompt creation with metadata
- Automatic author detection from git
- Label/tag support
- Opens in your editor automatically

### `pt edit`
Edit existing prompts in your configured editor. Features:
- Interactive prompt selection
- Automatic editor detection ($VISUAL or $EDITOR)
- Fallback to common editors if not configured

### `pt run [tool] [args...]`
Execute prompts with external tools. Set `defaultRunCmd` in
your config to automatically run your favorite tool.

Examples:
```bash
pt run                     # Use configured default tool
pt run claude              # Send prompt to Claude
pt run code -              # Open prompt in VS Code
pt run -h 3                # Re-run history entry #3
```

### `pt history [entry] [options]`
View prompt execution history or a specific entry.

### `pt annotate [history-number]`
Add notes to history entries. Features:
- Mark prompts as success/failure/partial
- Write detailed notes in your editor
- Multiple annotations per history entry

### `pt example`
Generate an example prompt file to help you get started.

### `pt install <source>`
Install prompts from external sources. Currently supports:
- Git repositories (GitHub, GitLab, etc.)
- Future: npm packages

Examples:
```bash
pt install https://github.com/user/prompts
pt install git@github.com:user/prompts.git
```

### `pt review [prompt-name] [options]`
Analyze prompt usage patterns and generate improvement suggestions.
Best used with AI tools to use your history and annotations to
improve the quality and performance of your prompts.

Examples:
```bash
pt review                      # Review all prompts from last 30 days
pt review api-client           # Review specific prompt
pt review -s 7d                # Review last 7 days
pt review -f json -o report.json # Save JSON report to file
```

## Prompt Files

### What is a Prompt File?

A prompt file is a markdown file that serves as a template for generating AI prompts. These files can contain:
- Static text that appears in every generated prompt
- Dynamic content using Handlebars template syntax
- Variable definitions that specify what inputs to collect from users
- Metadata to help organize and find prompts

Prompt files allow you to create reusable templates for common AI interactions, ensuring consistency and saving time.

### Prompt File Structure

```markdown
---
title: Your Prompt Title
labels: [tag1, tag2, tag3]
variables:
  - name: variableName
    type: input
    message: "What to ask the user"
    default: "Default value"
---

Your prompt content goes here with {{input "thing"}} automatic user input.
```

### Input Helpers

These helpers collect information from users interactively:

#### `{{input "name" "message"}}`
- **Purpose**: Collect text input
- **Parameters**: 
  - `name`: Variable name to store the value
  - `message` (optional): Prompt message
- **Example**: `{{input "projectName" "What is your project name?"}}`

#### `{{select "name" "message"}}`
- **Purpose**: Single choice selection
- **Parameters**: 
  - `name`: Variable name
  - `message` (optional): Prompt message
- **Note**: Choices come from variable definition
- **Example**: `{{select "language" "Choose a language:"}}`

#### `{{multiselect "name" "message"}}`
- **Purpose**: Multiple choice selection
- **Parameters**: Same as select
- **Returns**: Comma-separated values
- **Example**: `{{multiselect "features" "Select features:"}}`

#### `{{confirm "name" "message"}}`
- **Purpose**: Yes/no question
- **Parameters**: Same as input
- **Returns**: `true` or `false`
- **Example**: `{{confirm "useTypeScript" "Use TypeScript?"}}`

#### `{{editor "name" "message"}}`
- **Purpose**: Open text editor for multi-line input
- **Parameters**: Same as input
- **Example**: `{{editor "description" "Enter description:"}}`

#### `{{password "name" "message"}}`
- **Purpose**: Masked password input
- **Parameters**: Same as input
- **Note**: Values are masked in history
- **Example**: `{{password "apiKey" "Enter API key:"}}`

#### `{{file "name" "message"}}`
- **Purpose**: Interactive file selection with tab completion
- **Parameters**: Same as input
- **Features**: 
  - Tab completion for file paths
  - Support for ~ home directory expansion
  - Real-time file filtering
- **Example**: `{{file "sourceFile" "Select file to process:"}}`

#### `{{reviewFile "name" "message"}}`
- **Purpose**: Select a file for automatic review after execution
- **Parameters**: Same as file
- **Features**:
  - Same as file input
  - File will be reviewed after command execution
  - Useful for analyzing generated or modified files
- **Example**: `{{reviewFile "outputFile" "Select file to review:"}}`


### Frontmatter Properties

The frontmatter section (between `---` markers) is optional and uses YAML format. Available properties:

#### `title` (string)
- **Purpose**: Display name for the prompt in the search interface
- **Default**: Filename without extension
- **Example**: `title: "API Documentation Generator"`

#### `labels` (array of strings)
- **Purpose**: Tags for categorizing and searching prompts
- **Default**: Empty array
- **Example**: `labels: [api, documentation, typescript]`

#### `variables` (array of objects)
- **Purpose**: Optionally define user inputs required by the template
- **Default**: Empty array
- **Structure**: Each variable can have these properties:
  - `name` (required): Variable identifier used in template
  - `type`: Input type (`input`, `select`, `multiselect`, `confirm`, `editor`, `password`, `file`, `reviewFile`)
  - `message`: Question to ask the user
  - `default`: Default value
  - `choices`: Array of options (for `select` and `multiselect` types)
  - `validate`: Regex pattern for validation (as string)
  - `basePath`: Base directory for file selection (for `file` and `reviewFile` types)
  - `filter`: File pattern filter (for `file` and `reviewFile` types)
  - `autoReview`: Auto-review the selected file after execution (for `reviewFile` type)

### Complete Example Prompt File

```markdown
---
title: REST API Client Generator
labels: [api, client, typescript, generator]
variables:
  - name: serviceName
    type: input
    message: "What is the name of your API service?"
    default: "MyAPI"
    validate: "^[A-Za-z][A-Za-z0-9]*$"
  
  - name: baseUrl
    type: input
    message: "What is the base URL?"
    default: "https://api.example.com"
  
  - name: authType
    type: select
    message: "Choose authentication type:"
    choices: ["none", "api-key", "bearer-token", "basic-auth"]
  
  - name: methods
    type: multiselect
    message: "Which HTTP methods will you use?"
    choices: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  
  - name: includeTests
    type: confirm
    message: "Generate test files?"
    default: true
---

# {{serviceName}} API Client

Generate a TypeScript API client for {{serviceName}}.

## Configuration
- Base URL: {{baseUrl}}
- Authentication: {{authType}}
- Methods: {{methods}}

## Implementation Requirements

Create a fully typed TypeScript client with:
1. Type-safe request/response handling
2. Error handling with custom error classes
3. Retry logic with exponential backoff
4. Request/response interceptors
{{#if includeTests}}
5. Comprehensive test suite using Jest
6. Mock server for testing
{{/if}}

## Code Structure

```typescript
export class {{serviceName}}Client {
  private baseUrl = '{{baseUrl}}';
  
  constructor(private auth: AuthConfig) {}
  
  // Implement methods for: {{methods}}
}
```

Generated on {{date}} at {{time}} by {{username}}
```

## Template Helpers

### Static Helpers

These helpers provide system information and are evaluated when the prompt is generated:

#### `{{date}}`
- **Returns**: Current date in local format (e.g., "3/15/2024")
- **Example**: `Generated on {{date}}`

#### `{{time}}`
- **Returns**: Current time in local format (e.g., "2:30:45 PM")
- **Example**: `Created at {{time}}`

#### `{{datetime}}`
- **Returns**: Current date and time in local format
- **Example**: `Timestamp: {{datetime}}`

#### `{{timestamp}}`
- **Returns**: Unix timestamp in milliseconds
- **Example**: `Build: {{timestamp}}`

#### `{{uuid}}`
- **Returns**: A new UUID v4
- **Example**: `Request ID: {{uuid}}`

#### `{{username}}`
- **Returns**: Current system username
- **Example**: `Author: {{username}}`

#### `{{hostname}}`
- **Returns**: Machine hostname
- **Example**: `Generated on {{hostname}}`

#### `{{cwd}}`
- **Returns**: Current working directory path
- **Example**: `Project path: {{cwd}}`

### Variable Substitution

Once a variable is defined (either through frontmatter or input helpers), it can be referenced anywhere in the template:

```markdown
Project: {{projectName}}
Path: /src/{{projectName}}/index.ts
Welcome to {{projectName}}!
```

Variables are cached, so asking for the same variable multiple times will reuse the first value.

## Configuration File

### Overview

The configuration file (`.pt-config.json`, `.pt-config.yaml`, or `.pt-config.js`) controls how the prompt tool behaves. The tool searches for configuration files in:
1. Current directory and all parent directories
2. Your home directory
3. Platform-specific config directories

Multiple config files are merged, with closer files taking precedence.

### Configuration Format

```json
{
  "promptDirs": ["./.prompts", "~/my-prompts"],
  "historyDir": "~/.pt/history",
  "annotationDir": "~/.pt/history",
  "defaultCmd": "claude",
  "defaultCmdArgs": ["--model", "claude-3"],
  "defaultCmdOptions": {
    "Continue with context?": "--continue",
    "Use verbose output?": "--verbose"
  },
  "autoRun": false,
  "autoReview": false,
  "gitPromptDir": "~/.pt/git-prompts",
  "outputCapture": {
    "enabled": false,
    "directory": "~/.pt/outputs",
    "maxSizeMB": 10,
    "retentionDays": 30
  },
  "autoAnnotate": {
    "enabled": false,
    "triggers": ["error", "warning"],
    "analysisPrompt": "Analyze this execution...",
    "fallbackRules": []
  },
  "handlebarsExtensions": [],
  "helpers": {
    "header": {
      "type": "inline",
      "value": "Generated by {{username}} on {{date}}"
    },
    "footer": {
      "type": "file",
      "path": "~/.pt/partials/footer.md"
    }
  },
  "logLevel": "info",
  "version": "3.0.0"
}
```

Note: The `codingTool`, `codingToolArgs`, and `codingToolOptions` fields are deprecated. Use `defaultCmd`, `defaultCmdArgs`, and `defaultCmdOptions` instead. The old fields are still supported for backward compatibility.

### Configuration Fields

#### `promptDirs` (array of strings)
- **Purpose**: Directories to search for prompt files
- **Default**: `["./.prompts"]`
- **Notes**: 
  - Searches recursively for `.md` files
  - Supports `~` for home directory
  - Relative paths are resolved from config file location
- **Example**: `["./.prompts", "~/global-prompts", "/usr/share/pt/prompts"]`

#### `historyDir` (string, optional)
- **Purpose**: Directory to save generated prompts history
- **Default**: None (history disabled)
- **Notes**: 
  - Creates timestamped files with metadata
  - Sensitive values (passwords, API keys) are automatically masked
  - Supports `~` for home directory
- **Example**: `"~/.pt/history"`

#### `annotationDir` (string, optional)
- **Purpose**: Directory to save annotations for history entries
- **Default**: None (annotations disabled)
- **Notes**: 
  - Requires history to be enabled
  - Stores notes, tags, and success/failure status
  - Supports `~` for home directory
- **Example**: `"~/.pt/history"`

#### `defaultCmd` (string, optional)
- **Purpose**: Default command to use with `pt run`
- **Default**: `"claude"`
- **Notes**: 
  - Can be any command-line tool that accepts stdin
  - Override with `pt run <tool>`
- **Example**: `"claude"`, `"gpt"`, `"code -"`

#### `defaultCmdArgs` (array of strings, optional)
- **Purpose**: Default arguments for the default command
- **Default**: `[]`
- **Notes**: 
  - Always passed to the tool
  - Additional args can be added with `pt run -- <args>`
- **Example**: `["--model", "claude-3-opus"]`

#### `defaultCmdOptions` (object, optional)
- **Purpose**: Interactive options to prompt for when running
- **Default**: `{ "Continue with last context?": "--continue" }`
- **Structure**: Object where keys are questions and values are arguments
- **Notes**: 
  - User is prompted for each option
  - Arguments added only if user answers "yes"
- **Example**:
```json
{
  "Continue with context?": "--continue",
  "Use verbose output?": "--verbose",
  "Enable debug mode?": "--debug"
}
```

#### `autoRun` (boolean, optional)
- **Purpose**: Automatically execute prompts with the default command after generation
- **Default**: `false`
- **Notes**: 
  - Requires `defaultCmd` to be configured
  - Saves execution history automatically
- **Example**: `true`

#### `autoReview` (boolean, optional)
- **Purpose**: Automatically review files selected with `reviewFile` input type
- **Default**: `false`
- **Notes**: 
  - Reviews happen after command execution
  - Works with the review command functionality
- **Example**: `true`

#### `gitPromptDir` (string, optional)
- **Purpose**: Directory to store prompts installed from git repositories
- **Default**: None
- **Notes**: 
  - Used by `pt install` command
  - Supports `~` for home directory
- **Example**: `"~/.pt/git-prompts"`

#### `outputCapture` (object, optional)
- **Purpose**: Configure automatic output capture for command executions
- **Default**: Disabled
- **Structure**:
  - `enabled`: Whether to capture outputs (boolean)
  - `directory`: Where to save captured outputs (string)
  - `maxSizeMB`: Maximum size per capture file in MB (number)
  - `retentionDays`: How long to keep captures (number)
- **Example**:
```json
{
  "enabled": true,
  "directory": "~/.pt/outputs",
  "maxSizeMB": 10,
  "retentionDays": 30
}
```

#### `autoAnnotate` (object, optional)
- **Purpose**: Configure automatic annotation of prompt executions
- **Default**: Disabled
- **Structure**:
  - `enabled`: Whether to auto-annotate (boolean)
  - `triggers`: Events that trigger annotation (array)
  - `analysisPrompt`: Prompt for AI analysis (string)
  - `fallbackRules`: Pattern-based rules (array)
- **Example**:
```json
{
  "enabled": true,
  "triggers": ["error", "warning"],
  "analysisPrompt": "Analyze this execution and identify issues",
  "fallbackRules": []
}
```

#### `handlebarsExtensions` (array, optional)
- **Purpose**: Custom Handlebars template extensions
- **Default**: `[]`
- **Structure**: Array of extension configurations
- **Notes**: Advanced feature for extending template functionality

#### `helpers` (object, optional)
- **Purpose**: Define reusable template fragments
- **Default**: None
- **Structure**: Object where keys are partial names and values define the partial:
  - `type`: Either "inline" or "file"
  - `value`: Template content (for inline type)
  - `path`: Path to file (for file type)
- **Usage**: Reference in templates with `{{> partialName}}`
- **Example**:
```json
{
  "partials": {
    "copyright": {
      "type": "inline",
      "value": "Copyright (c) {{year}} {{company}}"
    },
    "header": {
      "type": "file",
      "path": "~/.pt/partials/header.md"
    }
  }
}
```

#### `logLevel` (string, optional)
- **Purpose**: Set the logging verbosity level
- **Default**: `"info"`
- **Options**: `"trace"`, `"debug"`, `"info"`, `"warn"`, `"error"`, `"fatal"`
- **Example**: `"debug"`

#### `version` (string, optional)
- **Purpose**: Configuration schema version for migration support
- **Default**: Current version
- **Format**: Semantic version (e.g., "3.0.0")  
- **Notes**: Automatically updated during migrations

### Configuration Examples

#### Minimal Configuration
```json
{
  "promptDirs": ["./.prompts"]
}
```

#### Development Team Configuration
```json
{
  "promptDirs": [
    "./.prompts",
    "~/team-prompts",
    "/shared/company-prompts"
  ],
  "historyDir": "~/.pt/history",
  "annotationDir": "~/.pt/history",
  "defaultCmd": "claude",
  "defaultCmdArgs": ["--model", "claude-3-opus"],
  "defaultCmdOptions": {
    "Continue with context?": "--continue",
    "Use company guidelines?": "--guidelines=/shared/guidelines.md"
  },
  "autoRun": true,
  "gitPromptDir": "~/.pt/git-prompts",
  "helpers": {
    "companyHeader": {
      "type": "inline",
      "value": "/* Company Confidential - {{date}} */"
    }
  },
  "version": "3.0.0"
}
```

#### Personal Configuration
```yaml
promptDirs:
  - ~/my-prompts
  - ~/work-prompts
  - ~/personal-prompts
historyDir: ~/.pt/history
annotationDir: ~/.pt/annotations
defaultCmd: gpt
defaultCmdArgs:
  - --temperature
  - "0.7"
autoReview: true
outputCapture:
  enabled: true
  directory: ~/.pt/outputs
  maxSizeMB: 5
  retentionDays: 7
version: "3.0.0"
```

#### Minimal Configuration with History
```json
{
  "promptDirs": ["./.prompts"],
  "historyDir": "./.pthistory",
  "version": "3.0.0"
}
```

#### Advanced Configuration with Auto-features
```json
{
  "promptDirs": ["./.prompts", "~/shared-prompts"],
  "historyDir": "~/.pt/history",
  "annotationDir": "~/.pt/history",
  "defaultCmd": "claude",
  "defaultCmdArgs": ["--model", "claude-3-opus"],
  "autoRun": true,
  "autoReview": true,
  "outputCapture": {
    "enabled": true,
    "directory": "~/.pt/outputs",
    "maxSizeMB": 10,
    "retentionDays": 30
  },
  "autoAnnotate": {
    "enabled": true,
    "triggers": ["error", "warning", "failure"],
    "analysisPrompt": "Analyze this prompt execution and identify any issues or improvements",
    "fallbackRules": [
      {
        "pattern": "error|failed|exception",
        "category": "verification_gap",
        "severity": "high"
      }
    ]
  },
  "logLevel": "debug",
  "version": "3.0.0"
}
```

## Development

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Run tests with verbose output
npm run test:verbose

# Run tests in watch mode
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Format code with prettier
npm run format

# Run all checks (lint, build, test with coverage)
npm run check

# Run locally
node dist/cli.js
```

### Testing

The project uses Vitest for testing with comprehensive test coverage including:
- Unit tests for all components
- Integration tests for end-to-end flows
- E2E tests for CLI commands
- Regression tests for bug fixes

Run specific test files:
```bash
npm test test/commands/add.test.ts
```

Run tests matching a pattern:
```bash
npm test -- -t "pattern"
```

## Troubleshooting

### Common Issues

#### No prompts found
- Ensure your `promptDirs` configuration points to directories containing `.md` files
- Check that the directories exist and have proper permissions
- Run `pt init` to set up the configuration

#### Command not found after installation
- Ensure npm's global bin directory is in your PATH
- Try running with `npx pt` instead
- Reinstall with `npm install -g pupt`

#### File input not working properly
- File paths support `~` expansion for home directory
- Use Tab key for autocompletion
- Ensure the base path exists

#### History not being saved
- Check that `historyDir` is configured
- Ensure the directory has write permissions
- Verify disk space is available

## Repository

- **GitHub**: [https://github.com/apowers313/prompt-tool](https://github.com/apowers313/prompt-tool)
- **Issues**: [https://github.com/apowers313/prompt-tool/issues](https://github.com/apowers313/prompt-tool/issues)
- **Author**: Adam Powers <apowers@ato.ms>

## License

MIT
