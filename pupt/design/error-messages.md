# Error Messages Design Document

## Overview

This document outlines all current error messages in the prompt-tool codebase and proposes improvements for Phase 10 to enhance user experience with consistent, helpful error messaging.

## Error Message Categories

### 1. Configuration Errors

#### Current Messages

| Error Message | Location | Condition | User Action |
|--------------|----------|-----------|-------------|
| `'historyDir must be a string'` | config-manager.ts | Invalid type in config file | Edit .ptrc.json to ensure historyDir is a string path |
| `'annotationDir must be a string'` | config-manager.ts | Invalid type in config file | Edit .ptrc.json to ensure annotationDir is a string path |
| `'codingTool must be a string'` | config-manager.ts | Invalid type in config file | Edit .ptrc.json to ensure codingTool is a string |
| `'codingToolArgs must be an array'` | config-manager.ts | Invalid type in config file | Edit .ptrc.json to ensure codingToolArgs is an array |
| `'codingToolOptions must be an object'` | config-manager.ts | Invalid type in config file | Edit .ptrc.json to ensure codingToolOptions is an object |

#### Proposed Enhanced Messages

| New Error Message | Condition | User Action |
|------------------|-----------|-------------|
| `Configuration Error: 'historyDir' must be a string path (found: ${typeof value}). Edit .ptrc.json and set it to a valid directory path like "./history"` | Invalid historyDir type | Fix the configuration file with correct type |
| `Configuration Error: 'codingToolArgs' must be an array of strings (found: ${typeof value}). Example: ["--arg1", "--arg2"]` | Invalid codingToolArgs type | Provide proper array format in config |

### 2. Missing Resources Errors

#### Current Messages

| Error Message | Location | Condition | User Action |
|--------------|----------|-----------|-------------|
| `'No prompts found. Create a prompt file...'` | cli.ts | Empty prompt directories | Create a .md file in prompt directory |
| `'No prompt directories configured. Run "pt init" first.'` | add.ts | Missing promptDirs in config | Run pt init to set up configuration |
| `'No editor found. Please set $VISUAL or $EDITOR...'` | edit.ts | No editor env vars set | Set VISUAL or EDITOR environment variable |
| `'No tool specified. Use "pt run <tool>"...'` | run.ts | Missing tool argument | Specify a tool or configure default |
| `'History entry #${number} not found'` | run.ts, annotate.ts | Invalid history index | Use pt history to see valid entries |
| `'No history entries found'` | annotate.ts | Empty history | Run some prompts to create history |

#### Proposed Enhanced Messages

| New Error Message | Condition | User Action |
|------------------|-----------|-------------|
| `🔍 No prompts found in: ${dirs.join(', ')}\n\n✨ Get started:\n  1. Run 'pt add' to create a new prompt\n  2. Or create a .md file in one of the directories\n  3. Run 'pt example' for a sample prompt` | No prompts in directories | Clear next steps with multiple options |
| `⚠️  No editor configured\n\nSet your preferred editor:\n  • Linux/Mac: export EDITOR=vim\n  • Windows: set EDITOR=notepad\n  • VS Code: export EDITOR="code --wait"\n\nAdd to your shell profile to make permanent.` | No editor environment variable | Platform-specific instructions |
| `❌ History entry #${number} not found\n\n📋 Available entries: 1-${total}\nRun 'pt history' to see all entries` | Invalid history number | Show valid range and command to list |

### 3. Feature Not Enabled Errors

#### Current Messages

| Error Message | Location | Condition | User Action |
|--------------|----------|-----------|-------------|
| `'History is not enabled. Run "pt init"...'` | history.ts, run.ts | historyDir not configured | Run pt init and enable history |
| `'Annotations not enabled. Run "pt init"...'` | annotate.ts | annotationDir not configured | Run pt init and enable annotations |

#### Proposed Enhanced Messages

| New Error Message | Condition | User Action |
|------------------|-----------|-------------|
| `📝 History tracking is not enabled\n\nEnable it:\n  1. Run 'pt init'\n  2. Answer 'yes' to "Enable prompt history?"\n\nBenefits:\n  • Track all your prompts\n  • Re-run previous prompts\n  • Add annotations` | History not configured | Clear benefits and setup steps |
| `🏷️  Annotations require history to be enabled\n\nSetup:\n  1. Run 'pt init'\n  2. Enable both history and annotations\n\nUse annotations to:\n  • Track prompt success/failure\n  • Add tags for organization\n  • Record detailed notes` | Annotations not configured | Explain feature benefits |

### 4. Operation Failures

#### Current Messages

| Error Message | Location | Condition | User Action |
|--------------|----------|-----------|-------------|
| `'Failed to save prompt to history: ${error}'` | history-manager.ts | File write error | Check permissions, disk space |
| `'Failed to create prompt: ${error}'` | add.ts | File creation error | Check directory permissions |
| `'Failed to open editor: ${error}'` | edit.ts | Editor launch failed | Verify editor path is correct |
| `'Tool not found: ${tool}'` | run.ts | Missing executable | Install tool or use correct name |

#### Proposed Enhanced Messages

