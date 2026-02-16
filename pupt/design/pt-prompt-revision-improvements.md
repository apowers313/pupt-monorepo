# Prompt Tool Enhancement Recommendations for AI-Assisted Prompt Improvement

Based on the comprehensive prompt review process conducted on August 16, 2025, this document outlines recommended improvements to prompt-tool (`pt`) that prioritize AI-assisted prompt revision capabilities while maintaining a clean, minimal command interface.

## Executive Summary

The current prompt analysis process revealed that AI tools like Claude Code need better structured data and simpler interfaces to effectively analyze and improve prompts. Our recommendations focus on:

1. **Enhanced existing commands** with AI-friendly output formats (no new commands)
2. **Structured data formats** that AI can easily parse and analyze
3. **Automatic metadata collection** during prompt execution
4. **Unified `pt review` command** for all analysis and improvement workflows
5. **Machine-readable export formats** optimized for AI consumption

## Pain Points for AI-Assisted Analysis

### 1. Fragmented Data Access

**Current Challenge:**
- AI must execute multiple complex commands to gather basic information
- No single source of truth for prompt performance data
- Difficult to correlate prompts with their outcomes programmatically

**AI Perspective:** "I spent 50% of analysis time just extracting and correlating data"

### 2. Lack of Structured Metadata

**Current Challenge:**
- Success/failure only tracked through free-form annotations
- No standardized outcome reporting
- Missing execution context (environment, parameters, duration)

**AI Perspective:** "I can't identify patterns without structured data"

### 3. No Programmatic Improvement Workflow

**Current Challenge:**
- No way to automatically test prompt improvements
- Can't track which changes led to better outcomes
- No A/B testing or validation framework

**AI Perspective:** "I can suggest improvements but can't verify they work"

## Recommended Features

### 1. Single New Command: `pt review`

To maintain interface simplicity while providing powerful AI-assisted capabilities, we recommend adding only ONE new command that consolidates all prompt analysis based on real usage data:

#### `pt review` - Historical Analysis and Pattern Recognition

```bash
# Generate comprehensive review from usage history (default: human-readable)
pt review

# Export structured JSON for AI analysis (used by prompt-tool-prompt-improvement.md)
pt review --format json > analysis.json

# Review specific prompt with its history
pt review implementation_phase

# Filter by time period
pt review --since 7d

# Include pattern-based suggestions
pt review --suggest
```

**AI-Optimized JSON Output Structure:**
```json
{
  "metadata": {
    "generated": "2025-08-16T10:00:00Z",
    "version": "1.0",
    "total_prompts": 12,
    "total_executions": 108,
    "annotated_executions": 23
  },
  "prompts": [
    {
      "name": "implementation_phase",
      "path": "prompts/implementation_phase.md",
      "content": "Implement Phase {{input \"phase\"}}...",
      "last_modified": "2025-08-10T14:30:00Z",
      "usage_history": {
        "total_runs": 19,
        "annotated_runs": 4,
        "last_used": "2025-08-16T09:30:00Z",
        "avg_duration": "12m30s",
        "outcomes": {
          "success": 8,
          "partial": 6,
          "failure": 5
        },
        "environment_correlations": {
          "failures_by_branch": {
            "main": 2,
            "feature/*": 3
          },
          "success_by_time": {
            "morning": 0.7,
            "afternoon": 0.3
          }
        }
      },
      "user_feedback": {
        "annotations": [
          {
            "timestamp": "2025-08-14T23:08:58Z",
            "status": "partial",
            "user_notes": "The code was implemented and worked as expected, but the tests were failing when I ran them.",
            "issues_reported": ["tests_failing_after_completion"]
          },
          {
            "timestamp": "2025-08-15T18:22:47Z",
            "status": "partial",
            "user_notes": "After completing the implementation I ran 'npm run build' and got the following error...",
            "issues_reported": ["build_errors_not_caught"]
          }
        ]
      },
      "patterns_from_usage": [
        {
          "pattern": "verification_gap",
          "evidence": [
            "6 annotations mention 'tests failing' after claimed success",
            "3 annotations mention 'build errors' not detected"
          ],
          "frequency": 9,
          "severity": "high"
        }
      ],
      "improvement_suggestions": [
        {
          "based_on": "verification_gap pattern (9 occurrences)",
          "suggestion": "Add explicit verification: 'After completing implementation, run `npm test` and verify ALL tests pass with 0 failures. If any tests fail, fix them before proceeding.'",
          "expected_impact": "high"
        }
      ]
    }
  ],
  "global_patterns": [
    {
      "pattern": "verification_gap",
      "affected_prompts": ["implementation_phase", "fix-test-errors"],
      "total_annotations": 15,
      "user_quotes": [
        "AI claimed completion but tests still failing",
        "Build succeeds locally but fails in CI",
        "The AI tool claimed that tests were fixed, but one test was still failing"
      ]
    }
  ]
}
```

