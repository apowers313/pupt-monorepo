# Phase 3 Feature Design Document

## Overview

This document outlines the design for Phase 3 enhancements to the prompt-tool. These features focus on improving user experience, adding new input types, enhancing configuration flexibility, and providing better integration with external tools and repositories.

## Feature List

1. **File Input Type** - Tab-completion file selection
2. **ReviewFile Input Type** - File selection with automatic review
3. **Configuration File Changes** - Rename fields and file format
4. **`pt install` Command** - Install prompts from git or npm
5. **Handlebars Extensions** - Replace partials with flexible extensions
6. **.gitignore Integration** - Auto-add generated directories
7. **History Timestamp Improvements** - Use local timezone
8. **AutoRun Feature** - Execute default command automatically
9. **Search Results Context** - Show matching context in search

## Detailed Feature Designs

### 1. File Input Type

**Purpose**: Provide an intuitive file selection experience with tab-completion, similar to bash prompt behavior.

**Technical Design**:
- New variable type: `file`
- Interactive file browser with real-time filtering
- Tab key triggers auto-completion
- Directory navigation support

**Variable Definition**:
```yaml
variables:
  - name: configFile
    type: file
    message: "Select configuration file:"
    basePath: "./"  # optional, defaults to cwd
    filter: "*.json" # optional glob pattern
```

**Implementation Details**:
- Use `fs.readdir` with recursive option for file listing
- Sort files by modification time (most recent first) using `fs.stat`
- Implement trie data structure for efficient prefix matching
- Handle special characters and spaces in filenames
- Support both relative and absolute paths
- Cache directory contents for performance

**User Interaction Flow**:
1. Prompt displays current directory contents (ordered by modification time, newest first)
2. User types characters to filter files
3. Tab completes common prefix among matches
4. Enter selects file, `/` navigates into directory
5. Support `..` for parent directory navigation

### 2. ReviewFile Input Type

**Purpose**: File selection with automatic review in user's editor before finalizing selection.

**Technical Design**:
- Extends `file` input type functionality
- Integrates with `autoReview` config setting
- Opens selected file in `$EDITOR` or `$VISUAL`

**Variable Definition**:
```yaml
variables:
  - name: targetFile
    type: reviewFile
    message: "Select file to review:"
    autoReview: true  # can override config setting
```

**Configuration**:
```json
{
  "autoReview": true  // defaults to true in new configs
}
```

**Implementation Details**:
- Inherits all file input type features
- After file selection, check `autoReview` setting
- If true and `pt run` is used:
  - Launch editor with selected file
  - Wait for editor to close
  - Confirm selection or allow re-selection
- Use same editor detection as `pt edit` command

### 3. Configuration File Changes

**Purpose**: Improve naming clarity and update configuration file naming convention.

**Changes**:
1. Rename configuration fields:
   - `codingTool` → `defaultCmd`
   - `codingToolArgs` → `defaultCmdArgs`
   - `codingToolOptions` → `defaultCmdOptions`

2. Rename configuration file:
   - `.ptrc` → `.pt-config`
   - Maintain support for all extensions (.json, .yaml, .yml, .js)

**Migration Strategy**:
- Automatic migration on first run
- Check for old config names, create new with updated fields
- Keep backup of old config as `.ptrc.backup`
- Show migration message to user

**Updated Config Schema**:
```json
{
  "promptDirs": ["./prompts"],
  "historyDir": "./.pthistory",
  "annotationDir": "./.pthistory",
  "defaultCmd": "claude",
  "defaultCmdArgs": ["-p", "{{prompt}}"],
  "defaultCmdOptions": {
    "Continue with last context?": "--continue"
  },
  "autoReview": true,
  "autoRun": false,
  "gitPromptDir": ".git-prompts",
  "handlebarsExtensions": {},
  "version": "3.0.0"
}
```

**Template Substitution**:
- The `defaultCmdArgs` array supports template substitution using Handlebars syntax
- Available template variables:
  - `{{prompt}}` - The generated prompt content
  - `{{promptPath}}` - Path to the temporary prompt file
  - `{{timestamp}}` - Current timestamp
