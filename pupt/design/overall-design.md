# Prompt Tool (pt) - Overall Design Document

## Overview

Prompt Tool (pt) is a command-line application for managing AI prompts for Claude Code and other AI tools. It provides an interactive search interface, template variable substitution, and flexible configuration management. The tool is built using TypeScript and runs cross-platform on Windows, Linux, and macOS.

## Architecture Overview

### Core Components

1. **CLI Interface** - Entry point and command parsing
2. **Search Engine** - File search with field boosting capabilities
3. **Prompt Parser** - Markdown frontmatter extraction and parsing
4. **Template Engine** - Handlebars-based template substitution
5. **User Input Handler** - Interactive prompts for template values
6. **Configuration Manager** - Hierarchical config file management
7. **Output Formatter** - Final prompt rendering
8. **Platform Abstraction Layer** - OS-specific functionality abstraction
9. **History Manager** - Optional prompt history tracking

## Technology Stack

### Programming Language
- **TypeScript** - For type safety and better developer experience
- **Node.js** - Runtime environment (LTS version)
- **Target**: ES2022 or later for modern JavaScript features

### Build Tools
- **TypeScript Compiler** - For transpilation
- **ESBuild** or **Rollup** - For bundling
- **npm scripts** - For build automation

## Cross-Platform Considerations

### Platform Abstraction Layer

To ensure consistent behavior across Windows, macOS, and Linux, we'll implement a platform abstraction layer that handles OS-specific differences.

**Key Libraries for Cross-Platform Support:**

1. **path operations**: Node.js built-in `path` module
   - Always use `path.join()` and `path.resolve()` instead of string concatenation
   - Use `path.sep` for platform-specific separators
   - Use `path.normalize()` to handle different path formats

2. **os detection**: Node.js built-in `os` module
   - Use `os.platform()` to detect current OS
   - Use `os.homedir()` for user home directory
   - Use `os.tmpdir()` for temporary directories

3. **line endings**: `eol` package or built-in handling
   - Normalize line endings on read: `.replace(/\r\n|\r|\n/g, '\n')`
   - Use appropriate line endings on write based on platform

4. **file system**: `fs-extra` for enhanced cross-platform operations
   - Provides consistent behavior across platforms
   - Better error handling for permission issues

5. **executable handling**: `cross-spawn` or `execa`
   - Handles Windows .exe extensions automatically
   - Manages shell differences between platforms

### Platform-Specific Abstractions

```typescript
// src/utils/platform.ts
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

### File Path Handling

**Best Practices:**
1. Never hardcode path separators (`/` or `\`)
2. Always use `path.resolve()` for absolute paths
3. Use `path.relative()` for displaying paths to users
4. Handle UNC paths on Windows
5. Be aware of case sensitivity (Linux) vs case insensitivity (Windows/macOS default)

### Environment Variables

**Cross-Platform Environment Handling:**
```typescript
// Handle PATH separator differences
const PATH_SEPARATOR = process.platform === 'win32' ? ';' : ':';

// Handle home directory references
const expandHome = (filepath: string): string => {
  if (filepath.startsWith('~/')) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  return filepath;
};
```

### Terminal/Console Differences

1. **Color Support Detection**: Use `chalk` with automatic detection
2. **Unicode Support**: Test for Unicode support before using special characters
3. **Terminal Size**: Use `process.stdout.columns` with fallbacks
4. **Clear Screen**: Handle platform differences for clearing terminal

```typescript
const clearScreen = () => {
  if (process.platform === 'win32') {
    process.stdout.write('\x1B[2J\x1B[0f');
  } else {
    process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
  }
};
```

## CI/CD Setup

### GitHub Actions Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18.x, 20.x, 22.x]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test -- --coverage
      env:
        CI: true
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Build
      run: npm run build
    
    - name: Test CLI installation
      run: |
        npm link
        pt --version
    
    - name: Upload coverage
      if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20.x'
      uses: codecov/codecov-action@v4

  e2e-tests:
    needs: test
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        TEST_PLATFORM: ${{ matrix.os }}

  release:
    needs: [test, e2e-tests]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        registry-url: 'https://registry.npmjs.org'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build for all platforms
      run: npm run build:all
    
    - name: Create platform-specific packages
      run: |
        npm run package:linux
        npm run package:windows
        npm run package:macos
```

