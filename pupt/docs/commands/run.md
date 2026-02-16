# pt run

Execute prompts with AI tools and external commands. This command integrates PUPT with your preferred AI assistants and development tools.

## Synopsis

```bash
pt run [tool] [options] [-- tool-args]
```

## Purpose

The `run` command:
- Executes generated prompts with AI tools
- Pipes prompt output to external commands
- Manages tool configurations and options
- Captures execution history
- Supports output capture and analysis
- Enables prompt automation workflows

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--history <number>` | `-h` | Re-run specific history entry |
| `--file <path>` | `-f` | Run prompt from file |
| `--capture` | `-c` | Capture command output |
| `--no-save` | | Don't save to history |
| `--timeout <ms>` | `-t` | Command timeout (default: none) |
| `--retry <count>` | `-r` | Retry on failure |
| `--help` | | Show help information |

## Arguments

- `tool`: Command to execute (optional, uses default if not specified)
- `tool-args`: Additional arguments passed to the tool after `--`

## Usage Patterns

### Default Tool
```bash
# Use configured default tool
pt run

# With prompt selection
pt  # Select prompt
pt run  # Execute with default tool
```

### Specific Tools
```bash
# Claude
pt run claude

# OpenAI GPT
pt run gpt

# Kiro
pt run kiro

# VS Code
pt run code -

# Custom command
pt run curl -X POST https://api.example.com/prompt
```

### Tool Arguments
```bash
# Pass additional arguments
pt run claude -- --model claude-3-opus

# Multiple arguments
pt run gpt -- --temperature 0.7 --max-tokens 2000

# Complex command
pt run -- python scripts/process.py --input -
```

### History Re-execution
```bash
# Re-run last execution
pt run -h 1

# Re-run specific entry
pt run -h 42

# Re-run with different tool
pt run gpt -h 10
```

## Examples

### Basic Execution
```bash
# Interactive flow
pt                    # Select prompt
pt run               # Execute with default

# One-liner
pt | pt run claude   # Select and run
```

### Advanced Usage
```bash
# Capture output
pt run claude --capture

# Run with timeout
pt run slow-api --timeout 30000  # 30 seconds

# Retry on failure
pt run flaky-service --retry 3
```

### File-based Execution
```bash
# Run existing prompt file
pt run -f ./prompts/review.md

# Run generated prompt
pt > temp.md && pt run -f temp.md
```

### Piping and Redirection
```bash
# Save response
pt run claude > response.md

# Process response
pt run gpt | jq '.choices[0].text'

# Chain commands
pt run claude | pt run gpt  # Claude then GPT
```

## Tool Configuration

### Default Tool Setup
```json
{
  "defaultCmd": "claude",
  "defaultCmdArgs": ["--model", "claude-3-opus"],
  "defaultCmdOptions": {
    "Continue with context?": "--continue",
    "Use verbose output?": "--verbose"
  }
}
```

### Tool-specific Configs
```json
{
  "tools": {
    "claude": {
      "command": "claude",
      "args": ["--model", "claude-3-opus"],
      "timeout": 60000
    },
    "gpt": {
      "command": "openai",
      "args": ["api", "completions.create"],
      "env": {
        "OPENAI_API_KEY": "$OPENAI_KEY"
      }
    }
  }
}
```

## Interactive Options

When running, PUPT may prompt for options:

```
? Continue with last context? (Y/n)
? Use verbose output? (y/N)
? Enable streaming? (y/N)
```

Configure these in `.pt-config.json`:
```json
{
  "defaultCmdOptions": {
    "Continue with context?": "--continue",
    "Verbose output?": "--verbose",
    "Stream responses?": "--stream"
  }
}
```

## Output Capture

### Enable Capture
```bash
# Capture this execution
pt run claude --capture

# Always capture (config)
{
  "outputCapture": {
    "enabled": true,
    "directory": "~/.pt/outputs"
  }
}
```

### Captured Files
```
~/.pt/outputs/
├── 2024-01-15-10-30-45-claude.txt
├── 2024-01-15-10-35-12-gpt.json
└── 2024-01-15-10-40-00-code.log
```

## History Integration

### Automatic Saving
- Prompt content
- Tool and arguments
- Execution timestamp
- Exit code
- Output (if captured)

### History Usage
```bash
# View recent runs
pt history

# Re-run from history
pt run -h 5

# Run with modifications
pt run claude -h 5 -- --temperature 0.9
```

## Error Handling

### Retry Logic
```bash
# Retry failed executions
pt run unreliable-api --retry 3

# With backoff
pt run api --retry 3 --retry-delay 1000
```

### Timeout Handling
```bash
# Set timeout
pt run slow-tool --timeout 30000

# No timeout (default)
pt run long-running-task
```

### Error Recovery
```bash
# Continue on error
pt run || echo "Failed, check logs"

# Conditional execution
pt run && echo "Success" || echo "Failed"
```

## Common Workflows

### Development Cycle
```bash
# Generate code
pt run claude > generated.js

# Review code
pt edit review-code.md
pt run -f review-code.md

# Test code
node generated.js
```

### Multi-tool Pipeline
```bash
# Generate with Claude
pt run claude > draft.md

# Refine with GPT
cat draft.md | pt run gpt > final.md

# Format output
cat final.md | pt run prettier
```

### Automation
```bash
#!/bin/bash
# Daily summary script
pt run -f daily-summary.md | mail -s "Daily Summary" team@example.com
```

## Best Practices

1. **Tool Selection**: Choose appropriate tools for tasks
2. **Argument Management**: Save common args in config
3. **Output Handling**: Capture important outputs
4. **Error Recovery**: Use retry for unreliable tools
5. **History Usage**: Leverage history for iterations

## Troubleshooting

### Tool Not Found
```bash
# Check if tool is installed
which claude

# Verify PATH
echo $PATH

# Use full path
pt run /usr/local/bin/claude
```

### Authentication Issues
```bash
# Check API keys
echo $CLAUDE_API_KEY

# Set in environment
export CLAUDE_API_KEY="sk-..."

# Or in config
pt init  # Re-configure tool
```

### Output Issues
```bash
# Debug output
pt run claude --debug

# Check stderr
pt run claude 2>&1

# Separate streams
pt run claude > out.txt 2> err.txt
```

## Advanced Features

### Custom Scripts
```bash
# Create wrapper script
cat > claude-wrapper.sh << 'EOF'
#!/bin/bash
echo "Prompt received:"
cat
echo "---"
claude "$@"
EOF

chmod +x claude-wrapper.sh
pt run ./claude-wrapper.sh
```

### Environment Variables
```bash
# Pass environment
API_KEY=xxx pt run api-tool

# Set in config
{
  "tools": {
    "api": {
      "env": {
        "API_KEY": "$MY_API_KEY"
      }
    }
  }
}
```

## Related Commands

- [`pt`](/commands/pt) - Select prompts to run
- [`pt history`](/commands/history) - View execution history
- [`pt review`](/commands/review) - Analyze execution patterns

## Next Steps

1. Configure your default tool with [`pt init`](/commands/init)
2. Create prompts optimized for your tools
3. Set up automation workflows
4. Review execution patterns with [`pt review`](/commands/review)