### 2. Command Line Interface Consistency

To ensure a consistent and intuitive interface:

#### Output Format Options
All commands that can export data use `--format`:
- `pt review --format json` - Export review data as JSON
- `pt history --format json` - Export history as JSON
- `pt review --format markdown` - Export as markdown (default)

#### Input Options
Commands that accept input use descriptive flags:
- `pt annotate --auto-detect` - Generate from execution data
- `pt run prompt-name` - Run a specific prompt

#### Time Filtering
Commands that filter by time use `--since`:
- `pt review --since 7d` - Last 7 days
- `pt history --since 30d` - Last 30 days

This consistency makes the interface predictable and easy to learn.

### 3. Enhanced Existing Commands with AI-Friendly Output

#### Upgrade `pt run` with Transparent Output Capture

```bash
# Current behavior remains unchanged for humans
pt run implementation_phase

# Behind the scenes when captureOutput is enabled:
# - Output is teed to a separate file (.pthistory/output/TIMESTAMP.log)
# - Interactive shells (claude, q) work normally
# - Terminal animations/spinners display as usual
# - Clean output saved for analysis (ANSI codes stripped)
```

**Output Capture Strategy:**
- Use `tee` or similar to duplicate output stream
- Strip ANSI escape codes from saved version
- Preserve full interactivity in terminal
- Link output file in history metadata

**Enhanced History Format:**
```json
{
  "timestamp": "2025-08-16T10:30:00Z",
  "templatePath": "prompts/implementation_phase.md",
  "templateContent": "...",
  "variables": {
    "phase": "1",
    "implementationFile": "design/phase1.md"
  },
  "finalPrompt": "...",
  "environment": {
    "working_directory": "/home/user/project",
    "git_commit": "abc123def456",
    "git_branch": "feature/add-validation",
    "git_dirty": false,
    "node_version": "18.17.0",
    "os": "darwin",
    "shell": "zsh"
  },
  "execution": {
    "start_time": "2025-08-16T10:30:00Z",
    "end_time": "2025-08-16T10:44:32Z",
    "duration": "14m32s",
    "exit_code": 0,
    "command": "claude --permission-mode acceptEdits",
    "output_file": ".pthistory/output/20250816-103000-abc123.log",
    "output_size": 45678,
    "resource_usage": {
      "tokens_used": 45000,
      "api_calls": 23,
      "cost_estimate": "$0.45"
    },
    "verification_results": {
      "npm_test": {
        "exit_code": 1,
        "failures": 17,
        "timestamp": "2025-08-16T10:43:00Z"
      },
      "npm_build": {
        "exit_code": 0,
        "timestamp": "2025-08-16T10:44:00Z"
      }
    },
    "auto_annotation": {
      "created": true,
      "status": "partial",
      "detected_issues": [
        {
          "type": "test_failure",
          "pattern": "FAIL.*test",
          "count": 17,
          "first_occurrence_line": 234
        }
      ]
    }
  }
}
```

#### Enhance `pt history` with Structured Export

