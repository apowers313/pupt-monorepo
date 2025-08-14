# Phase 2 Feature Design Document

## Overview

This document outlines the design for six new features to enhance the prompt-tool's functionality and user experience:

1. **`pt init`** - Interactive configuration setup
2. **`pt add`** - Create new prompts with metadata
3. **`pt edit`** - Edit existing prompts
4. **`pt history`** - View prompt execution history
5. **`pt annotate`** - Add notes to historical runs
6. **`pt run`** - Execute prompts with external tools

## Feature Designs

### 1. `pt init` - Configuration Initialization

**Purpose**: Provide a guided setup experience for new users to create their configuration file and directory structure.

**User Flow**:
1. User runs `pt init`
2. System checks if config already exists (warn if overwriting)
3. Interactive prompts:
   - Prompt directory location (default: `./prompts`)
   - Enable history? (yes/no)
   - If yes: History directory location (default: `./.pthistory`)
   - If history enabled: Enable annotations? (yes/no)
   - If yes: Annotations directory (default: `./.pthistory`)
4. Create directories if they don't exist
5. Generate `.ptrc.json` in current directory

**Configuration Schema**:
```json
{
  "promptDirs": ["./prompts"],
  "historyDir": "./.pthistory",
  "annotationDir": "./.pthistory",
  "codingTool": "claude",
  "codingToolArgs": [],
  "codingToolOptions": {
    "Continue with last context?": "--continue"
  }
}
```

**Implementation Notes**:
- Use inquirer prompts for interactive questions
- Validate directory paths before creating
- Create parent directories if needed
- Show success message with created paths

### 2. `pt add` - Create New Prompt

**Purpose**: Streamline prompt creation with consistent metadata and structure.

**User Flow**:
1. User runs `pt add`
2. If multiple prompt directories configured:
   - Show selection list of directories
3. Prompt for:
   - Title (required)
   - Labels (optional, comma-separated)
   - Initial content (optional, opens editor if not provided)
4. Generate filename from title (kebab-case)
5. Extract git author information
6. Create markdown file with frontmatter

**Frontmatter Template**:
```yaml
---
title: <user input>
author: <git user.name> <git user.email>
creationDate: <YYYYMMDD>
labels: [<user input>]
---

<content>
```

**Implementation Notes**:
- Use `git config user.name` and `git config user.email` for author
- Sanitize title for filename (remove special chars, lowercase, hyphenate)
- Check for existing files to avoid overwriting
- Open editor if user wants to add content immediately

### 3. `pt edit` - Edit Existing Prompt

**Purpose**: Quick access to edit prompt files using the user's preferred editor.

**User Flow**:
1. User runs `pt edit`
2. Show interactive search (same as main prompt selection)
3. User selects prompt
4. Open file in `$VISUAL` or `$EDITOR` (fallback to common editors)
5. Wait for editor to close
6. Show success message

**Implementation Notes**:
- Check environment variables in order: `$VISUAL`, `$EDITOR`
- Fallback list: `vim`, `nano`, `code`, `notepad` (OS-specific)
- Use `child_process.spawn` with `stdio: 'inherit'`
- Handle editor not found gracefully

### 4. `pt history` - View Execution History

**Purpose**: Review past prompt executions for reference and reuse.

**User Flow**:
1. User runs `pt history`
2. Check if history is enabled
   - If not: Show friendly error with enable instructions
3. Read history files from history directory
4. Display numbered list (newest first):
   ```
   1. [2024-01-15 14:30] API Client Generator - Generate a TypeScript API client for...
   2. [2024-01-15 10:15] React Component - Create a form component with validat...
   3. [2024-01-14 16:45] Database Schema - Design PostgreSQL schema for user...
   ```
5. Support pagination for long lists

**History File Format**:
```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "templatePath": "/path/to/template.md",
  "templateContent": "...",
  "variables": { "name": "value" },
  "finalPrompt": "..."
}
```

**Implementation Notes**:
- Store history as individual JSON files with timestamp filenames
- Display first line of prompt (truncate at 60 chars)
- Support `--limit N` flag for showing last N entries
- Cache history listing for performance

