# pt edit

Edit existing prompt files in your configured editor. This command provides an easy way to modify prompts with search and selection capabilities.

## Synopsis

```bash
pt edit [prompt-name] [options]
```

## Purpose

The `edit` command:
- Opens prompts in your preferred editor
- Supports interactive selection
- Allows direct file path editing
- Validates edits after saving
- Maintains prompt metadata
- Supports batch editing

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--editor <editor>` | `-e` | Override default editor |
| `--search <query>` | `-s` | Search for prompt to edit |
| `--all` | `-a` | Open all matching prompts |
| `--validate` | `-v` | Validate after editing |
| `--help` | `-h` | Show help information |

## Usage Modes

### Interactive Selection
```bash
# Browse and select prompt
pt edit
```
- Shows searchable prompt list
- Preview before selection
- Opens selected prompt in editor

### Direct Edit
```bash
# Edit by name or path
pt edit api-client
pt edit frontend/component.md
pt edit ~/.prompts/review.md
```

### Search and Edit
```bash
# Find and edit matching prompt
pt edit --search "api documentation"

# Edit all matching prompts
pt edit --search "review" --all
```

## Examples

### Basic Editing
```bash
# Interactive selection
pt edit

# Edit specific prompt
pt edit code-review

# Edit with full path
pt edit ./prompts/templates/api.md
```

### Advanced Usage
```bash
# Use specific editor
pt edit api-client --editor "code --wait"

# Search and edit
pt edit -s "typescript"

# Edit multiple files
pt edit -s "api" --all
```

### Validation
```bash
# Validate after editing
pt edit buggy-prompt.md --validate

# Check syntax without opening
pt edit broken.md --validate --dry-run
```

## Editor Integration

### VS Code
```bash
# Single file
export EDITOR="code --wait"

# Multiple files
export EDITOR="code --wait --new-window"
```

### Vim/Neovim
```bash
# Vim
export EDITOR="vim"

# Neovim with config
export EDITOR="nvim -u ~/.config/nvim/init.lua"
```

### Other Editors
```bash
# Sublime Text
export EDITOR="subl --wait"

# Emacs
export EDITOR="emacs"

# Nano
export EDITOR="nano"
```

## Search Features

### Fuzzy Search
- Partial word matching
- Case-insensitive
- Searches title, labels, and content

### Search Examples
```bash
# Find "review" prompts
pt edit -s rev

# Find by label
pt edit -s "#typescript"

# Complex search
pt edit -s "api client generator"
```

## Batch Editing

### Edit Multiple Files
```bash
# Open all API-related prompts
pt edit -s api --all

# Edit all prompts in subdirectory
pt edit "frontend/*" --all
```

### Scripted Edits
```bash
# Find and replace across prompts
for prompt in $(pt list -s api); do
  pt edit "$prompt"
done
```

## Validation Features

### Syntax Checking
- YAML frontmatter validation
- Template helper verification
- Variable definition checks

### Validation Output
```
✓ Valid YAML frontmatter
✓ All variables properly defined
✓ Template helpers correct
⚠ Warning: Unused variable 'apiKey'
```

## Common Workflows

### Updating Metadata
```bash
# Update labels across prompts
pt edit -s "old-label" --all
# Then: Update labels in frontmatter
```

### Refactoring Templates
```bash
# Find prompts using old helper
pt edit -s "&lbrace;&lbrace;oldHelper" --all
# Then: Update to new helper syntax
```

### Version Updates
```bash
# Update prompt versions
pt edit important-prompt.md
# Then: Update version in frontmatter
```

## Tips and Tricks

### Quick Edits
```bash
# Last edited prompt
pt edit $(pt history -l 1 --format json | jq -r '.prompt.path')

# Most used prompt
pt edit $(pt review --format json | jq -r '.[0].name')
```

### Editor Productivity
```bash
# Open in split view (VS Code)
export EDITOR="code --wait --diff"

# Open at specific line
export EDITOR="vim +10"  # Line 10
```

### Safety Measures
```bash
# Backup before editing
cp prompt.md prompt.md.bak && pt edit prompt.md

# Git tracking
git add prompts/ && pt edit my-prompt.md
```

## Troubleshooting

### Editor Not Opening
```bash
# Debug editor detection
pt edit --debug

# Check environment
echo $EDITOR
echo $VISUAL

# Force specific editor
pt edit -e nano
```

### File Not Found
```bash
# List available prompts
pt list

# Check prompt directories
cat .pt-config.json | jq '.promptDirs'
```

### Permission Issues
```bash
# Check file permissions
ls -la prompts/

# Fix permissions
chmod 644 prompts/*.md
```

## Best Practices

1. **Version Control**: Commit before major edits
2. **Validation**: Always validate after complex changes
3. **Backups**: Keep backups of important prompts
4. **Comments**: Document changes in prompts
5. **Testing**: Test edited prompts immediately

## Related Commands

- [`pt`](/commands/pt) - Test edited prompts
- [`pt add`](/commands/add) - Create new prompts
- [`pt history`](/commands/history) - See prompt usage
- [`pt run`](/commands/run) - Execute edited prompts

## Configuration

Edit behavior can be customized:

```json
{
  "editor": "code --wait",
  "editOptions": {
    "validate": true,
    "backup": true,
    "openInNewWindow": false
  }
}
```

## Next Steps

After editing:
1. Test changes with [`pt`](/commands/pt)
2. Validate syntax if needed
3. Commit changes to version control
4. Share updates with team