```bash
# Current human-friendly display remains
pt history

# New: Export structured data for AI analysis
pt history --format json --last 30d > history-export.json
pt history implementation_phase --format json
pt history --failed --format json  # Only failed executions
```

#### Enhanced Annotation System

```bash
# Interactive annotation remains unchanged
pt annotate
```

**Automatic annotation happens transparently** when configured in `.ptrc.json` - no command needed. After each `pt run`, if the `analysisPrompt` is configured, it will be called to analyze the output and create a structured annotation.

#### Example Analysis Prompt: `analyze-execution.md`

```markdown
---
title: Execution Output Analysis
description: Analyzes the output of a recent prompt execution to create structured annotation
---

**Role & Context**: You are a technical analyst specializing in identifying issues, errors, and success indicators in command-line output from AI-assisted development sessions.

**Objective**: Analyze the captured output from the most recent prompt execution and create a structured annotation that accurately categorizes the outcome and identifies any issues.

**Specific Requirements**:
1. Read the output file at {{input "outputFile"}}
2. Scan for key indicators:
   - Error messages, stack traces, or failure notifications
   - Success messages, completion confirmations
   - Warning signs (partial completions, skipped tasks)
   - Test results (passing/failing counts)
   - Build status indicators
3. Determine overall execution status:
   - "success" - All tasks completed without errors
   - "partial" - Some tasks completed but errors occurred
   - "failure" - Critical errors prevented completion
4. Extract specific metrics:
   - Number of tests run/passed/failed
   - Number of errors or warnings
   - Tasks completed vs attempted
5. Identify root issues based on error patterns

**Format & Structure**: 
Output a JSON annotation in this exact format:
```json
{
  "status": "success|partial|failure",
  "outcome": {
    "tasksCompleted": <number>,
    "tasksTotal": <number>,
    "testsRun": <number>,
    "testsPassed": <number>,
    "testsFailed": <number>,
    "executionTime": "<duration from output>",
    "verificationPassed": <boolean>
  },
  "issues": [
    {
      "category": "test_failure|build_error|verification_gap|incomplete_task",
      "severity": "low|medium|high|critical",
      "description": "<specific description of what went wrong>",
      "evidence": "<relevant line from output>"
    }
  ],
  "summary": "<one-line summary of what happened>",
  "recommendations": [
    "<specific suggestion based on the failure pattern>"
  ]
}
```

**Examples**: 
- If output contains "FAIL test/foo.test.ts", status is "partial" with issue category "test_failure"
- If output shows "✓ 42 tests passed", status is "success"
- If AI says "Implementation complete" but tests fail, add "verification_gap" issue

**Constraints**: 
- Base analysis only on actual output content, not assumptions
- Use exact quotes from output as evidence
- Keep descriptions factual and specific
- Don't generate recommendations unless clear pattern exists

**Success Criteria**: 
- Annotation accurately reflects the execution outcome
- All errors and warnings are captured
- Metrics are extracted correctly
- Format is valid JSON that pt can parse
```

**Enhanced Annotation Format:**
```yaml
historyFile: 20250816-103000-abc123.json
timestamp: '2025-08-16T10:45:00Z'
status: partial
outcome:
  tasksCompleted: 3
  tasksTotal: 5
  verificationPassed: false
  executionTime: 14m32s
  errors:
    - type: test_failure
      count: 17
      details: "Tests passing locally but failing after implementation"
issues:
  - category: verification
    severity: high
    description: "AI claimed completion but tests still failing"
  - category: root_cause
    severity: medium  
    description: "Surface-level fixes didn't address underlying issues"
tags: [testing, implementation, verification-gap]
recommendations:
  - "Add explicit verification loop in prompt"
  - "Require test output in response"
  - "Define 'minimal changes' more clearly"
auto_detected: false  # true if created by auto-annotation
```

### 4. Configuration-Based Features (No New Commands)

#### Smart Output Capture and Auto-Annotation

Configure automatic output capture and pattern detection in `.ptrc.json`:

