# Prompt Tool (pt)

A powerful CLI tool for managing and using AI prompts with template support.

## Features

- 🔍 **Interactive Search** - Quickly find prompts with fuzzy search
- 📝 **Template Support** - Use Handlebars templates with user input
- 📁 **Multi-directory Support** - Organize prompts across multiple directories
- 🔧 **Cross-platform** - Works on Windows, macOS, and Linux
- 📊 **History Tracking** - Keep track of generated prompts
- 🎯 **Variable Definitions** - Define variables with types and validation

## Installation

```bash
npm install -g prompt-tool
```

## Quick Start

1. Create your first prompt:

```bash
pt example
```

2. Run the tool:

```bash
pt
```

## Usage

### Basic Usage

Simply run `pt` in your terminal to start the interactive prompt selector:

```bash
pt
```

### Creating Prompts

Prompts are markdown files with optional frontmatter:

```markdown
---
title: API Client Generator
labels: [api, typescript, client]
variables:
  - name: serviceName
    type: input
    message: "What is the name of your API service?"
    default: "MyAPI"
---

# {{serviceName}} API Client

Generate a TypeScript API client for {{serviceName}}.

Generated on {{date}} by {{username}}.
```

### Configuration

Create a `.ptrc.json` file in your project or home directory:

```json
{
  "promptDirs": ["./prompts", "~/global-prompts"],
  "historyDir": "~/.pt/history"
}
```

### Template Helpers

- `{{date}}` - Current date
- `{{time}}` - Current time
- `{{datetime}}` - Current date and time
- `{{timestamp}}` - Unix timestamp
- `{{uuid}}` - Generate UUID
- `{{username}}` - Current username
- `{{hostname}}` - Machine hostname
- `{{cwd}}` - Current working directory

### Input Helpers

- `{{input "name" "message"}}` - Text input
- `{{select "name" "message"}}` - Single selection
- `{{multiselect "name" "message"}}` - Multiple selection
- `{{confirm "name" "message"}}` - Yes/no confirmation
- `{{editor "name" "message"}}` - Open text editor
- `{{password "name" "message"}}` - Password input

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
node dist/cli.js
```

## License

ISC