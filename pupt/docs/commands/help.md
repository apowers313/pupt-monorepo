# pt help

Display comprehensive help information for PUPT commands. This command provides detailed documentation, examples, and usage information.

## Synopsis

```bash
pt help [command] [options]
```

## Purpose

The `help` command:
- Shows general PUPT usage information
- Provides command-specific documentation
- Displays available options and flags
- Shows practical examples
- Lists keyboard shortcuts
- Explains configuration options

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--all` | `-a` | Show help for all commands |
| `--examples` | `-e` | Show extra examples |
| `--config` | `-c` | Show configuration help |
| `--markdown` | `-m` | Output in markdown format |
| `--help` | `-h` | Show help about help |

## Usage Modes

### General Help
```bash
# Show overview and command list
pt help

# Output:
PUPT - Powerful Universal Prompt Tool

Usage: pt [command] [options]

Commands:
  pt              Interactive prompt selection
  pt init         Initialize configuration
  pt add          Create new prompt
  pt edit         Edit existing prompt
  pt run          Execute with AI tool
  pt history      View execution history
  pt annotate     Add notes to history
  pt install      Install external prompts
  pt review       Analyze usage patterns
  pt help         Show help information

Run 'pt help <command>' for command details
```

### Command-Specific Help
```bash
# Get help for specific command
pt help run

# Alternative syntax
pt run --help
pt run -h
```

### Extended Examples
```bash
# Show extra examples
pt help run --examples

# Show all command examples
pt help --all --examples
```

## Help Topics

### Command Help
Each command help includes:
- **Description**: What the command does
- **Synopsis**: Usage syntax
- **Options**: Available flags and parameters
- **Examples**: Common usage patterns
- **Related**: Other relevant commands

### Configuration Help
```bash
# Show configuration options
pt help --config

# Topics covered:
- Configuration file formats
- Search paths
- Option descriptions
- Default values
- Environment variables
```

### Interactive Features
```bash
# Show keyboard shortcuts
pt help shortcuts

# Shortcuts include:
- Arrow keys: Navigate
- Enter: Select
- Tab: Auto-complete
- Ctrl+C: Cancel
- Esc: Go back
```

## Examples

### Basic Help
```bash
# General help
pt help

# Command help
pt help add
pt help run
pt help history
```

### Detailed Information
```bash
# All commands with examples
pt help --all --examples

# Markdown format for documentation
pt help --all --markdown > commands.md
```

### Learning Workflows
```bash
# New user flow
pt help init
pt help add
pt help run

# Advanced features
pt help annotate --examples
pt help review --examples
```

## Help Output Format

### Standard Format
```
pt run - Execute prompts with AI tools

SYNOPSIS
  pt run [tool] [options] [-- tool-args]

DESCRIPTION
  Executes generated prompts with AI tools...

OPTIONS
  -h, --history <n>    Re-run history entry
  -f, --file <path>    Run from file
  ...

EXAMPLES
  pt run              Use default tool
  pt run claude       Use Claude
  ...
```

### Markdown Format
```bash
# Generate markdown documentation
pt help run --markdown

# Full documentation
pt help --all --markdown > pupt-docs.md
```

## Configuration Topics

### Basic Configuration
```bash
pt help config

# Shows:
- File locations
- Basic options
- Prompt directories
- History settings
```

### Advanced Configuration
```bash
pt help config --advanced

# Shows:
- Tool configurations
- Custom helpers
- Auto-annotation rules
- Output capture settings
```

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl+C`: Exit/Cancel
- `Ctrl+D`: Exit (EOF)
- `Ctrl+L`: Clear screen

### Selection Interface
- `↑/↓`: Navigate options
- `Enter`: Select current
- `Tab`: Auto-complete
- `/`: Start search
- `Esc`: Cancel search

### Editor Shortcuts
- Depends on configured editor
- Usually `Ctrl+S`: Save
- Usually `Ctrl+Q`: Quit

## Common Help Queries

### Getting Started
```bash
# First time setup
pt help init

# Creating first prompt
pt help add --examples

# Running prompts
pt help run --examples
```

### Troubleshooting
```bash
# Configuration issues
pt help config

# History problems
pt help history

# Installation errors
pt help install
```

### Advanced Usage
```bash
# Team collaboration
pt help install --examples

# Automation
pt help run --examples | grep "script"

# Analysis
pt help review --examples
```

## Tips and Tricks

### Help Aliases
```bash
# Create help aliases
alias pth='pt help'
alias pthe='pt help --examples'

# Usage
pth run
pthe add
```

### Quick Reference
```bash
# Generate quick reference
pt help --all | grep "^  pt" > quick-ref.txt

# Command options only
pt help run | grep "^  -" > run-options.txt
```

### Team Documentation
```bash
# Generate team docs
cat > team-docs.md << EOF
# PUPT Usage Guide

$(pt help --all --markdown)

## Team Conventions
...
EOF
```

## Extending Help

### Custom Help Topics
Place markdown files in `~/.pt/help/`:
```bash
# Create custom help
echo "# Team Workflows" > ~/.pt/help/workflows.md

# Access custom help
pt help workflows
```

### Help Templates
```bash
# Create command template
cat > ~/.pt/help/template-command.md << 'EOF'
# Creating &lbrace;&lbrace;Type&rbrace;&rbrace; Prompts

Best practices for &lbrace;&lbrace;type&rbrace;&rbrace; prompts...
EOF
```

## Integration

### With Other Tools
```bash
# Search help
pt help --all | grep -i "search"

# Help in pager
pt help review | less

# Help in editor
pt help --all --markdown | code -
```

### Documentation Generation
```bash
#!/bin/bash
# Generate full docs
echo "# PUPT Documentation" > docs.md
echo "" >> docs.md
pt help --all --markdown >> docs.md
```

## Best Practices

1. **Check help first**: Before asking questions
2. **Use examples**: Learn from practical examples
3. **Read related**: Check "Related Commands" section
4. **Keep accessible**: Save help to files for offline access

## Error Messages

When commands fail, help is suggested:
```
Error: Unknown command 'foo'
Run 'pt help' to see available commands
```

## Related Resources

- **Documentation**: Full docs at project repository
- **Examples**: Example prompts in `~/.pt/examples`
- **Community**: Discussions and Q&A online

## Getting More Help

### Debug Mode
```bash
# Verbose output for troubleshooting
pt --debug [command]
```

### Version Information
```bash
# Check version
pt --version
```

### Support
- GitHub Issues: Report bugs
- Discussions: Ask questions
- Wiki: Community resources

## Next Steps

1. Explore available commands: `pt help --all`
2. Learn by example: `pt help [command] --examples`
3. Set up your environment: `pt help init`
4. Start creating prompts: `pt help add`