```json
{
  "version": "4.0.0",
  "outputCapture": {
    "enabled": true,
    "stripAnsi": true,
    "outputDir": ".pthistory/output",
    "maxSize": "10MB"
  },
  "autoAnnotate": {
    "enabled": true,
    "runAfter": ["claude", "q", "implementation_phase"],  // Only for specific prompts
    "analysisPrompt": "prompts/analyze-execution.md",  // AI prompt to analyze output
    "fallbackRules": [  // Simple pattern matching if prompt analysis fails
      {
        "pattern": "test.*fail|FAIL",
        "status": "partial",
        "issue": "test_failure"
      },
      {
        "pattern": "build.*error|Error:",
        "status": "failed",
        "issue": "build_error"
      },
      {
        "pattern": "✓ All tests passed|Success|All checks pass",
        "status": "success",
        "issue": null
      }
    ]
  },
  "export": {
    "format": "json",
    "includePromptContent": true,
    "includeExecutionContext": true
  }
}
```

### 5. Usage with AI Prompt

The `pt review` command is designed to be called by an AI assistant using a prompt like `prompt-tool-prompt-improvement.md`. Here's how it works:

#### Running the Analysis Prompt

```bash
# User runs the prompt improvement analysis
pt run prompt-tool-prompt-improvement

# The prompt executes `pt review --format json` internally and analyzes the output
# The AI assistant then creates improved prompts based on patterns found
```

#### Example Prompt: `prompt-tool-prompt-improvement.md`

```markdown
---
title: Prompt Tool Performance Analysis and Improvement
description: Analyzes prompt usage history and generates improvement recommendations
---

**Role & Context**: You are an expert prompt engineer specializing in analyzing usage patterns and improving AI prompts for better reliability and success rates. You have deep knowledge of common failure patterns in AI interactions and best practices for prompt design.

**Objective**: Analyze the historical performance data of all prompts in this project and create specific, actionable improvement recommendations based on actual usage patterns and user feedback.

**Specific Requirements**:
1. Execute `pt review --format json --since {{input "timeframe" default="30d"}}` to retrieve usage data
2. For each prompt with >3 executions, analyze:
   - Success/failure rates and trends
   - User annotations and reported issues
   - Correlation with environmental factors (branch, time, directory)
   - Average execution duration
3. Identify specific problems by examining:
   - Annotation text for recurring complaints
   - Failure clusters (time, environment)
   - Prompts with <60% success rate
4. Generate improvements that:
   - Address specific issues found in annotations
   - Include concrete language to replace ambiguous terms
   - Add verification steps where failures occur
   - Maintain the original prompt's intent
5. Create a review document at {{input "outputFile" default="design/prompt-review-YYYYMMDD.md"}}

**Format & Structure**: 
Generate a markdown report with:
- Executive summary of findings
- Per-prompt analysis sections including:
  - Current performance metrics
  - Specific issues from user feedback
  - Root cause analysis
  - Proposed improved prompt (full rewrite)
  - Expected impact of changes
- Prioritized action plan
- Common patterns across all prompts

**Examples**: 
If a prompt has 6 annotations mentioning "tests still failing after completion", add explicit verification:
```
Current: "Fix the tests and continue"
Improved: "Fix the tests. After making changes, run 'npm test' and verify output shows '0 failing' before proceeding. If any tests still fail, continue debugging until all pass."
```

**Constraints**: 
- Only analyze prompts with sufficient data (>3 executions)
- Base all recommendations on actual user feedback, not theoretical issues
- Preserve each prompt's core purpose while improving clarity
- Keep improvements specific and measurable
- Do not add complexity unless addressing a documented problem

**Success Criteria**: 
- Every improvement traces to specific user feedback or failure data
- Proposed prompts eliminate identified ambiguities
- Recommendations are actionable and testable
- Priority ordering helps users focus on high-impact changes
```

#### Human-Driven Improvement Workflow