### Platform-Specific Testing

```typescript
// test/helpers/platform-test-utils.ts
export const describeOnPlatform = (platform: string, name: string, fn: () => void) => {
  if (os.platform() === platform) {
    describe(name, fn);
  } else {
    describe.skip(`${name} (skipped on ${os.platform()})`, fn);
  }
};

export const itOnWindows = (name: string, fn: () => void) => {
  if (os.platform() === 'win32') {
    it(name, fn);
  } else {
    it.skip(`${name} (Windows only)`, fn);
  }
};

// Usage:
describeOnPlatform('win32', 'Windows-specific path handling', () => {
  it('should handle UNC paths', () => {
    // Windows-specific test
  });
});
```

### Test Configuration

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "test:windows": "cross-env TEST_PLATFORM=win32 vitest",
    "test:macos": "cross-env TEST_PLATFORM=darwin vitest",
    "test:linux": "cross-env TEST_PLATFORM=linux vitest"
  }
}
```

### Platform-Specific Test Cases

1. **Path Handling Tests**
   - Absolute vs relative paths
   - Home directory expansion
   - Path normalization
   - Special characters in paths

2. **File System Tests**
   - Permission handling
   - Symbolic links (Unix) vs shortcuts (Windows)
   - Case sensitivity
   - Hidden files (.file vs file attributes)

3. **Process/Shell Tests**
   - Command execution
   - Environment variable handling
   - Signal handling
   - Process termination

4. **Terminal Tests**
   - Color output
   - Unicode characters
   - Terminal size detection
   - Interactive prompts

## Library Recommendations

### 1. Search Library

**Recommendation: MiniSearch**

**Alternatives Evaluated:**
- FlexSearch - Very fast but larger API surface
- ElasticLunr.js - Good but older
- js-search - Good for simple substring search
- fast-string-search - Low-level, requires more implementation

**Why MiniSearch:**
- Zero dependencies
- Excellent field boosting support: `miniSearch.search('query', { boost: { title: 2 } })`
- Supports exact match, prefix search, fuzzy match
- Small bundle size (~8KB minified)
- Modern, actively maintained codebase
- Simple API that matches our use case perfectly

**Implementation Notes:**
```typescript
// Field boosting for prompt search
const searchOptions = {
  boost: {
    title: 3,      // Highest priority
    tags: 2,     // Medium priority
    content: 1     // Base priority
  }
};
```

### 2. User Input Library

**Recommendation: @inquirer/prompts**

**Alternatives Evaluated:**
- inquirer (legacy) - Still popular but being replaced
- prompts - Lightweight but less feature-rich
- enquirer - Good but smaller community
- readline-sync - Synchronous only

**Why @inquirer/prompts:**
- Modern rewrite of the most popular CLI prompt library
- Promise-based API
- Modular design (import only what you need)
- Extensive input types: input, select, checkbox, editor, etc.
- Active development (latest version 3 days ago as of research)
- Massive community (94,209+ projects using inquirer)
- Progressive migration path from legacy inquirer

**Implementation Notes:**
```typescript
import { input, select, editor } from '@inquirer/prompts';

// Different input types based on partial configuration
const value = await input({ message: 'Enter value:' });
const choice = await select({ message: 'Choose:', choices: [...] });
const text = await editor({ message: 'Edit text:' });
```

### 3. Markdown Frontmatter Parser

**Recommendation: gray-matter**

**Alternatives Evaluated:**
- front-matter - Simpler but less features
- yaml-front-matter - YAML only
- remark-frontmatter - Requires full remark ecosystem

**Why gray-matter:**
- Industry standard (used by Gatsby, Netlify, Astro, etc.)
- Supports multiple formats: YAML, JSON, TOML, CoffeeScript
- Fast parsing with caching
- Custom delimiter support
- Extensive test coverage
- Battle-tested in production

**Implementation Notes:**
```typescript
import matter from 'gray-matter';

