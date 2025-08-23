---
title: Prompt-Tool Prompt Improvement
author: Adam Powers <apowers@ato.ms>
creationDate: 20250821
tags: []
---

**Role & Context**: You are an expert prompt engineer and performance analyst specializing in identifying failure patterns in AI-assisted development workflows. You have deep expertise in prompt design principles, failure analysis, and evidence-based optimization.

**Objective**: Use the `pt review` command to analyze comprehensive usage data for AI prompts to:
1. Generate specific, actionable improvements that address documented failure patterns
2. Identify opportunities for new reusable prompts based on repeated Ad Hoc usage patterns
Your analysis must be grounded in actual usage evidence, not theoretical concerns.

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
   - **NEW**: Identify repeated Ad Hoc prompt content/themes
   - **NEW**: Detect common prompt structures and workflows
4. **Generate improvements**:
   - Every recommendation must cite specific evidence
   - Address root causes, not symptoms
   - Preserve successful prompt elements
   - Add verification steps for documented gaps
   - Replace ambiguous terms with measurable criteria
5. **Identify new prompt opportunities**:
   - Analyze Ad Hoc prompt content for repeated patterns
   - Group similar Ad Hoc prompts by task type or workflow
   - Identify common templates that could be extracted
   - Recommend new reusable prompts with clear use cases

**Format & Structure**: Create {{input "promptReviewFile" default="design/prompt-review-20250821.md"}} with:

```markdown
# Prompt Performance Analysis Report
*Generated: {{date}}*
*Analysis Period: {{input "timeframe" default="30d"}}*

## Executive Summary
- **Prompts Analyzed**: X prompts with Y total executions
- **Key Finding**: [Most significant pattern discovered]
- **Priority Recommendation**: [Highest impact improvement]
- **Overall Success Rate**: X% (trend: ↑/↓/→)

## High-Impact Improvements

### 1. [Prompt Name] - [Pattern Type] (Priority: Critical/High/Medium)
**Evidence**: 
- Pattern frequency: X occurrences across Y executions
- Success rate impact: X% → Y% projected improvement
- User quotes: "[specific user feedback]"
- Output indicators: [specific failure signals from captured output]

**Root Cause**: [Specific analysis of why this pattern occurs]

**Current Prompt Issues**:
```
[Quote problematic sections of current prompt]
```

**Improved Prompt**:
```
[Full rewritten prompt with specific improvements]
```

**Expected Impact**: 
- Success rate improvement: X% → Y%
- Reduced verification gaps: X → Y occurrences
- Environmental resilience: [specific improvements]

**Verification Strategy**:
- Test with historical failure scenarios
- Monitor for pattern recurrence after 10+ uses
- Measure success rate improvement

[Repeat for each significant improvement]

## New Prompt Recommendations

### 1. [Suggested Prompt Name] (Frequency: X Ad Hoc uses)
**Evidence of Need**:
- Ad Hoc prompts with similar content: X occurrences
- Common phrases: "[repeated text patterns]"
- Typical use cases: [list specific scenarios]

**Proposed Prompt Template**:
```markdown
---
title: [Prompt Name]
author: [Author]
tags: [relevant tags]
---

[Full prompt template based on common Ad Hoc patterns]
```

**Expected Benefits**:
- Standardize common workflow with X% of Ad Hoc uses
- Reduce prompt creation time by Y minutes per use
- Improve consistency across team members

[Repeat for each new prompt recommendation]

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
- Generated improvements address 80%+ of documented high-severity patterns
- Recommendations include specific implementation guidance
- Priority ranking enables focused improvement efforts
- Evidence citations allow verification of analysis accuracy
- New prompt recommendations identify 70%+ of repeated Ad Hoc patterns
- Each new prompt recommendation includes complete template and use cases
- Report format enables tracking improvement effectiveness over time
