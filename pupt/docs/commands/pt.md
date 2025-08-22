# pt (Default Command)

The default `pt` command provides interactive prompt selection and generation. When run without any subcommands, it launches an interactive interface for browsing and using your prompt library.

## Synopsis

```bash
pt [options]
```

## Purpose

This is PUPT's primary interface for:
- Browsing your prompt library with fuzzy search
- Previewing prompt content before selection
- Collecting required variables through interactive inputs
- Generating the final prompt with all substitutions
- Optionally copying to clipboard or piping to other tools

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--search <query>` | `-s` | Pre-filter prompts by search query |
| `--tag <tag>` | `-t` | Filter prompts by specific tag/label |
| `--debug` | `-d` | Enable debug output |
| `--quiet` | `-q` | Suppress non-essential output |
| `--help` | `-h` | Show help information |

## Interactive Features

### Search Interface
- **Fuzzy search**: Type to filter prompts in real-time
- **Arrow keys**: Navigate through results
- **Enter**: Select a prompt
- **Ctrl+C**: Cancel selection

### Preview Mode
- Shows prompt title, labels, and content preview
- Displays required variables
- Indicates template complexity

### Variable Collection
- Automatically detects required inputs
- Presents appropriate input types (text, select, file, etc.)
- Validates inputs based on prompt configuration
- Caches values for reuse within the same prompt

## Examples

### Basic Usage
```bash
# Launch interactive prompt selector
pt
```

### Pre-filtered Search
```bash
# Show only API-related prompts
pt --search api

# Filter by tag
pt --tag typescript
```

### Combined with Other Tools
```bash
# Copy generated prompt to clipboard (macOS)
pt | pbcopy

# Copy to clipboard (Linux)
pt | xclip -selection clipboard

# Save to file
pt > generated-prompt.txt

# Pipe directly to AI tool
pt | claude
```

### Debugging
```bash
# See what variables are being collected
pt --debug

# Quiet mode for scripting
pt --quiet > output.txt
```

## Workflow Example

1. **Launch PUPT**:
   ```bash
   pt
   ```

2. **Search for prompt**:
   - Type "code review" to filter prompts
   - Use arrow keys to navigate
   - Press Enter to select

3. **Provide inputs**:
   ```
   ? Select file to review: src/main.ts
   ? Include performance analysis? Yes
   ? Review depth: (Comprehensive)
   ```

4. **View generated prompt**:
   - The final prompt is displayed with all substitutions
   - Copy, save, or pipe as needed

## Tips

### Efficient Searching
- Use partial words: "rev" finds "review", "reverse", etc.
- Search works on titles, labels, and content
- Use tags for categorical filtering

### Keyboard Shortcuts
- `Tab`: Auto-complete file paths
- `Space`: Toggle selections in multi-select
- `Esc`: Cancel current input
- `Ctrl+C`: Exit program

### Performance
- First run indexes all prompts
- Subsequent runs use cached index
- Use `--debug` to see indexing details

## Common Issues

### No Prompts Found
```bash
# Check configuration
pt init

# Verify prompt directories
ls ~/.prompts
```

### Search Not Working
```bash
# Rebuild search index
pt --debug

# Check for prompt syntax errors
pt edit problematic-prompt.md
```

## Related Commands

- [`pt add`](/commands/add) - Create new prompts
- [`pt edit`](/commands/edit) - Modify existing prompts
- [`pt run`](/commands/run) - Execute with AI tools
- [`pt history`](/commands/history) - View previous generations

## Configuration

The default command respects these configuration options:

```json
{
  "promptDirs": ["./prompts", "~/.prompts"],
  "defaultTemplate": "standard",
  "searchOptions": {
    "fuzzy": true,
    "threshold": 0.6
  }
}
```

See [Configuration Guide](/guide/configuration) for details.