- Example configurations:
  ```json
  // Pass prompt as argument
  "defaultCmdArgs": ["-p", "{{prompt}}"]
  
  // Pass prompt file path
  "defaultCmdArgs": ["--prompt-file", "{{promptPath}}"]
  
  // Custom format
  "defaultCmdArgs": ["--input", "{{prompt}}", "--timestamp", "{{timestamp}}"]
  ```

### 4. `pt install` Command

**Purpose**: Install prompt collections from git repositories or npm packages.

**Command Syntax**:
```bash
pt install <source>
# Examples:
pt install https://github.com/user/prompts-repo
pt install @company/prompt-collection
```

**Git Installation Flow**:
1. Detect git URL (starts with http://, https://, git://, or git@)
2. Determine installation directory:
   - Use `gitPromptDir` from config (default: `.git-prompts`)
   - If relative path and in git repo, use git root
3. Clone with depth 1 using simple-git: `git.clone(url, dir, ['--depth', '1'])`
4. Add to .gitignore if in git repository (check with `git.checkIsRepo()`)
5. Add `<gitPromptDir>/<repo-name>/prompts` to promptDirs in local config

**NPM Installation Flow**:
1. Detect npm package (not a URL)
2. Verify npm project (package.json exists)
3. Install as dev dependency: `npm install --save-dev <package>`
4. Read installed package.json for `promptDir` field
5. Add path to promptDirs:
   - If `promptDir` specified: `node_modules/<package>/<promptDir>`
   - Default: `node_modules/<package>/prompts`

**Implementation Details**:
- Use `simple-git` library for all git operations
- Use `child_process.exec` for npm commands only
- Parse package.json to find prompt directory
- Handle nested gitPromptDir paths (create recursively)
- Detect git repository root using `simple-git().revparse(['--show-toplevel'])`
- Update local config file, not global

### 5. Handlebars Extensions

**Purpose**: Replace limited `partials` config with flexible Handlebars extension system.

**Configuration Change**:
- Rename `partials` to `handlebarsExtensions`
- Support both inline code and file paths
- Allow registering helpers, partials, and decorators

**Configuration Examples**:
```json
{
  "handlebarsExtensions": {
    "type": "inline",
    "value": "Handlebars.registerHelper('uppercase', str => str.toUpperCase());"
  }
}
```

```json
{
  "handlebarsExtensions": {
    "type": "file",
    "path": "./handlebars-setup.js"
  }
}
```

**Extension File Format**:
```javascript
module.exports = function(Handlebars) {
  // Register helpers
  Handlebars.registerHelper('formatDate', (date) => {
    return new Date(date).toLocaleDateString();
  });
  
  // Register partials
  Handlebars.registerPartial('header', '# {{title}}\\nBy {{author}}');
  
  // Any other Handlebars customization
};
```

**Implementation Details**:
- Load extensions before template compilation
- Use `vm.runInNewContext` for inline code safety
- Pass Handlebars instance to extension function
- Maintain backward compatibility for existing partials

### 6. .gitignore Integration

**Purpose**: Automatically add generated directories to .gitignore when appropriate.

**Trigger Conditions**:
1. During `pt init`:
   - If historyDir is under current directory
   - If annotationDir is under current directory
   - If current directory is git-controlled

2. During `pt install`:
   - When creating gitPromptDir in git repository

**Implementation Details**:
- Check if directory is git-controlled: `git.checkIsRepo()`
- Find .gitignore location using `git.revparse(['--show-toplevel'])`
- Check if entry already exists before adding
- Add entries with descriptive comments:
  ```
  # Prompt tool history
  .pthistory/
  
  # Prompt tool git installations
  .git-prompts/
  ```

### 7. History Timestamp Improvements

**Purpose**: Use local timezone for better readability and debugging.

**Changes**:
1. History filename format:
   - Current: `history_1234567890123.json` (UTC timestamp)
   - New: `history_20240315_143045_EST.json` (local time with timezone)

2. Timestamp in file content:
   - Current: UTC ISO string
   - New: Local ISO string with timezone offset

**Implementation**:
```javascript
// Filename generation
const now = new Date();
const datePart = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
const timePart = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
const timezone = now.toTimeString().split(' ')[1].replace(/[()]/g, ''); // EST
const filename = `history_${datePart}_${timePart}_${timezone}.json`;

// Timestamp in content
const timestamp = now.toISOString(); // Includes timezone offset
```

### 8. AutoRun Feature

**Purpose**: Streamline workflow by automatically executing default command.

**Configuration**:
```json
{
  "autoRun": false,  // default value
  "defaultCmd": "claude"
}
```

**Behavior**:
- When `autoRun` is true and `defaultCmd` is set
- Running `pt` alone behaves like `pt run`
- Maintains all interactive prompt selection
- Only affects final execution step

**Implementation Details**:
- Check config after prompt generation
- If autoRun && defaultCmd && no command specified
- Execute run command logic automatically
- Preserve all existing pt options and behaviors

### 9. Search Results Context

**Purpose**: Provide better visibility into why search results match.

**Display Format**:
```
? Search for a prompt: api
▸ REST API Generator
    match: title: REST API Generator
    path: prompts/api/rest-generator.md
  GraphQL Schema Builder
  API Documentation Tool
```

**Implementation Details**:
- Modify search results to include match information
- Only show context for currently selected item
- Truncate long matches with ellipsis
- Color code "match:" and "path:" labels
- Include line where match was found

**Match Context Rules**:
1. Show field that matched (title, labels, content)
2. Show surrounding text (max 60 chars)
3. If multiple matches, show most relevant
4. Priority: title > labels > content

## Implementation Priority

High Priority:
1. `pt install` command - Core new functionality
2. Search results context - Immediate UX improvement
3. Configuration file changes - Foundation for other features

Medium Priority:
4. File input type - Enhanced user interaction
5. ReviewFile input type - Builds on file input
6. AutoRun feature - Workflow improvement
7. Handlebars extensions - Power user feature
8. .gitignore integration - Quality of life

Low Priority:
9. History timestamp improvements - Minor enhancement

## Testing Considerations

### Unit Tests
- File path completion algorithm
- Configuration migration logic
- Git/npm package detection
- Timestamp formatting
- Search result context extraction

### Integration Tests
- Full `pt install` flow for both git and npm (with mocked simple-git)
- File input with special characters
- Editor integration for reviewFile
- Handlebars extension loading
- .gitignore modification

### Git Testing Strategy
To avoid slow and flaky tests that depend on actual git operations:
- All git operations will use the `simple-git` library
- Unit tests will mock the simple-git instance completely
- Integration tests will use a mocked simple-git to simulate git operations
- Mock responses will simulate successful clones, repo checks, and errors
- This approach ensures fast, reliable tests without network or file system delays

Example mock setup:
```javascript
vi.mock('simple-git', () => ({
  default: () => ({
    clone: vi.fn().mockResolvedValue(undefined),
    checkIsRepo: vi.fn().mockResolvedValue(true),
    revparse: vi.fn().mockResolvedValue('/path/to/repo')
  })
}));
```

### Cross-Platform Testing
- File path handling (Windows vs Unix)
- Editor detection across OS
- Timezone handling
- Git command availability (handled by simple-git)

## Security Considerations

1. **File Access**: Validate file paths to prevent directory traversal
2. **Command Injection**: Sanitize all inputs to git/npm commands
3. **Code Execution**: Sandbox Handlebars extensions
4. **Network Security**: Validate git URLs before cloning

## Migration Guide

### For Existing Users
1. Backup current configuration
2. Run new version - automatic migration occurs
3. Review migrated config at `.pt-config.json`
4. Update any scripts referencing old config names

### Breaking Changes
- Configuration file renamed
- Config field names changed
- Partials replaced with handlebarsExtensions

## Future Considerations

1. **Prompt Marketplace**: Central registry for prompt packages
2. **Version Management**: Handle prompt collection updates
3. **Dependency Resolution**: Manage prompt dependencies
4. **Collaborative Features**: Team prompt sharing