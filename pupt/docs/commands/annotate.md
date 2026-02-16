# pt annotate

Add annotations to history entries to track outcomes, insights, and learnings from prompt executions. This command helps build a knowledge base of what works and what doesn't.

## Synopsis

```bash
pt annotate [history-number] [options]
```

## Purpose

The `annotate` command:
- Adds notes to prompt execution history
- Tracks success/failure status
- Tags executions for categorization
- Builds institutional knowledge
- Enables pattern recognition
- Supports team learning

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--status <status>` | `-s` | Set status: success, failure, partial |
| `--note <text>` | `-n` | Quick note (skip editor) |
| `--tags <tags>` | `-t` | Comma-separated tags |
| `--editor <editor>` | `-e` | Override default editor |
| `--append` | `-a` | Append to existing annotation |
| `--help` | `-h` | Show help information |

## Usage Modes

### Interactive Annotation
```bash
# Annotate last execution
pt annotate

# Annotate specific entry
pt annotate 42
```

### Quick Annotation
```bash
# Add quick note
pt annotate -n "Worked perfectly!"

# Set status and tags
pt annotate -s success -t "production,tested"
```

### Detailed Annotation
```bash
# Open editor for detailed notes
pt annotate 42
# Editor opens with template
```

## Annotation Components

### Status
- **success**: Execution achieved desired outcome
- **failure**: Execution failed or produced incorrect results  
- **partial**: Some objectives met, some failed

### Notes
- Detailed observations
- Lessons learned
- Improvement suggestions
- Context for future use

### Tags
- Categorization tags
- Project identifiers
- Environment markers
- Custom taxonomy

## Examples

### Basic Annotations
```bash
# Mark as successful
pt annotate -s success

# Quick failure note
pt annotate -s failure -n "API returned 401 - check credentials"

# Tag for project
pt annotate -t "project-alpha,sprint-15"
```

### Detailed Documentation
```bash
# Comprehensive annotation
pt annotate 42 -s success -t "production,api,v2"
# Then add detailed notes in editor
```

### Batch Annotation
```bash
# Annotate multiple entries
for id in 40 41 42; do
  pt annotate $id -s success -t "batch-process"
done
```

## Editor Template

When opening an editor, PUPT provides:

```markdown
# Annotation for History Entry #42

Prompt: api-documentation
Executed: 2024-01-15 10:30:45
Tool: claude
Status: [success/failure/partial]

## Outcome
[Describe what happened]

## Observations
[What worked well? What didn't?]

## Improvements
[Suggestions for next time]

## Tags
[Additional categorization]
```

## Annotation File Structure

```
~/.pt/history/
├── 2024-01-15-103045-42.json       # History entry
└── 2024-01-15-103045-42.annotations/
    ├── 001-success.md               # First annotation
    └── 002-improvement.md           # Additional annotation
```

## Search and Filter

### Find Annotated Entries
```bash
# All annotated entries
pt history --annotated

# By status
pt history --status success

# By tag
pt history --tag "production"
```

### Search Annotations
```bash
# Search annotation content
pt history -s "credential error"

# Complex search
pt history --status failure --tag "api" -d 7
```

## Team Knowledge Sharing

### Export Annotations
```bash
# Export successful patterns
pt history --status success -f json > successful-patterns.json

# Share failure learnings
pt history --status failure --format markdown > lessons-learned.md
```

### Import Patterns
```bash
# Apply team annotations
cat team-annotations.json | pt annotate --import
```

## Common Workflows

### Post-Execution Review
```bash
# Run prompt
pt run claude

# Immediately annotate
pt annotate -s success -n "Generated correct TypeScript interfaces"
```

### Daily Review
```bash
#!/bin/bash
# Review and annotate today's executions
for entry in $(pt history -d 1 -f json | jq -r '.[].id'); do
  echo "Review entry $entry"
  pt history $entry
  pt annotate $entry
done
```

### Knowledge Building
```bash
# Find patterns in failures
pt history --status failure -f json | \
  jq -r '.[] | .annotations[].note' | \
  sort | uniq -c | sort -nr
```

## Best Practices

### Annotation Guidelines
1. **Be Specific**: Include error messages, versions
2. **Document Context**: Environment, prerequisites
3. **Suggest Improvements**: How to do better next time
4. **Use Consistent Tags**: Establish team taxonomy
5. **Review Regularly**: Learn from annotations

### Tag Conventions
```
# Environment
dev, staging, production

# Outcome
working, broken, needs-revision

# Category  
api, frontend, database, security

# Project
project-name, feature-name
```

## Integration with Review

### Generate Reports
```bash
# Success rate by prompt
pt review --with-annotations

# Failure analysis
pt review --status failure --format report
```

### Pattern Recognition
```bash
# Common failure reasons
pt history --status failure -f json | \
  jq '.[] | .annotations[].tags' | \
  sort | uniq -c
```

## Tips and Tricks

### Quick Status Updates
```bash
# Alias for quick success
alias pts='pt annotate -s success -n'

# Usage
pts "Worked great!"
```

### Annotation Templates
```bash
# Create template
cat > ~/.pt/annotation-template.md << EOF
Status: success
Tags: 
Note: 
EOF

# Use template
pt annotate --template ~/.pt/annotation-template.md
```

## Common Issues

### Missing Annotations Directory
```bash
# Check configuration
cat .pt-config.json | jq '.annotationDir'

# Create directory
mkdir -p ~/.pt/history
```

### Editor Not Opening
```bash
# Set editor
export EDITOR="code --wait"

# Use specific editor
pt annotate -e vim
```

## Related Commands

- [`pt history`](/commands/history) - View execution history
- [`pt review`](/commands/review) - Analyze annotated patterns
- [`pt run`](/commands/run) - Execute prompts

## Configuration

```json
{
  "annotationDir": "~/.pt/history",
  "annotation": {
    "template": "~/.pt/annotation-template.md",
    "requiredTags": ["status", "environment"],
    "autoOpen": true
  }
}
```

## Next Steps

1. Start annotating your executions
2. Build a knowledge base of patterns
3. Share learnings with your team
4. Use [`pt review`](/commands/review) to analyze trends