1. **User runs analysis** (AI analyzes patterns via prompt)
```bash
pt run prompt-tool-prompt-improvement
# Outputs: design/prompt-review-YYYYMMDD.md
```

2. **User reviews suggestions** (Human validates AI recommendations)
```bash
# Read the review file created by AI
# Decide which improvements to implement
```

3. **User applies improvements** (Manual update of prompts)
```bash
# Edit prompts based on AI suggestions
# Commit changes when satisfied
```

4. **Natural validation** (Through continued usage)
```bash
# Users run improved prompts normally
pt run implementation_phase

# Users annotate if issues persist
pt annotate  # "Issue resolved!" or "Still having problems..."
```

5. **Iterate** (Periodic re-analysis)
```bash
# Run analysis again after collecting more data
pt run prompt-tool-prompt-improvement
# Compare with previous review to see progress
```

#### Integration Points

Simple integration with existing workflows:

```bash
# Weekly review of all prompts
pt review --format json --since 7d > weekly-review.json

# CI/CD can check for prompts with high failure rates
pt review --format json | jq '.prompts[] | select(.usage_history.outcomes.failure > .usage_history.outcomes.success)'
```

### 6. Comprehensive Metadata for AI Analysis

#### All Captured Data Points

To enable effective AI analysis of prompt performance, we capture:

**Execution Context:**
- Working directory and file paths
- Git commit hash, branch, and dirty status
- Environment variables and system info
- Start/end timestamps and duration
- Command line arguments used

**Performance Metrics:**
- Exit codes from prompt execution
- Resource usage (tokens, API calls, cost)
- Verification command results
- Output file size and location
- Error patterns detected

**User Feedback:**
- Manual annotations with structured outcomes
- Task completion ratios
- Specific issues identified
- Recommendations for improvement
- Tags for categorization

**Pattern Analysis:**
- Frequency of specific failure types
- Correlation between prompts and issues
- Time-based trends
- Cross-prompt patterns

This rich metadata enables AI to:
- Identify when prompts fail in specific contexts
- Correlate failures with environment changes
- Track improvement over time
- Suggest context-specific improvements

### 7. Data Structure Standards

#### Unified Performance Metrics

All commands that output performance data use consistent schema:

```typescript
interface PromptMetrics {
  prompt_id: string;
  path: string;
  metrics: {
    usage_count: number;
    success_rate: number;
    avg_duration: string;
    last_failure: string | null;
    quality_score: number;
  };
  issues: Issue[];
  recommendations: string[];
}

interface Issue {
  type: 'verification_gap' | 'ambiguous_objective' | 'missing_constraints' | etc;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  pattern: string;
  fix: string;
}
```


### 8. Technical Implementation Notes

#### Auto-Annotation Workflow

When auto-annotation is enabled with an `analysisPrompt`:

1. After `pt run` completes (for configured prompts)
2. PT automatically runs: `pt run analyze-execution --outputFile .pthistory/output/TIMESTAMP.log`
3. The analysis prompt reads the captured output and returns JSON
4. PT parses the JSON and creates an annotation file
5. If the analysis fails, fall back to simple pattern matching rules

This creates a clean separation:
- `pt` handles the workflow orchestration
- The AI prompt provides intelligent analysis
- Users get automatic, detailed annotations without manual work

#### Output Capture for Interactive Commands

Since most `pt run` commands launch interactive shells (claude, q, etc.):

**Challenges:**
- Interactive shells use ANSI escape codes for animations, colors, cursor movement
- Direct output capture would break interactivity
- Need to preserve user experience while capturing data

**Solution:**
1. Use pseudo-terminal (PTY) allocation for the child process
2. Implement a transparent proxy that:
   - Passes through all I/O between terminal and child process
   - Duplicates output to a capture file
   - Strips ANSI codes from captured version only
3. Alternative: Use `script` command or similar OS utilities

**Example Implementation Approach:**
```bash
# Pseudo-code for transparent capture
pt run implementation_phase
  → Spawn: script -q -c "claude" .pthistory/output/TIMESTAMP.raw
  → Post-process: strip ANSI codes → TIMESTAMP.log
  → User sees: normal interactive claude session
  → pt captures: clean text output for analysis
```

