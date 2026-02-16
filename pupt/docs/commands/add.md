# pt add

Create new prompt files interactively with metadata and template structure. This command guides you through creating well-formatted prompts that integrate seamlessly with PUPT.

## Synopsis

```bash
pt add [filename] [options]
```

## Purpose

The `add` command:
- Creates new prompt files with proper structure
- Generates YAML frontmatter with metadata
- Opens your editor with a template
- Validates prompt syntax
- Saves to configured prompt directories
- Supports team collaboration features

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--dir <path>` | `-d` | Target directory for new prompt |
| `--title <title>` | `-t` | Set prompt title |
| `--tags <tags>` | `-t` | Comma-separated tags |
| `--editor <editor>` | `-e` | Override default editor |
| `--template <name>` | | Use specific prompt template |
| `--no-edit` | | Skip opening editor |
| `--help` | `-h` | Show help information |

## Interactive Process

### 1. Filename
```
? Prompt filename: api-documentation.md
```
- Must end with `.md`
- Supports subdirectories: `docs/api.md`
- Auto-suggests based on title

### 2. Metadata Collection
```
? Title: API Documentation Generator
? Description: Generate comprehensive API docs
? Tags (comma-separated): api, documentation, openapi
? Author: (auto-detected from git)
```

### 3. Variable Definition (Optional)
```
? Add variable definitions? (y/N)
? Variable name: apiName
? Type: (input) 
? Message: What is the API name?
? Default value: MyAPI
```

### 4. Editor Launch
- Opens configured editor
- Pre-filled with template
- Saves on editor close

## Examples

### Basic Usage
```bash
# Interactive prompt creation
pt add

# With filename
pt add code-review.md
```

### With Metadata
```bash
# Complete prompt creation
pt add api-client.md \
  --title "API Client Generator" \
  --tags "api,typescript,client"
```

### Quick Creation
```bash
# Skip editor, create basic prompt
pt add quick-note.md --no-edit

# Use specific template
pt add react-component.md --template react
```

### Organization
```bash
# Create in subdirectory
pt add frontend/component.md

# Specify target directory
pt add test.md --dir ~/team-prompts
```

## Prompt Templates

### Default Template
```markdown
---
title: &lbrace;&lbrace;title&rbrace;&rbrace;
description: &lbrace;&lbrace;description&rbrace;&rbrace;
tags: [&lbrace;&lbrace;tags&rbrace;&rbrace;]
author: &lbrace;&lbrace;author&rbrace;&rbrace;
created: &lbrace;&lbrace;date&rbrace;&rbrace;
---

# &lbrace;&lbrace;title&rbrace;&rbrace;

[Describe what this prompt does]

## Context

[Provide context or background information]

## Requirements

[List specific requirements or constraints]

## Instructions

[Main prompt content goes here]

&lbrace;&lbrace;!-- Example variable usage:
&lbrace;&lbrace;input "variable" "Prompt message"&rbrace;&rbrace;
--&rbrace;&rbrace;
```

### Custom Templates

Create custom templates in `~/.pt/templates/`:

```markdown
---
title: &lbrace;&lbrace;title&rbrace;&rbrace;
tags: [react, component]
variables:
  - name: componentName
    type: input
    message: "Component name:"
    validate: "^[A-Z][a-zA-Z0-9]*$"
---

# Generate React Component: &lbrace;&lbrace;componentName&rbrace;&rbrace;

...
```

## Frontmatter Schema

### Required Fields
- `title`: Display name for the prompt

### Optional Fields
- `description`: Brief description
- `tags`: Array of tags
- `author`: Prompt author
- `created`: Creation date
- `modified`: Last modified date
- `version`: Prompt version
- `variables`: Pre-defined variables

### Variables Schema
```yaml
variables:
  - name: variableName
    type: input|select|multiselect|confirm|editor|password|file
    message: "User prompt"
    default: "Default value"
    required: true|false
    validate: "regex pattern"
    choices: ["option1", "option2"]  # for select types
```

## File Naming Conventions

### Recommended Patterns
- **Feature-based**: `generate-api-client.md`
- **Type-based**: `review-code.md`
- **Category folders**: `frontend/react-component.md`

### Avoid
- Spaces in filenames (use hyphens)
- Special characters
- Very long names

## Editor Configuration

### Supported Editors
Detected in order:
1. `--editor` flag
2. `$VISUAL` environment variable
3. `$EDITOR` environment variable
4. Common editors: `code`, `vim`, `nano`

### Editor Settings
```bash
# VS Code
export EDITOR="code --wait"

# Vim
export EDITOR="vim"

# Sublime Text
export EDITOR="subl --wait"
```

## Validation

The add command validates:
- Filename format
- YAML frontmatter syntax
- Variable definitions
- Template helper usage
- File permissions

## Tips

### Efficient Creation
```bash
# Create multiple related prompts
for type in create read update delete; do
  pt add "api-${type}.md" --tags "api,crud"
done
```

### Team Collaboration
```bash
# Add team metadata
pt add feature.md \
  --title "Feature: User Authentication" \
  --tags "feature,auth,team"
```

### Template Development
```bash
# Test template syntax
pt add test.md --no-edit
pt  # Run to test
```

## Common Issues

### Editor Not Opening
```bash
# Check editor configuration
echo $EDITOR

# Set editor
export EDITOR="code --wait"

# Use explicit editor
pt add test.md --editor nano
```

### Invalid YAML
```yaml
# Correct: Quoted strings with colons
description: "Feature: Authentication"

# Incorrect: Unquoted with colon
description: Feature: Authentication
```

### Permission Denied
```bash
# Check directory permissions
ls -la ./prompts

# Create directory if needed
mkdir -p ./prompts
```

## Best Practices

1. **Descriptive Titles**: Use clear, searchable titles
2. **Consistent Tags**: Establish team tagging conventions
3. **Variable Documentation**: Comment complex variables
4. **Version Control**: Commit prompts to git
5. **Template Reuse**: Create templates for common patterns

## Related Commands

- [`pt`](/commands/pt) - Use created prompts
- [`pt edit`](/commands/edit) - Modify existing prompts
- [`pt install`](/commands/install) - Get prompts from others

## Next Steps

After creating a prompt:
1. Test it with [`pt`](/commands/pt)
2. Share via [`pt install`](/commands/install)
3. Track usage with [`pt history`](/commands/history)