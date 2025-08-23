# pt review

Analyze prompt usage patterns and generate insights to improve your prompts and workflows. This command helps identify what's working, what isn't, and where to focus improvement efforts.

## Synopsis

```bash
pt review [prompt-name] [options]
```

## Purpose

The `review` command:
- Analyzes usage patterns and success rates
- Identifies frequently used prompts
- Highlights failure patterns
- Generates improvement recommendations
- Creates usage reports
- Tracks prompt evolution

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--since <date>` | `-s` | Review period start date |
| `--days <n>` | `-d` | Review last n days (default: 30) |
| `--format <type>` | `-f` | Output format: md, json, yaml, html |
| `--output <file>` | `-o` | Save report to file |
| `--include-all` | `-a` | Include unused prompts |
| `--with-annotations` | `-w` | Include annotation analysis |
| `--help` | `-h` | Show help information |

## Review Modes

### Overall Review
```bash
# Review all prompts (last 30 days)
pt review

# Review last week
pt review -d 7

# Review since date
pt review --since 2024-01-01
```

### Prompt-Specific Review
```bash
# Review specific prompt
pt review api-client

# Review with pattern
pt review "api-*"

# Review by tag
pt review --tag typescript
```

### Detailed Analysis
```bash
# Include annotations
pt review --with-annotations

# Include unused prompts
pt review --include-all

# Full analysis
pt review -d 90 --with-annotations --include-all
```

## Report Sections

### Usage Statistics
```
## Usage Summary (Last 30 days)

Total Executions: 156
Unique Prompts Used: 23
Success Rate: 87.2%

Top 5 Most Used:
1. api-documentation (28 uses, 96% success)
2. code-review (24 uses, 88% success)
3. bug-analysis (18 uses, 78% success)
4. test-generator (15 uses, 93% success)
5. refactor-assistant (12 uses, 83% success)
```

### Success Analysis
```
## Success Patterns

High Success (>90%):
- api-documentation: Clear structure, specific inputs
- test-generator: Well-defined templates
- sql-optimizer: Focused scope

Low Success (<70%):
- general-helper: Too broad, needs focus
- debug-assistant: Missing context collection
```

### Failure Patterns
```
## Common Failure Reasons

1. Missing Context (32%)
   - Prompts: debug-assistant, error-analyzer
   - Fix: Add context collection helpers

2. Ambiguous Instructions (28%)
   - Prompts: general-helper, task-planner
   - Fix: More specific templates

3. Tool Limitations (20%)
   - Prompts: image-analyzer, pdf-reader
   - Fix: Add capability checks
```

### Recommendations
```
## Improvement Recommendations

1. Refine "debug-assistant":
   - Add: &lbrace;&lbrace;file "errorLog" "Select error log"&rbrace;&rbrace;
   - Add: &lbrace;&lbrace;input "context" "Describe the context"&rbrace;&rbrace;

2. Split "general-helper":
   - Create focused prompts for specific tasks
   - Use tags for organization

3. Update outdated prompts:
   - "old-api-client": Uses deprecated patterns
   - "legacy-formatter": Replace with modern version
```

## Output Formats

### Markdown Report (Default)
```bash
# Human-readable report
pt review -f md

# Save to file
pt review -f md -o review-report.md
```

### JSON Data
```bash
# Machine-readable data
pt review -f json | jq '.topPrompts[:5]'

# Process with scripts
pt review -f json | python analyze.py
```

### HTML Report
```bash
# Generate HTML report
pt review -f html -o report.html

# Open in browser
pt review -f html -o report.html && open report.html
```

### YAML Format
```bash
# YAML output
pt review -f yaml

# For configuration
pt review -f yaml > metrics.yaml
```

## Analysis Examples

### Team Metrics
```bash
# Weekly team report
pt review -d 7 -f md -o weekly-report.md

# Monthly metrics
pt review -d 30 -f json | \
  jq '{
    total: .summary.totalExecutions,
    successRate: .summary.successRate,
    topPrompts: .topPrompts[:3]
  }'
