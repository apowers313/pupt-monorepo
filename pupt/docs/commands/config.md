# pt config

View and modify PUPT configuration settings. This command helps you inspect your current configuration and fix path portability issues.

## Synopsis

```bash
pt config [options]
```

## Purpose

The `config` command:
- Displays current configuration with resolved paths
- Shows which directories exist and which are missing
- Converts absolute paths to portable format for team sharing
- Validates configuration accessibility

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--show` | `-s` | Show current configuration with resolved paths (default behavior) |
| `--fix-paths` | | Convert absolute paths to portable format (`${projectRoot}/...` or `~/...`) |
| `--help` | `-h` | Show help information |

## Examples

### View Current Configuration
```bash
# Display configuration (default behavior)
pt config

# Explicitly show configuration
pt config --show
```

Output example:
```
Current Configuration
──────────────────────────────────────────────────

Config file: /home/user/project/.pt-config.json

Prompt Directories:
  ✓ ./.prompts
  ✓ node_modules/my-prompts/templates
  ✗ /nonexistent/path

History Directory: ✓ /home/user/.pt/history
Annotation Directory: ✓ /home/user/.pt/history
Git Prompt Directory: .git-prompts

Default Command: claude
Default Args: --model claude-sonnet-4-20250514

Auto Run: enabled
```

The `✓` indicates the directory exists, while `✗` indicates it's missing.

### Fix Non-Portable Paths
```bash
# Convert absolute paths to portable format
pt config --fix-paths
```

This converts paths like:
- `/home/user/project/.prompts` → `${projectRoot}/.prompts`
- `/home/user/.pt/history` → `~/.pt/history`
- `node_modules/pkg/prompts` → kept as-is (already relative)

Output example:
```
✓ Config paths updated to portable format
  Updated: /home/user/project/.pt-config.json

Updated paths:
  promptDirs:
    - ${projectRoot}/.prompts
    - node_modules/my-prompts/templates
  historyDir: ~/.pt/history
  annotationDir: ~/.pt/history
```

## Path Portability

### Why Portable Paths Matter

When working in a team or across multiple machines, absolute paths in configuration files cause issues:

```json
// Non-portable (absolute paths)
{
  "promptDirs": ["/home/alice/project/.prompts"],
  "historyDir": "/home/alice/.pt/history"
}
```

These paths won't work for other team members or on different machines.

### Portable Path Formats

The `--fix-paths` option converts paths to portable formats:

| Original | Converted | Description |
|----------|-----------|-------------|
| `/home/user/project/.prompts` | `${projectRoot}/.prompts` | Paths under project root |
| `/home/user/.pt/history` | `~/.pt/history` | Paths under home directory |
| `node_modules/pkg/prompts` | `node_modules/pkg/prompts` | Already relative, kept as-is |
| `/opt/shared/prompts` | `/opt/shared/prompts` | Outside home/project, warning shown |

### Automatic Warnings

When loading a configuration with absolute paths, PUPT warns:
```
Warning: Configuration contains non-portable absolute paths that may not work across machines:
  - /home/user/project/.prompts

Run 'pt config --fix-paths' to convert to portable format.
```

## Configuration Discovery

PUPT uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) to find configuration files:

1. `.pt-config.json` in current directory
2. `.pt-config.yaml` in current directory
3. `.pt-config.js` in current directory
4. Search continues in parent directories

The first configuration file found is used ("first match wins").

### Monorepo Support

In a monorepo structure:
```
monorepo/
├── .pt-config.json       # Root config
├── packages/
│   └── app/
│       ├── .pt-config.json  # App-specific config
│       └── src/
```

Running `pt` in `packages/app/src/` will use `packages/app/.pt-config.json`.

## Common Issues

### No Config File Found
```bash
# Create initial configuration
pt init

# Or check which config would be used
pt config
```

### Paths Outside Project Root
When paths are absolute and outside both project root and home directory:
```
Warning: Path "/opt/shared/prompts" is absolute and outside the project root.
Consider using a relative path or symlink within your project.
```

Solutions:
1. Create a symlink: `ln -s /opt/shared/prompts ./shared-prompts`
2. Use a relative path from the config location
3. Keep the absolute path if it's intentionally machine-specific

### Permission Errors
```bash
# Check file permissions
ls -la .pt-config.json

# Ensure write access for --fix-paths
chmod 644 .pt-config.json
```

## Related Commands

- [`pt init`](/commands/init) - Create initial configuration
- [`pt install`](/commands/install) - Install prompts (updates config)
- [`pt help`](/commands/help) - Get help on commands

## Next Steps

After reviewing configuration:
1. Fix portable paths with `pt config --fix-paths` if needed
2. Commit `.pt-config.json` to version control for team sharing
3. Run `pt init` to reconfigure settings interactively
