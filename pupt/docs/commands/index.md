# Commands Overview

PUPT provides a comprehensive set of commands to manage your AI prompts efficiently. All commands are accessed through the `pt` command-line interface.

## Command Structure

```bash
pt [command] [options] [arguments]
```

- **command**: The specific action to perform (optional - defaults to interactive prompt selection)
- **options**: Command-specific flags and modifiers
- **arguments**: Additional parameters required by the command

## Available Commands

| Command | Purpose | Quick Example |
|---------|---------|---------------|
| [`pt`](/commands/pt) | Interactive prompt selection and generation | `pt` |
| [`pt init`](/commands/init) | Initialize PUPT configuration | `pt init` |
| [`pt add`](/commands/add) | Create a new prompt file | `pt add my-prompt.md` |
| [`pt edit`](/commands/edit) | Edit existing prompts | `pt edit` |
| [`pt run`](/commands/run) | Execute prompts with AI tools | `pt run claude` |
| [`pt history`](/commands/history) | View prompt execution history | `pt history -l 10` |
| [`pt annotate`](/commands/annotate) | Add notes to history entries | `pt annotate 42` |
| [`pt install`](/commands/install) | Install prompts from external sources | `pt install user/repo` |
| [`pt review`](/commands/review) | Analyze prompt usage patterns | `pt review -d 7` |
| [`pt help`](/commands/help) | Display help information | `pt help run` |

## Common Patterns

### Interactive Mode
Most commands support interactive mode when run without arguments:
```bash
pt         # Interactive prompt selection
pt edit    # Interactive prompt editing
pt annotate # Annotate last execution
```

### Direct Execution
Provide arguments to skip interactive prompts:
```bash
pt run claude                    # Run with specific tool
pt add api-client.md             # Create named prompt
pt history 15                    # View specific entry
```

### Piping and Redirection
Commands support standard Unix pipes:
```bash
pt | tee output.txt              # Save generated prompt
pt run | grep ERROR              # Filter output
pt history -f json | jq '.[]'    # Process with jq
```

## Global Options

These options work with all commands:

- `--help, -h`: Show help for any command
- `--version, -v`: Display PUPT version
- `--debug`: Enable debug logging
- `--quiet, -q`: Suppress non-essential output
- `--config <path>`: Use specific configuration file

## Exit Codes

PUPT uses standard exit codes for scripting:

- `0`: Success
- `1`: General error
- `2`: Command line usage error
- `3`: Configuration error
- `4`: File not found
- `5`: Permission error

## Getting Help

For detailed information about any command:

```bash
pt help [command]
pt [command] --help
```

## Next Steps

- Learn about the [default `pt` command](/commands/pt) for interactive prompt selection
- Set up your environment with [`pt init`](/commands/init)
- Create your first prompt with [`pt add`](/commands/add)
- Explore advanced features in individual command documentation