```

### Prompt Optimization
```bash
# Find prompts needing work
pt review -f json | \
  jq '.prompts[] | 
    select(.successRate < 0.7) | 
    {name, uses, successRate}'

# Unused prompt cleanup
pt review --include-all -f json | \
  jq '.prompts[] | 
    select(.uses == 0) | 
    .name'
```

### Trend Analysis
```bash
# Compare periods
pt review -d 30 -o this-month.json
pt review --since "2024-01-01" --until "2024-01-31" -o last-month.json
diff <(jq . this-month.json) <(jq . last-month.json)
```

## Integration with AI Tools

### Generate Improvement Prompts
```bash
# Get recommendations
pt review -f md | pt run claude \
  -p "Analyze this usage report and suggest specific improvements"

# Auto-generate updated prompts
pt review failing-prompt -f json | \
  pt run gpt -p "Rewrite this prompt to address the failures"
```

### Automated Analysis
```bash
#!/bin/bash
# Weekly AI-powered review
pt review -d 7 -f md > weekly.md
cat weekly.md | pt run claude \
  -p "Summarize key insights and action items" \
  > insights.md
```

## Common Patterns

### Success Indicators
1. **High success rate** (>85%)
2. **Consistent usage** 
3. **Positive annotations**
4. **Quick execution times**
5. **Few modifications needed**

### Failure Indicators
1. **Low success rate** (<70%)
2. **Abandoned after few uses**
3. **Negative annotations**
4. **Timeout issues**
5. **Frequent edits**

## Best Practices

### Regular Reviews
```bash
# Weekly quick review
alias weekly='pt review -d 7 -f md | less'

# Monthly deep dive
alias monthly='pt review -d 30 --with-annotations -o monthly-$(date +%Y%m).md'
```

### Action Items
1. **Archive unused prompts**
2. **Refine low-performing prompts**
3. **Document successful patterns**
4. **Share learnings with team**

### Continuous Improvement
```bash
# Track improvement
pt review api-client -o before.json
# ... make improvements ...
pt review api-client -o after.json
diff before.json after.json
```

## Configuration

Configure review behavior:

```json
{
  "review": {
    "defaultDays": 30,
    "includeAnnotations": true,
    "successThreshold": 0.85,
    "usageThreshold": 5,
    "reportTemplate": "~/.pt/review-template.md"
  }
}
```

## Report Templates

Create custom report templates:

```markdown
# &lbrace;&lbrace;title&rbrace;&rbrace;

Period: &lbrace;&lbrace;period&rbrace;&rbrace;

## Executive Summary
- Total Usage: &lbrace;&lbrace;totalExecutions&rbrace;&rbrace;
- Success Rate: &lbrace;&lbrace;successRate&rbrace;&rbrace;%
- Active Prompts: &lbrace;&lbrace;activePrompts&rbrace;&rbrace;

## Key Insights
&lbrace;&lbrace;#insights&rbrace;&rbrace;
- &lbrace;&lbrace;.&rbrace;&rbrace;
&lbrace;&lbrace;/insights&rbrace;&rbrace;

## Action Items
&lbrace;&lbrace;#recommendations&rbrace;&rbrace;
1. &lbrace;&lbrace;.&rbrace;&rbrace;
&lbrace;&lbrace;/recommendations&rbrace;&rbrace;
```

## Troubleshooting

### No History Data
```bash
# Check history configuration
cat .pt-config.json | jq '.historyDir'

# Verify history files
ls ~/.pt/history/

# Enable history
pt init
```

### Large Datasets
```bash
# Limit review period
pt review -d 7  # Last week only

# Filter by prompt
pt review "api-*" -d 30

# Output to file for processing
pt review -f json -o data.json
```

## Related Commands

- [`pt history`](/commands/history) - View raw history data
- [`pt annotate`](/commands/annotate) - Add context to executions
- [`pt run`](/commands/run) - Execute prompts

## Next Steps

1. Run your first review: `pt review`
2. Identify improvement opportunities
3. Refine underperforming prompts
4. Share insights with your team
5. Set up regular review schedule