# Prompt Tool (pt)

A powerful CLI tool for managing and using AI prompts with template support.

## Features

- 🔍 **Interactive Search** - Quickly find prompts with fuzzy search
- 📝 **Template Support** - Use Handlebars templates with user input
- 📁 **Multi-directory Support** - Organize prompts across multiple directories
- 🔧 **Cross-platform** - Works on Windows, macOS, and Linux
- 📊 **History Tracking** - Keep track of generated prompts and re-run them
- 🎯 **Variable Definitions** - Define variables with types and validation
- 🚀 **External Tool Integration** - Run prompts with any command-line tool
- ✏️ **Prompt Management** - Create, edit, and organize prompts easily
- 🏷️ **Annotations** - Add notes and tags to your prompt history
- ⚡ **Enhanced Error Messages** - Helpful suggestions and clear guidance

## Installation

```bash
npm install -g cli-prompt-tool
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
Execute prompts with external tools. Examples:
```bash
pt run                     # Use configured default tool
pt run claude              # Send to Claude
pt run code -              # Open in VS Code
pt run cat                 # Output to terminal
pt run -- --continue       # Pass args to configured tool
pt run -h 3                # Re-run history entry #3
```

### `pt history [options]`
View prompt execution history. Options:
- `-l, --limit <number>` - Number of entries to show (default: 20)
- `-a, --all` - Show all history entries

### `pt annotate [history-number]`
Add notes to history entries. Features:
- Mark prompts as success/failure/partial
- Add searchable tags
- Write detailed notes in your editor
- Multiple annotations per history entry

### `pt example`
Generate an example prompt file to help you get started.

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

Your prompt content goes here with {{variableName}} substitution.
```

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
- **Purpose**: Define user inputs required by the template
- **Default**: Empty array
- **Structure**: Each variable can have these properties:
  - `name` (required): Variable identifier used in template
  - `type`: Input type (`input`, `select`, `multiselect`, `confirm`, `editor`, `password`)
  - `message`: Question to ask the user
  - `default`: Default value
  - `choices`: Array of options (for `select` and `multiselect` types)
  - `validate`: Regex pattern for validation (as string)

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
  "codingTool": "claude",
  "codingToolArgs": ["--model", "claude-3"],
  "codingToolOptions": {
    "Continue with context?": "--continue",
    "Use verbose output?": "--verbose"
  },
  "partials": {
    "header": {
      "type": "inline",
      "value": "Generated by {{username}} on {{date}}"
    },
    "footer": {
      "type": "file",
      "path": "~/.pt/partials/footer.md"
    }
  },
  "version": "2.0.0"
}
```

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

#### `codingTool` (string, optional)
- **Purpose**: Default tool to use with `pt run`
- **Default**: `"claude"`
- **Notes**: 
  - Can be any command-line tool that accepts stdin
  - Override with `pt run <tool>`
- **Example**: `"claude"`, `"gpt"`, `"code -"`

#### `codingToolArgs` (array of strings, optional)
- **Purpose**: Default arguments for the coding tool
- **Default**: `[]`
- **Notes**: 
  - Always passed to the tool
  - Additional args can be added with `pt run -- <args>`
- **Example**: `["--model", "claude-3-opus"]`

#### `codingToolOptions` (object, optional)
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

#### `partials` (object, optional)
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
  "codingTool": "claude",
  "codingToolArgs": ["--model", "claude-3-opus"],
  "codingToolOptions": {
    "Continue with context?": "--continue",
    "Use company guidelines?": "--guidelines=/shared/guidelines.md"
  },
  "partials": {
    "companyHeader": {
      "type": "inline",
      "value": "/* Company Confidential - {{date}} */"
    }
  },
  "version": "2.0.0"
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
codingTool: gpt
codingToolArgs:
  - --temperature
  - "0.7"
version: "2.0.0"
```

#### Minimal Configuration with History
```json
{
  "promptDirs": ["./.prompts"],
  "historyDir": "./.pthistory",
  "version": "2.0.0"
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Run locally
node dist/cli.js
```

## License

MIT