### 9. Implementation Strategy

#### Phase 1: Core Review Command (Immediate Impact)
- Implement `pt review` with JSON export
- Add automatic metadata collection to `pt run`
- Enhance history format with execution data
- Configure auto-detection patterns

#### Phase 2: Enhanced Analysis (High Value)

**Pattern Recognition Algorithms:**
- Analyze annotation text for common phrases (e.g., "tests failing", "build error")
- Group similar issues across executions using string similarity
- Identify correlations:
  - Failure rate vs prompt length
  - Success rate vs time of day
  - Failures clustered around specific git commits
- Example patterns detected:
  - "verification_gap": AI claims success but verification fails (>60% correlation)
  - "incomplete_task": Partial completion patterns (stops at first error)
  - "environment_specific": Failures only on certain branches/times

**Suggestion Generation:**
- Based on detected patterns, generate specific fixes:
  - For "verification_gap" → "Add: 'Run npm test and ensure 0 failures before proceeding'"
  - For "incomplete_task" → "Add: 'Continue working through ALL errors until none remain'"
- Priority based on impact (frequency × severity)
- Include evidence: "Based on 6 failures with pattern 'test.*fail'"

**Prompt Quality Scoring (0-100):**
- **Structure Score (40 points)**:
  - Has clear objective: 10pts
  - Defines success criteria: 10pts
  - Includes error handling: 10pts
  - Specifies output format: 10pts
- **Clarity Score (30 points)**:
  - No ambiguous terms ("minimal", "appropriate"): 15pts
  - Concrete actions specified: 15pts
- **Performance Score (30 points)**:
  - Based on actual success rate: (success/total) × 30
- Example: implementation_phase scores 45/100 (missing success criteria, ambiguous terms, 42% success rate)

## Benefits for AI Tools

### 1. Single Command Interface
- One command (`pt review --format json`) provides complete analysis
- No complex command chains or bash scripting
- All data in one consistent structure

### 2. Natural Improvement Validation
- Improvements validated through real usage
- Success measured by user annotations
- Patterns emerge from actual failures

### 3. Zero Learning Curve
- Only ONE new command to learn
- Existing commands enhanced with `--format` option
- Intuitive and consistent interface

### 4. Built-in Intelligence
- Automatic pattern detection
- Success/failure tracking
- Improvement suggestions included

## Example Review Output for AI Processing

When `pt review --format json` is executed by the prompt, it provides data like:

```json
{
  "prompts": [
    {
      "name": "implementation_phase",
      "usage_history": {
        "total_runs": 19,
        "annotated_runs": 4,
        "outcomes": {"success": 8, "partial": 6, "failure": 5}
      },
      "user_feedback": {
        "annotations": [
          {
            "status": "partial",
            "user_notes": "Tests were failing when I ran them",
            "issues_reported": ["tests_failing_after_completion"]
          }
        ]
      },
      "patterns_from_usage": [
        {
          "pattern": "verification_gap",
          "frequency": 9,
          "evidence": ["6 annotations mention tests failing"]
        }
      ]
    }
  ]
}
```

The AI assistant processes this data to generate a review file with specific improvement recommendations based on actual usage patterns and user feedback.

## Conclusion

This approach achieves AI-assisted prompt improvement through a human-centered workflow:

1. **One new command** - `pt review` provides all analysis capabilities
2. **Human-driven process** - Users run AI prompts that call `pt review`
3. **Natural validation** - Improvements tested through real usage, not synthetic tests
4. **Data-driven insights** - Patterns emerge from actual failures and user feedback
5. **Simple interface** - Complexity hidden in the AI prompt, not the tool

The key insight: **Real usage patterns and user annotations provide better improvement data than synthetic tests**. By focusing on collecting and exposing this data through `pt review`, we enable AI assistants to help users improve their prompts based on what actually works.
