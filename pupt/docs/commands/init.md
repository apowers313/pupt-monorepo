# pt init

Initialize or reconfigure PUPT settings interactively. This command helps you set up PUPT for first-time use or modify existing configurations.

## Synopsis

```bash
pt init [options]
```

## Purpose

The `init` command:
- Creates initial configuration files
- Sets up prompt directories
- Configures history and annotation tracking
- Establishes default tool preferences
- Validates existing configurations
- Migrates configurations from older versions

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--force` | `-f` | Overwrite existing configuration without prompting |
| `--dir <path>` | `-d` | Initialize in specific directory (default: current) |
| `--minimal` | `-m` | Create minimal configuration (skip optional features) |
| `--preset <name>` | `-p` | Use configuration preset (team, personal, minimal) |
| `--help` | `-h` | Show help information |

## Interactive Setup Process

### 1. Configuration Location
```
? Where should the configuration be saved?
  ❯ Current directory (./.pt-config.json)
    Home directory (~/.pt-config.json)
    Custom location
```

### 2. Prompt Directories
```
? Where should prompt files be stored? (comma-separated)
  ❯ ./.prompts
    ~/.prompts
    ./.prompts, ~/.prompts
    Custom paths
```

### 3. History Tracking
```
? Enable prompt history tracking? (Y/n)
? History directory: (~/.pt/history)
```

### 4. Annotation Support
```
? Enable annotations for history? (Y/n)
? Annotation directory: (~/.pt/history)
```

### 5. Default Tool Configuration
```
? Default AI tool: (claude)
? Default arguments: (--model claude-3)
? Interactive options:
  ✓ Continue with context? (--continue)
  ✓ Use verbose output? (--verbose)
  ✓ Enable streaming? (--stream)
```

## Examples

### First-Time Setup
```bash
# Interactive setup wizard
pt init

# Minimal setup (prompts only)
pt init --minimal
```

### Reconfigure Existing Setup
```bash
# Force overwrite existing config
pt init --force

# Initialize in specific directory
pt init --dir ~/projects/my-app
```

### Using Presets
```bash
# Team configuration preset
pt init --preset team

# Personal configuration preset
pt init --preset personal
```

### Non-Interactive Setup
```bash
# Create default configuration
echo '{
  "promptDirs": ["./prompts"],
  "historyDir": "~/.pt/history"
}' > .pt-config.json
```

## Configuration Presets

### Team Preset
```json
{
  "promptDirs": ["./team-prompts", "~/.pt/personal"],
  "historyDir": "~/.pt/history",
  "annotationDir": "~/.pt/history",
  "defaultCmd": "claude",
  "gitPromptDir": "~/.pt/shared-prompts",
  "logLevel": "info"
}
```

### Personal Preset
```json
{
  "promptDirs": ["~/.prompts"],
  "historyDir": "~/.pt/history",
  "defaultCmd": "claude",
  "autoRun": false
}
```

### Minimal Preset
```json
{
  "promptDirs": ["./prompts"]
}
```

## File Structure Created

After initialization:
```
.
├── .pt-config.json      # Configuration file
├── prompts/            # Prompt directory (if created)
│   └── example.md      # Example prompt (optional)
└── .pt/                # PUPT data directory
    ├── history/        # Execution history
    └── annotations/    # History annotations
```

## Migration from Older Versions

The init command automatically detects and migrates:

### v1.x to v2.x
- Renames `codingTool` → `defaultCmd`
- Converts old history format
- Updates configuration schema

### v2.x to v3.x
- Adds new configuration options
- Preserves existing settings
- Creates backup of old config

## Validation

The init command validates:
- Directory permissions
- Path accessibility
- Configuration syntax
- Tool availability
- Git repository status

## Environment Variables

Init respects these environment variables:
- `PT_CONFIG_PATH`: Override config search path
- `EDITOR`: Default editor for prompts
- `HOME`: User home directory

## Common Issues

### Permission Denied
```bash
# Check directory permissions
ls -la ~/.pt

# Create with proper permissions
mkdir -p ~/.pt && chmod 755 ~/.pt
```

### Configuration Not Found
```bash
# Verify file exists
ls -la .pt-config.*

# Check search paths
pt init --debug
```

### Invalid Configuration
```bash
# Validate JSON syntax
cat .pt-config.json | jq .

# Recreate configuration
pt init --force
```

## Best Practices

1. **Project-Specific Config**: Run `pt init` in project root
2. **Global Config**: Use `~/.pt-config.json` for personal settings
3. **Team Sharing**: Commit `.pt-config.json` to version control
4. **Backup**: Save configuration before major changes

## Related Commands

- [`pt`](/commands/pt) - Use configured prompts
- [`pt add`](/commands/add) - Add prompts to configured directories
- [`pt help`](/commands/help) - Get help on configuration

## Next Steps

After initialization:
1. Create your first prompt with [`pt add`](/commands/add)
2. Test the setup with [`pt`](/commands/pt)
3. Configure your AI tool with [`pt run`](/commands/run)