const { data, content } = matter(markdownString);
// data contains frontmatter
// content contains markdown without frontmatter
```

### 4. Template Engine

**Recommendation: Handlebars**

**Alternatives Evaluated:**
- Mustache.js - Too limited (logic-less)
- EJS - Too much logic allowed
- Pug - Different syntax paradigm
- Nunjucks - Good but overkill for our needs
- LiquidJS - Good but less common

**Why Handlebars:**
- Perfect balance of features and constraints
- Widely known syntax
- Excellent partial support (crucial for our use case)
- Custom helper functions
- Precompilation for performance
- Large ecosystem and community

**Implementation Notes:**
```typescript
import Handlebars from 'handlebars';

// Register custom partials
Handlebars.registerPartial('input', inputPartial);

// Register built-in helpers
Handlebars.registerHelper('date', () => new Date().toLocaleDateString());
```

### 5. Configuration Management

**Recommendation: cosmiconfig**

**Alternatives Evaluated:**
- node-config - More complex, deployment-focused
- rc - Simpler but less flexible
- merge-config - Good but less popular

**Why cosmiconfig:**
- Industry standard for tool configuration
- Smart search up directory tree
- Supports JSON, YAML, JavaScript, TypeScript configs
- Built-in caching
- TypeScript support
- Used by major tools (Prettier, ESLint, etc.)
- Flexible import/extend functionality

**Implementation Notes:**
```typescript
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('pt', {
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
```

## Data Flow

### 1. Command Execution Flow
```
pt command → 
  Load Configuration →
  Initialize Search Index →
  Interactive Prompt Search →
  Select Prompt →
  Parse Frontmatter →
  Collect Template Values →
  Render Template →
  Output Result →
  Save History (if enabled)
```

### 2. Search Flow
```
User Input → 
  Tokenize Query →
  Search with Field Boosting →
  Rank Results →
  Display Matches →
  User Selection
```

### 3. Template Processing Flow
```
Load Prompt File →
  Extract Frontmatter →
  Parse Template →
  Identify Variables/Partials →
  Prompt for Values →
  Execute Partials →
  Render Final Output
```

## File Structure

### Prompt File Format
```markdown
---
title: API Documentation Generator
tags: [api, docs, typescript]
variables:
  - name: projectName
    type: input
    message: "Project name?"
  - name: description
    type: editor
    message: "Project description?"
---

# {{projectName}} API Documentation

{{description}}

Generated on {{date}}.
```

### Configuration File Format
```yaml
# .ptrc.yaml
promptDirs:
  - ./prompts
  - ~/.prompts
  - /usr/share/pt/prompts

# Optional: Enable prompt history
historyDir: ~/.pt/history

partials:
  customDate:
    type: inline
    value: "return new Date().toISOString()"
  fileContent:
    type: file
    path: ./partials/fileContent.js
```

## Built-in Features

### 1. Built-in Helpers and Partials

**User Input Helpers:**
- `{{input "variableName"}}` - Text input (prompts once, cached for reuse as `{{variableName}}`)
- `{{select "variableName"}}` - Single selection
- `{{multiselect "variableName"}}` - Multiple selection
- `{{editor "variableName"}}` - Opens text editor
- `{{confirm "variableName"}}` - Yes/no prompt
- `{{password "variableName"}}` - Hidden input

**Static Value Helpers:**
- `{{date}}` - Current date (locale format)
- `{{datetime}}` - Current date and time
- `{{timestamp}}` - Unix timestamp
- `{{uuid}}` - Generate UUID v4
- `{{cwd}}` - Current working directory
- `{{hostname}}` - System hostname
- `{{username}}` - Current username

**Custom Partials:**
- `{{> headerTemplate}}` - User-defined template fragments
- Loaded from config file paths or inline definitions
- True Handlebars partials for template reuse

### 2. Search Features

**Field Boosting Weights:**
- Title (filename or frontmatter): 3x weight
- Tags: 2x weight
- Content: 1x weight

**Search Modes:**
- Substring matching (default)
- Fuzzy matching (configurable)
- Exact phrase matching (with quotes)

### 3. Template Features

**Variable Definition in Frontmatter:**
```yaml
variables:
  - name: componentName
    type: input
    message: "Component name?"
    default: "MyComponent"
    validate: "^[A-Z][a-zA-Z0-9]*$"
    
  - name: framework
    type: select
    message: "Choose framework:"
    choices:
      - React
      - Vue
      - Angular
```

## User Input Design

### Understanding Helpers vs Partials

**Helpers** are functions that process data and return values:
- `{{input "apiKey"}}` - A helper that prompts for input and returns the value
- The "apiKey" serves as both the prompt identifier AND the variable name for reuse

**Partials** are reusable template fragments:
- `{{> userHeader}}` - Includes a template fragment defined elsewhere

In our design, user inputs are **helpers**, not partials. This is important because helpers can:
1. Execute async operations (prompting the user)
2. Cache values for reuse
3. Return the actual value to be inserted in the template

### Input Value Caching and Reuse

The first parameter (e.g., "apiKey") serves multiple purposes:

```typescript
// When processing {{input "apiKey"}}:
1. Variable name for caching - stores as context.apiKey
2. Used to generate default prompt - "Api key:"
3. Available for reuse anywhere in template as {{apiKey}}
```

**Example showing reuse:**
```handlebars
# API Configuration

API Key: {{input "apiKey" "Enter your API key:"}}
Environment: {{select "environment" "Choose environment:"}}

## Generated Config File

```json
{
  "apiKey": "{{apiKey}}",
  "endpoint": "https://{{environment}}.api.example.com",
  "headers": {
    "Authorization": "Bearer {{apiKey}}"
  }
}
```
```

In this example:
- `{{input "apiKey" ...}}` prompts the user ONCE and stores the value
- Later uses of `{{apiKey}}` retrieve the cached value without re-prompting
- The helper returns the value immediately for inline use

### Flexible Helper Syntax

To balance simplicity with flexibility, we support multiple helper syntaxes:

#### 1. Simple Syntax (Most Common)
```handlebars
{{input "apiKey"}}
{{select "environment"}}
```
Uses default messages based on variable name.

#### 2. Message Syntax
```handlebars
{{input "apiKey" "Please enter your API key:"}}
{{select "environment" "Choose deployment environment:"}}
```
Custom message as second parameter.

#### 3. Object Syntax (Full Control)
```handlebars
{{#input}}
  name: apiKey
  message: Please enter your API key:
  default: sk-...
  validate: ^sk-[a-zA-Z0-9]+$
  mask: true
{{/input}}

{{#select}}
  name: deployTarget
  message: Where would you like to deploy?
  choices:
    - production
    - staging
    - development
  default: development
{{/select}}
```

#### 4. Inline Object Syntax
```handlebars
{{input name="apiKey" message="API Key:" default="sk-..." mask=true}}
```

### Helper Configuration Schema

```typescript
interface HelperConfig {
  // Required
  name: string;           // Variable name for caching
  
  // Optional with smart defaults
  message?: string;       // Prompt message (default: humanized name)
  type?: InputType;       // Type of input
  default?: any;          // Default value
  
  // Type-specific options
  choices?: string[];     // For select/multiselect
  mask?: boolean;         // For password/sensitive input
  validate?: string | ((input: any) => boolean | string);
  filter?: (input: any) => any;
  when?: (answers: any) => boolean;
  
  // Editor specific
  extension?: string;     // File extension for editor
  
  // Display options
  hint?: string;          // Help text
  required?: boolean;     // Is input required
}
```

### Smart Defaults

The system provides intelligent defaults to minimize configuration:

```typescript
class HelperDefaults {
  static getMessage(name: string, type: InputType): string {
    // Convert camelCase/snake_case to human readable
    const humanized = name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();
    
    const capitalized = humanized.charAt(0).toUpperCase() + humanized.slice(1);
    
    // Type-specific suffixes
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
  
  static getValidation(name: string): string | undefined {
    // Common validation patterns
    const patterns: Record<string, string> = {
      email: '^[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$',
      url: '^https?://.*',
      apiKey: '^[a-zA-Z0-9_-]+$',
      port: '^[0-9]{1,5}$',
      ipAddress: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$'
    };
    
    // Check if name matches common patterns
    for (const [pattern, regex] of Object.entries(patterns)) {
      if (name.toLowerCase().includes(pattern)) {
        return regex;
      }
    }
    
    return undefined;
  }
}
```

### Handlebars Helper Registration

```typescript
// Register all input helpers
export function registerInputHelpers(handlebars: typeof Handlebars) {
  // Simple helper for each input type
  ['input', 'select', 'multiselect', 'editor', 'confirm', 'password'].forEach(type => {
    handlebars.registerHelper(type, function(this: any, ...args: any[]) {
      const options = args[args.length - 1];
      
      // Handle different syntaxes
      if (typeof args[0] === 'string') {
        // Simple or message syntax
        const name = args[0];
        const message = args[1] || HelperDefaults.getMessage(name, type);
        
        return new handlebars.SafeString(
          `{{${type} "${name}" "${message}"}}`
        );
      } else if (options.hash) {
        // Inline object syntax
        const config = options.hash;
        config.type = type;
        return processInput(config);
      }
    });
    
    // Block helper for object syntax
    handlebars.registerHelper(`#${type}`, function(this: any, options: any) {
      const config = parseBlockConfig(options.fn(this));
      config.type = type;
      return processInput(config);
    });
  });
}
```

### Examples

**Simple blog post template:**
```handlebars
---
title: Blog Post Template
---

# {{input "title" "Blog post title:"}}

*Author: {{input "author"}}*
*Date: {{date}}*

{{editor "content" "Write your blog post:"}}

Tags: {{multiselect "tags" "Select tags:" choices=["tech", "tutorial", "news", "opinion"]}}
```

**Complex API client template:**
```handlebars
---
title: API Client Generator
---

{{#input}}
  name: serviceName
  message: What is the name of your API service?
  validate: ^[A-Za-z][A-Za-z0-9]*$
{{/input}}

{{#select}}
  name: authType
  message: Authentication type:
  choices:
    - none
    - api-key
    - oauth2
    - basic
{{/select}}

{{#if (eq authType "api-key")}}
  {{input "apiKey" "Enter your API key:" mask=true}}
{{/if}}

Generated client for {{serviceName}} with {{authType}} authentication.
```

### Variable Scoping and Context

```typescript
interface TemplateContext {
  // User inputs (cached)
  inputs: Map<string, any>;
  
  // Static values (computed once)
  static: {
    date: string;
    datetime: string;
    timestamp: number;
    uuid: string;
    cwd: string;
    hostname: string;
    username: string;
  };
  
  // Custom partials from config
  custom: Record<string, any>;
  
  // Helper to get any value
  get(path: string): any;
}
```

### Implementation Flow Example

When the tool processes a template:

```typescript
// Template content
const template = `
API Key: {{input "apiKey" "Enter your API key:"}}
URL: {{input "url" "API endpoint URL:"}}

Config:
- Key: {{apiKey}}
- Endpoint: {{url}}/v1/{{apiKey}}
`;

// Processing steps:
1. Parse template, find all helpers
2. Execute {{input "apiKey" ...}} helper:
   - Check cache for "apiKey" - not found
   - Prompt user: "Enter your API key:"
   - User enters: "sk-12345"
   - Cache value: context.set("apiKey", "sk-12345")
   - Return: "sk-12345"
3. Execute {{input "url" ...}} helper:
   - Check cache for "url" - not found
   - Prompt user: "API endpoint URL:"
   - User enters: "https://api.example.com"
   - Cache value: context.set("url", "https://api.example.com")
   - Return: "https://api.example.com"
4. Process {{apiKey}} - retrieve from cache: "sk-12345"
5. Process {{url}} - retrieve from cache: "https://api.example.com"
6. Final output includes all substituted values
```

## Prompt History Feature

### Overview

When enabled via configuration, the tool saves a record of every generated prompt after variable substitution. This enables:
- User recall of previously generated prompts
- LLM analysis for prompt optimization suggestions
- Audit trail of prompt usage

### Configuration

```yaml
# .ptrc.yaml
historyDir: ~/.pt/history  # Optional - enables history when set
```

### History File Format

Each generated prompt is saved as a markdown file with comprehensive metadata:

```markdown
---
# Metadata about the prompt generation
template:
  path: /home/user/prompts/api-client.md
  hash: sha256:a7b9c2d4e5f6...  # Hash of template content
  
execution:
  date: 2024-03-15           # Date only, no time for privacy
  user: john.doe             # System username
  cwd: /home/user/project    # Working directory
  
variables:                   # All variable values used
  serviceName: WeatherAPI
  authType: api-key
  apiKey: "***"              # Sensitive values masked
  environment: production
  
system:
  platform: linux
  ptVersion: 1.0.0
  nodeVersion: 20.11.0
---

# Generated Prompt

[The fully substituted prompt content goes here...]
```

### History File Naming

Files are named using a timestamp and template name pattern:
```
YYYY-MM-DD_HHMMSS_<template-name>_<short-hash>.md

Example:
2024-03-15_143022_api-client_a7b9c2.md
```

### Implementation Details

```typescript
interface HistoryManager {
  isEnabled(): boolean;
  
  async savePrompt(options: {
    templatePath: string;
    templateContent: string;
    variables: Map<string, any>;
    finalPrompt: string;
  }): Promise<void>;
  
  maskSensitiveValues(variables: Map<string, any>): Map<string, any>;
  
  generateFilename(templateName: string): string;
}

// Sensitive value masking
const SENSITIVE_PATTERNS = [
  /apiKey/i,
  /password/i,
  /secret/i,
  /token/i,
  /credential/i
];
```

### Privacy Considerations

1. **Time Precision**: Only date is stored, not exact time
2. **Sensitive Values**: Automatically masked based on variable names
3. **Optional Feature**: Disabled by default, requires explicit configuration
4. **User Control**: Users can delete history files at any time

### History Directory Structure

```
~/.pt/history/
├── 2024-03-15_143022_api-client_a7b9c2.md
├── 2024-03-15_152145_blog-post_d4e5f6.md
├── 2024-03-16_091233_component_b2c3d4.md
└── index.json  # Optional index for faster searches
```

### Future Enhancements

- Search command for history: `pt --history search <query>`
- History pruning: `pt --history prune --older-than 30d`
- Export history: `pt --history export --format json`
- LLM analysis integration for prompt optimization

## Error Handling

### 1. Configuration Errors
- Missing config file: Use defaults
- Invalid YAML/JSON: Show parse error with line number
- Missing prompt directories: Create default directory

### 2. Search Errors
- No results: Suggest similar terms
- Index corruption: Rebuild index
- File access errors: Skip file with warning

### 3. Template Errors
- Missing variables: Prompt user
- Invalid partial: Show error and skip
- Circular references: Detect and error

### 4. History Errors
- Invalid history directory: Warn and disable history
- Write permissions: Warn and continue without history
- Disk space: Gracefully handle full disk

## Performance Considerations

### 1. Search Performance
- Index prompts on startup
- Cache search results
- Lazy load file contents
- Use debouncing for interactive search

### 2. File I/O
- Async file operations
- Stream large files
- Cache frequently used prompts
- Watch for file changes (optional)

### 3. Memory Usage
- Limit search index size
- Stream template rendering
- Clear caches periodically

### 4. History Performance
- Async history writes (non-blocking)
- Optional indexing for large history
- Configurable retention policies

## Security Considerations

### 1. File Access
- Respect file permissions
- Sanitize file paths
- Prevent directory traversal

### 2. Template Execution
- Sandbox custom partials
- Limit partial execution time
- Validate user input

### 3. Configuration
- Validate config schema
- Ignore suspicious paths
- Warn on executable configs

### 4. History Security
- Automatic sensitive value masking
- Secure file permissions (user-only read/write)
- No storage of passwords or secrets in plain text

## Testing Strategy

### 1. Unit Tests
- Each module independently
- Mock file system operations
- Test error conditions

### 2. Integration Tests
- Full command execution
- Real file operations
- Config loading and merging

### 3. E2E Tests
- Interactive prompt flows
- Search accuracy
- Template rendering

## Future Extensibility

### 1. Plugin System
- Custom search providers
- Additional template engines
- Output formatters

### 2. Sharing Mechanism
- Prompt repositories
- Import from GitHub/GitLab
- Team prompt libraries

### 3. AI Integration
- Prompt suggestions
- Auto-completion
- Prompt optimization

## Implementation Phases

### Phase 1: Core Functionality
1. Basic CLI structure
2. Prompt file loading
3. Simple search (title only)
4. Basic template rendering

### Phase 2: Full Search
1. MiniSearch integration
2. Field boosting
3. Frontmatter parsing
4. Interactive search UI

### Phase 3: Advanced Templates
1. All built-in partials
2. Custom partials
3. Variable definitions
4. Validation

### Phase 4: Configuration
1. Cosmiconfig integration
2. Multi-directory support
3. Config merging
4. Custom partials loading

### Phase 5: Polish
1. Error handling
2. Performance optimization
3. Documentation
4. Testing

## Dependencies Summary

### Production Dependencies
- `minisearch` - Search engine
- `@inquirer/prompts` - User input
- `gray-matter` - Frontmatter parsing
- `handlebars` - Template engine
- `cosmiconfig` - Configuration
- `commander` - CLI framework (optional)
- `chalk` - Terminal colors (optional)
- `cross-spawn` or `execa` - Cross-platform process execution
- `fs-extra` - Enhanced file system operations
- `crypto` - Built-in Node.js module for SHA256 hashing

### Development Dependencies
- `typescript` - Language
- `vitest` - Testing
- `eslint` - Linting
- `vite` - Bundling
- `cross-env` - Cross-platform environment variables for testing

## Platform-Specific Module Architecture

### Module Structure
```
src/
├── platform/
│   ├── index.ts          # Platform abstraction exports
│   ├── base.ts           # Base platform interface
│   ├── windows.ts        # Windows-specific implementations
│   ├── macos.ts          # macOS-specific implementations
│   ├── linux.ts          # Linux-specific implementations
│   └── factory.ts        # Platform detection and factory
├── utils/
│   ├── paths.ts          # Cross-platform path utilities
│   ├── process.ts        # Process execution wrappers
│   └── filesystem.ts     # File system abstractions
```

### Platform Interface
```typescript
// src/platform/base.ts
export interface IPlatform {
  name: 'windows' | 'macos' | 'linux';
  
  // Path operations
  getConfigDir(): string;
  getDataDir(): string;
  getCacheDir(): string;
  normalizePath(path: string): string;
  
  // Process operations
  openEditor(file: string): Promise<void>;
  getShell(): string;
  
  // File operations
  setHidden(path: string): Promise<void>;
  isHidden(path: string): Promise<boolean>;
  
  // Terminal operations
  supportsUnicode(): boolean;
  supportsColor(): boolean;
  clearScreen(): void;
}
```

### Cross-Platform Development Guidelines

1. **Always use abstractions** - Never write OS-specific code outside the platform modules
2. **Test on all platforms** - Use the CI/CD matrix to ensure all platforms work
3. **Handle edge cases** - Different file systems, permissions, and shell behaviors
4. **Provide fallbacks** - When platform-specific features aren't available
5. **Document limitations** - Be clear about platform-specific constraints

### Common Pitfalls to Avoid

1. **Path Construction**
   - ❌ `const configPath = homeDir + '/.ptrc'`
   - ✅ `const configPath = path.join(homeDir, '.ptrc')`

2. **Line Endings**
   - ❌ Assuming `\n` everywhere
   - ✅ Using `os.EOL` or normalizing on read

3. **Shell Commands**
   - ❌ `exec('ls -la')`
   - ✅ Using `fs.readdir()` or cross-platform alternatives

4. **File Permissions**
   - ❌ Assuming Unix permissions work everywhere
   - ✅ Using try-catch and graceful degradation

5. **Executable Extensions**
   - ❌ Hardcoding `.exe` or assuming no extension
   - ✅ Using `which` or `command-exists` packages

## Conclusion

This design provides a solid foundation for building a powerful, extensible prompt management tool that works consistently across Windows, macOS, and Linux. The chosen libraries are mature, well-maintained, and provide the exact functionality needed while keeping the dependency footprint reasonable. The modular architecture with a dedicated platform abstraction layer ensures that OS-specific code is isolated and testable, reducing the likelihood of platform-specific bugs in production. The comprehensive CI/CD setup ensures that all changes are tested across all supported platforms before release.
