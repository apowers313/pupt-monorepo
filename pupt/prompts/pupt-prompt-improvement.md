---
title: PUPT Prompt Improvement
author: Adam Powers <apowers@ato.ms>
creationDate: 20250821
tags: []
---

**Role & Context**: You are an expert prompt engineer and performance analyst specializing in identifying failure patterns in AI-assisted development workflows. You have deep expertise in prompt design principles, failure analysis, and evidence-based optimization. You will actively modify prompt files to implement improvements.

**Objective**: Use the `pt review` command to analyze comprehensive usage data for AI prompts and DIRECTLY UPDATE prompt files to:
1. Fix documented failure patterns by modifying existing prompt files
2. Create new prompt files for repeated Ad Hoc usage patterns
3. Implement all improvements immediately (git handles version control)
Your analysis must be grounded in actual usage evidence, and you MUST modify files, not just make recommendations.

**Specific Requirements**:
1. **Run the review command**: Execute `pt review --format json > {{input "reviewDataFile" default="review.json"}}` to generate comprehensive usage data
2. **Read the review data**: Load and analyze the JSON file containing:
   - Usage statistics and execution outcomes
   - Environment correlations and timing patterns
   - User annotations with structured issue data
   - Output capture analysis with error indicators
   - Detected patterns with frequency and severity metrics
3. **Analyze patterns with evidence**:
   - Focus on patterns with ≥3 occurrences (statistical significance)
   - Correlate failures with environmental factors
   - Extract specific evidence quotes from annotations
   - Calculate pattern impact (frequency × severity)
   - Identify repeated Ad Hoc prompt content/themes
   - Detect common prompt structures and workflows
4. **DIRECTLY UPDATE existing prompt files**:
   - Use the Edit tool to modify prompts with identified issues
   - Every change must cite specific evidence from the review data
   - Address root causes, not symptoms
   - Preserve successful prompt elements
   - Add verification steps for documented gaps
   - Replace ambiguous terms with measurable criteria
   - Confirm each edit is successful before proceeding
5. **CREATE new prompt files**:
   - Use the Write tool to create new prompts for repeated Ad Hoc patterns
   - Each new prompt must address ≥3 similar Ad Hoc uses
   - Include proper frontmatter (title, author, tags)
   - Base templates on common patterns found in Ad Hoc usage
   - Test that new prompts are discoverable with `pt list`

**Format & Structure**: Create {{input "promptReviewFile" default="design/prompt-review.md"}} documenting the changes made:

```markdown
# Prompt Performance Analysis & Implementation Report
*Generated: {{date}}*
*Analysis Period: {{input "timeframe" default="30d"}}*

## Executive Summary
- **Prompts Analyzed**: X prompts with Y total executions
- **Prompts Modified**: X files updated
- **New Prompts Created**: Y new prompt files
- **Key Finding**: [Most significant pattern discovered]
- **Overall Success Rate**: X% → Y% (after improvements)

## Implemented Improvements

### 1. [Prompt Name] - [Pattern Type] (Priority: Critical/High/Medium) ✅
**Evidence**: 
- Pattern frequency: X occurrences across Y executions
- Success rate impact: X% → Y% projected improvement
- User quotes: "[specific user feedback]"
- Output indicators: [specific failure signals from captured output]

**Root Cause**: [Specific analysis of why this pattern occurs]

**Changes Made**:
- File: `prompts/[filename].md`
- Action: Modified using Edit tool
- Specific changes:
  - Added: "[what was added]"
  - Removed: "[what was removed]"
  - Modified: "[what was changed]"

**Before**:
```
[Quote problematic sections that were fixed]
```

**After**:
```
[Show the updated sections]
```

**Expected Impact**: 
- Success rate improvement: X% → Y%
- Reduced verification gaps: X → Y occurrences
- Environmental resilience: [specific improvements]

[Repeat for each implemented improvement]

## New Prompts Created

### 1. [Prompt Name] (Addressed X Ad Hoc uses) ✅
**Evidence of Need**:
- Ad Hoc prompts with similar content: X occurrences
- Common phrases: "[repeated text patterns]"
- Typical use cases: [list specific scenarios]

**File Created**: `prompts/[filename].md`
**Action**: Created using Write tool

**Prompt Content**:
```markdown
---
title: [Prompt Name]
author: [Author]
tags: [relevant tags]
---