| New Error Message | Condition | User Action |
|------------------|-----------|-------------|
| `❌ Failed to save history\n\nError: ${error.message}\n\nTroubleshooting:\n  • Check directory exists: ${dir}\n  • Verify write permissions\n  • Ensure disk has space\n  • Try: mkdir -p "${dir}" && chmod 755 "${dir}"` | History save failure | Specific troubleshooting steps |
| `❌ Tool '${tool}' not found\n\nPossible issues:\n  • Tool not installed\n  • Tool not in PATH\n  • Typo in tool name\n\nTry:\n  • which ${tool} (check if installed)\n  • npm install -g ${tool} (if npm package)\n  • Use full path: /usr/local/bin/${tool}` | Executable not found | Multiple solutions with commands |

### 5. Validation Errors

#### Current Messages

| Error Message | Location | Condition | User Action |
|--------------|----------|-----------|-------------|
| `'Title is required'` | add.ts | Empty title input | Provide a title |
| `'Invalid format'` | helpers/index.ts | Failed validation | Enter valid format |

#### Proposed Enhanced Messages

| New Error Message | Condition | User Action |
|------------------|-----------|-------------|
| `📝 Title is required\n\nExamples:\n  • "API Client Generator"\n  • "React Component Builder"\n  • "Database Schema Designer"\n\nTip: Use descriptive names for easy searching` | Empty title | Provide examples and tips |
| `❌ Invalid format: ${input}\n\nExpected: ${format}\nExample: ${example}\n\nCommon formats:\n  • Email: user@example.com\n  • URL: https://example.com\n  • Date: YYYY-MM-DD` | Validation failure | Show expected format with examples |

## Implementation Guidelines

### Consistent Error Format

All errors should follow this structure:
```typescript
class PromptToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestions: string[],
    public command?: string
  ) {
    super(message);
  }
}

// Example usage:
throw new PromptToolError(
  'No prompts found',
  'NO_PROMPTS',
  [
    'Run "pt add" to create a new prompt',
    'Create a .md file in your prompt directory',
    'Run "pt example" for a sample'
  ],
  'pt add'
);
```

### Error Display Function

```typescript
function displayError(error: PromptToolError | Error) {
  console.error(chalk.red('❌ Error:'), error.message);
  
  if (error instanceof PromptToolError) {
    if (error.suggestions.length > 0) {
      console.error(chalk.yellow('\n💡 Suggestions:'));
      error.suggestions.forEach(s => 
        console.error(chalk.dim(`   • ${s}`))
      );
    }
    
    if (error.command) {
      console.error(chalk.green(`\n▶️  Try: ${error.command}`));
    }
  }
  
  if (process.env.DEBUG) {
    console.error(chalk.dim('\nStack trace:'));
    console.error(chalk.dim(error.stack));
  }
}
```

### Error Categories and Icons

| Category | Icon | Color | Use Case |
|----------|------|-------|----------|
| Not Found | 🔍 | Yellow | Missing resources |
| Configuration | ⚙️ | Blue | Setup issues |
| Permission | 🔒 | Red | Access denied |
| Validation | ✏️ | Orange | Input errors |
| Feature | 🎯 | Purple | Not enabled |
| Network | 🌐 | Cyan | Connection issues |
| Success | ✅ | Green | Operation completed |

### Progressive Disclosure

1. **Level 1**: Brief error message with icon
2. **Level 2**: Specific suggestions (always shown)
3. **Level 3**: Detailed troubleshooting (on --verbose)
4. **Level 4**: Stack trace (on --debug or DEBUG=true)

### Help Integration

Every error should link to relevant help:
- Include command to get more help: `Run 'pt help <command>' for more info`
- Link to specific documentation sections
- Provide inline examples where appropriate

### Testing Error Messages

Each error should be tested for:
1. Clarity - Can a new user understand what went wrong?
2. Actionability - Is it clear what to do next?
3. Tone - Friendly and helpful, not accusatory
4. Completeness - All necessary information included
5. Consistency - Follows the established pattern

## Phase 10 Implementation Priority

1. **High Priority**: Errors that new users encounter first
   - No prompts found
   - Configuration missing
   - Tool not found

2. **Medium Priority**: Common operational errors
   - History not enabled
   - Editor not configured
   - File permissions

3. **Low Priority**: Edge cases
   - Validation errors
   - Corrupted files
   - System errors

## Examples of Enhanced Error Messages

### Before:
```
Error: No prompts found. Create a prompt file in one of these directories:
  - ./prompts
```

### After:
```
🔍 No prompts found in: ./prompts

✨ Get started with prompt-tool:
   • Run 'pt add' to create a new prompt interactively
   • Run 'pt example' to generate a sample prompt
   • Create a .md file in ./prompts manually

📚 Learn more: pt help add
```

### Before:
```
Error: Tool not found: claudee
```

### After:
```
❌ Tool 'claudee' not found

Did you mean 'claude'?

Troubleshooting:
   • Check spelling: Did you mean one of these?
     - claude
     - code
   • Verify installation: which claudee
   • Install if needed: npm install -g claude
   • Use full path: /usr/local/bin/claude

▶️  Try: pt run claude
```