### 5. `pt annotate` - Annotate History Entries

**Purpose**: Add contextual notes to historical prompt executions for future reference.

**User Flow**:
1. User runs `pt annotate [number]`
2. Check if annotations enabled
   - If not: Show friendly error with enable instructions
3. If no number provided:
   - Show history list with selection
4. Prompt for annotation type:
   - Success/Failure status
   - Notes (opens editor)
   - Tags for categorization
5. Create annotation file linked to history entry

**Annotation File Format**:
```yaml
---
historyFile: <history-filename>
timestamp: <ISO timestamp>
status: success|failure|partial
tags: [improvement, bug-fix, refactor]
---

## Notes

<user's annotation content>
```

**Implementation Notes**:
- Annotation files named: `<history-timestamp>-annotation.md`
- Support multiple annotations per history entry
- Show existing annotations when viewing history
- Link annotations in history display

### 6. `pt run` - Execute with External Tool

**Purpose**: Seamlessly pass generated prompts to coding assistants.

**Enhanced User Flow**:
1. User runs `pt run [options] [-- tool-args]`
2. If `-h <number>` provided:
   - Load prompt from history
   - Skip to step 5
3. Standard prompt selection and variable input
4. Process coding tool options:
   - For each option in `codingToolOptions`
   - Ask user yes/no
   - Collect selected option arguments
5. Build command:
   - Base: `codingTool` + `codingToolArgs`
   - Add selected options
   - Add any args after `--`
6. Execute command with prompt as stdin
7. Save to history if enabled

**Command Building Example**:
```bash
# Config:
codingTool: "claude"
codingToolArgs: ["--model", "sonnet"]
codingToolOptions: {
  "Continue with last context?": "--continue",
  "Enable web search?": "--web"
}

# User selections:
- Continue: Yes
- Web search: No
- Extra args: -- --temperature 0.7

# Final command:
claude --model sonnet --continue --temperature 0.7 < generated-prompt
```

**Implementation Notes**:
- Parse `--` to separate pt args from tool args
- Support both pipe and argument passing (tool-dependent)
- Handle tool not found gracefully
- Stream output to maintain interactivity
- Exit with tool's exit code

## Shared Components

### Configuration Manager Enhancement

**Current**: Basic config loading
**Enhanced**: 
- Config validation with schema
- Config migration for version updates
- Environment variable expansion
- User-friendly error messages

### Error Handling Strategy

All commands should:
1. Check prerequisites (config, directories)
2. Provide actionable error messages
3. Suggest next steps ("Run `pt init` to set up configuration")
4. Use consistent error formatting

### Common UI Patterns

1. **Selection Lists**: Use existing `InteractiveSearch` component
2. **Confirmations**: Yes/No prompts with clear defaults
3. **Progress Indicators**: For long operations (history scanning)
4. **Success Messages**: Green checkmarks with summary

## Testing Strategy

### Unit Tests
- Configuration validation
- Path sanitization
- Command building logic
- History file operations

### Integration Tests
- Full command flows with mocked I/O
- Editor launching with test editor
- Tool execution with echo command

### E2E Tests
- Complete init → add → edit → run → annotate flow
- History management over time
- Error scenarios and recovery

## Migration Considerations

1. **Backward Compatibility**: Support existing configs
2. **Gradual Adoption**: All new features optional
3. **Clear Documentation**: Migration guide for existing users

## Security Considerations

1. **Path Traversal**: Validate all user-provided paths
2. **Command Injection**: Properly escape tool arguments
3. **File Permissions**: Respect system permissions
4. **Sensitive Data**: Mark password/token variables in history

## Performance Considerations

1. **History Scaling**: Index by date for fast queries
2. **Large Prompts**: Stream processing for memory efficiency
3. **Directory Scanning**: Cache results where appropriate

## Future Enhancements

1. **Prompt Sharing**: Export/import prompt packages
2. **Team Features**: Shared prompt repositories
3. **Analytics**: Usage statistics and insights
4. **Integrations**: Direct API integrations beyond CLI tools