# pt history

View and manage your prompt execution history. This command provides insights into past prompt usage, execution results, and patterns.

## Synopsis

```bash
pt history [entry] [options]
```

## Purpose

The `history` command:
- Lists recent prompt executions
- Shows detailed execution information
- Enables re-running previous prompts
- Provides search and filtering capabilities
- Exports history for analysis
- Manages history storage

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--limit <n>` | `-l` | Number of entries to show (default: 20) |
| `--all` | `-a` | Show all history entries |
| `--result <n>` | `-r` | Show history entry with its output |
| `--annotations` | | Show annotations for the history entry |
| `--dir <path>` | `-d` | Filter history by directory (git dir or working dir) |
| `--all-dir` | | Show history from all directories (disable default filtering) |
| `--help` | `-h` | Show help information |

## Directory Filtering

By default, `pt history` filters entries to show only those from the current git repository (or working directory if not in a git repo). This is useful when working with git worktrees or multiple projects that share the same history directory.

### Default Behavior
```bash
# Shows history filtered by current git directory (or cwd if not in git repo)
pt history
```

### Filter by Specific Directory
```bash
# Filter by a specific git directory path
pt history -d /home/user/project/.git

# Filter by a specific working directory
pt history -d /home/user/project
```

### Show All Directories
```bash
# Show history from all directories (no filtering)
pt history --all-dir
```

## Usage Modes

### List Recent History
```bash
# Show last 20 entries (default, filtered by current directory)
pt history

# Show more entries
pt history -l 50

# Show all entries from current directory
pt history -a

# Show all entries from all directories
pt history -a --all-dir
```

### View Specific Entry
```bash
# View entry by ID
pt history 42

# View last entry
pt history -l 1
```

### Search History
```bash
# Search by content
pt history -s "api documentation"

# Search by prompt name
pt history -p code-review

# Search last week
pt history -d 7 -s "bug fix"
```

## Output Formats

### Table Format (Default)
```
ID   Date        Time     Prompt              Tool    Status
---  ----------  -------  -----------------  ------  -------
42   2024-01-15  10:30am  api-documentation  claude  ✓
41   2024-01-15  09:45am  code-review        gpt     ✓
40   2024-01-15  09:00am  bug-analysis       claude  ✗
```

### JSON Format
```bash
pt history -f json | jq '.[] | select(.status == 0)'
```

### CSV Format
```bash
pt history -f csv > history.csv
```

### YAML Format
```bash
pt history -f yaml
```

## History Entry Details

Each history entry contains:
- **ID**: Unique identifier
- **Timestamp**: Execution date/time
- **Prompt**: Name and path
- **Variables**: Input values (masked sensitive)
- **Tool**: Command executed
- **Arguments**: Tool arguments
- **Status**: Exit code
- **Duration**: Execution time
- **Output**: Captured output (if enabled)
- **Annotations**: User notes

## Examples

### Basic Usage
```bash
# View recent history
pt history

# View specific entry
pt history 100

# Search for API prompts
pt history -s api
```

### Filtering
```bash
# Last 7 days
pt history -d 7

# Failed executions only
pt history --status 1

# Specific prompt
pt history -p "code-review" -l 20
```

### Analysis
```bash
# Export for analysis
pt history -f json | jq '[.[] | {prompt: .prompt.name, count: 1}] | group_by(.prompt) | map({prompt: .[0].prompt, count: length})'

# Find slowest executions
pt history -f json | jq 'sort_by(.duration) | reverse | .[0:5]'
```

### Re-execution
```bash
# Get command from history
pt history 42 -f json | jq -r '.command'

# Re-run with same inputs
pt run -h 42
```

## Search Capabilities

### Search Scope
- Prompt name
- Prompt content
- Variable values
- Tool name
- Annotations

### Search Examples
```bash
# Find by keyword
pt history -s "typescript"

# Complex search
pt history -s "api AND documentation"

# Exclude term
pt history -s "review -code"
```

## History Management

### Storage Location
```bash
# Default location
~/.pt/history/
├── 2024-01-15-103045-42.json
├── 2024-01-15-094530-41.json
└── 2024-01-15-090015-40.json
```

### Clear History
```bash
# Clear all history (confirmation required)
pt history --clear

# Clear old entries
find ~/.pt/history -mtime +30 -delete
```

### Backup History
```bash
# Backup history
tar -czf history-backup.tar.gz ~/.pt/history/

# Export specific period
pt history -d 30 -f json > last-month.json
```

## Integration Examples

### With Review Command
```bash
# Review based on history
pt history -f json | pt review -

# Generate usage report
pt history -d 30 -f json | \
  jq 'group_by(.prompt.name) | 
      map({prompt: .[0].prompt.name, count: length})'
```

### With External Tools
```bash
# Send to spreadsheet
pt history -f csv | column -t -s,

# Visualize with gnuplot
pt history -f csv | gnuplot -e "plot '-' using 1:5"
```

### Automation
```bash
#!/bin/bash
# Daily history summary
pt history -d 1 -f json | \
  jq '{
    total: length,
    successful: [.[] | select(.status == 0)] | length,
    failed: [.[] | select(.status != 0)] | length,
    prompts: [.[] | .prompt.name] | unique
  }'
```

## Privacy and Security

### Sensitive Data
- Passwords are automatically masked
- API keys are redacted
- Custom patterns can be configured

### Masking Configuration
```json
{
  "history": {
    "maskPatterns": [
      "password",
      "apiKey",
      "secret",
      "token"
    ]
  }
}
```

### Disable History
```json
{
  "historyDir": null
}
```

## Common Issues

### History Not Saving
```bash
# Check configuration
cat .pt-config.json | jq '.historyDir'

# Verify permissions
ls -la ~/.pt/history/

# Enable history
pt init  # Reconfigure with history
```

### Large History Files
```bash
# Check size
du -sh ~/.pt/history/

# Archive old entries
mkdir ~/.pt/history-archive
mv ~/.pt/history/2023-* ~/.pt/history-archive/
```

### Corrupted Entries
```bash
# Find corrupted files
for f in ~/.pt/history/*.json; do
  jq . "$f" > /dev/null || echo "Corrupted: $f"
done
```

## Best Practices

1. **Regular Cleanup**: Archive old history periodically
2. **Annotation**: Add notes to important executions
3. **Analysis**: Review patterns monthly
4. **Backup**: Keep history backups
5. **Privacy**: Configure masking for sensitive data

## Related Commands

- [`pt run`](/commands/run) - Execute prompts
- [`pt annotate`](/commands/annotate) - Add notes to history
- [`pt review`](/commands/review) - Analyze usage patterns

## Configuration

History behavior can be customized:

```json
{
  "historyDir": "~/.pt/history",
  "history": {
    "retention": 90,  // days
    "maxEntries": 10000,
    "captureOutput": false,
    "maskSensitive": true
  }
}
```

## Next Steps

1. Review your prompt usage patterns
2. Add annotations to important executions
3. Export history for team analysis
4. Set up automated reporting