[Full prompt template that was created]
```

**Verification**:
- ✅ File created successfully
- ✅ Appears in `pt list` output
- ✅ Template variables work correctly
- ✅ Addresses the identified use cases

**Expected Benefits**:
- Standardizes common workflow covering X% of similar Ad Hoc uses
- Reduces prompt creation time from Y minutes to Z seconds
- Improves consistency across team members

[Repeat for each new prompt created]

## Ad Hoc Usage Analysis
| Pattern | Frequency | Example Content | Proposed Prompt |
|---------|-----------|-----------------|-----------------|
| ...     | ...       | ...             | ...             |

## Implementation Priority Matrix
| Prompt | Pattern | Frequency | Impact | Effort | Priority Score |
|--------|---------|-----------|---------|--------|----------------|
| ...    | ...     | ...       | ...     | ...    | ...            |

## Environmental Risk Factors
- **Branch-specific failures**: [analysis of git branch correlations]
- **Time-based patterns**: [analysis of time-of-day success rates]
- **Directory-specific issues**: [analysis of working directory correlations]

## Cross-Prompt Patterns
- **Pattern**: [Description]  
  **Affected**: [Prompt names]  
  **Recommendation**: [Global improvement strategy]

## Monitoring Recommendations
- Track success rates for improved prompts
- Monitor for new pattern emergence
- Focus annotation collection on [specific areas]
- Track Ad Hoc prompt reuse to validate new prompt recommendations
```

**Examples**:
```
Pattern: "verification_gap"
Evidence: 12 annotations across 5 prompts mention "tests still failing after AI claimed success"
Root Cause: Prompts lack explicit verification requirements
Fix: Add "After implementation, run 'npm test' and verify output shows '0 failing' before proceeding"
Expected Impact: 85% reduction in verification-related partial failures
```

```
Pattern: "incomplete_task" 
Evidence: 8 annotations report "stopped at first error" with 15+ subsequent errors found
Root Cause: Prompts use "fix the error" instead of "fix all errors"
Fix: Replace with "Continue debugging and fixing ALL errors until none remain"
Expected Impact: 70% reduction in incomplete task annotations
```

```
New Prompt Opportunity: "Dependency Update Workflow"
Evidence: 15 Ad Hoc prompts in past 30 days containing variations of "update dependencies" or "npm update"
Common Pattern: Users repeatedly asking to update packages, check for breaking changes, and run tests
Proposed Template: Standardized workflow for dependency updates with automated compatibility checks
Expected Impact: Replace 80% of dependency-related Ad Hoc prompts with consistent workflow
```

```
New Prompt Opportunity: "API Integration Testing"
Evidence: 8 Ad Hoc prompts containing "test API", "mock endpoint", or "integration test"
Common Pattern: Users creating similar API testing scenarios with slight variations
Proposed Template: Parameterized API testing prompt with endpoint, auth, and payload variables
Expected Impact: Reduce API testing prompt creation time from 5 minutes to 30 seconds
```

**Constraints**:
- Only analyze prompts with ≥5 executions (statistical significance threshold)
- Only recommend changes for patterns with ≥3 documented occurrences
- Only recommend new prompts for Ad Hoc patterns with ≥3 similar occurrences
- Maintain original prompt intent and core workflow
- Preserve existing successful elements (don't change what works)
- Ensure backward compatibility with existing template variables
- New prompt recommendations must show clear reuse potential

**Success Criteria**:
- ✅ All high-severity patterns (≥3 occurrences) have corresponding file modifications
- ✅ At least 80% of identified issues result in actual prompt file updates
- ✅ All modifications are verified with successful Edit tool operations
- ✅ New prompt files are created for 70%+ of repeated Ad Hoc patterns
- ✅ Each created prompt is verified to work with `pt list` and `pt run`
- ✅ Report documents all changes made with file paths and specific edits
- ✅ Git status shows modified/new files ready for review and commit

**Workflow Summary**:
1. Run `pt review --format json > review.json`
2. Read and analyze review.json
3. For each identified issue with ≥3 occurrences:
   - Read the prompt file
   - Apply fixes using Edit tool
   - Verify the edit succeeded
4. For each Ad Hoc pattern with ≥3 similar uses:
   - Create new prompt file using Write tool
   - Verify it appears in `pt list`
5. Generate report showing all changes made
6. Run `git status` to confirm all modifications
