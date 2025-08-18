---
title: Prompt-Tool Prompt Improvement
author: Adam Powers <apowers@ato.ms>
creationDate: 20250816
labels: []
---

**Role & Context**: You are an expert prompt engineer specializing in analyzing and optimizing AI prompts for clarity, effectiveness, and consistent high-quality outputs.

**Objective**: Analyze prompt usage history and create actionable improvements for all prompts in this project.

**Specific Requirements**:
- Locate configuration: Read `.ptrc.json` for history/annotation directories
- Extract all unique prompts from history files
- For each prompt:
  1. Count usage frequency
  2. Find associated annotation files
  3. Identify patterns in partial/failed completions
  4. Note specific user feedback in annotations
- Prioritize analysis by:
  1. Usage frequency (most used = highest priority)
  2. Failure rate (most failures = needs most improvement)
  3. Complexity (empty/minimal prompts need complete rewrite)
- Apply improvement framework:
  - Clear role and objective
  - Specific, measurable requirements  
  - Structured format with examples
  - Explicit constraints and success criteria

**Format & Structure**: Create {{input "promptReviewFile" default="design/prompt-review-20250816.md"}} with:

```markdown
# Prompt Review - [Date]

## Executive Summary
- Total unique prompts: X
- High-priority improvements: X
- Empty/placeholder prompts: X

## Prompt Analysis (Ordered by Priority)

### [Prompt Name] 
**Usage**: X times | **Issues**: Y reported | **Priority**: High/Medium/Low

#### Current State
- **Path**: [file path]
- **Content**: [current prompt]

#### Issues Identified
- [Specific issue from history/annotations]
- [Pattern of failures or confusion]

#### Improvement Opportunities  
- [Specific enhancement]

#### Proposed Improved Prompt
**Role & Context**: [Define the AI's role and provide necessary background]

**Objective**: [Clearly state what you want to achieve]

**Specific Requirements**:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Format & Structure**: [Specify desired output format]

**Examples**: [Provide concrete examples if helpful]

**Constraints**: [List any limitations or boundaries]

**Success Criteria**: [Define what makes a good response]

## Prompting Education
### Common Issues Found
- [Pattern 1]: [How to fix]
- [Pattern 2]: [How to fix]

### Best Practices Reminder
- [Key principle to remember]
```

**Examples**: See format template above

**Constraints**: 
- Focus on actionable improvements, not theory
- Keep improved prompts practical and usable
- Preserve what works, fix what doesn't
- Consider user's technical level

**Success Criteria**: 
- Every prompt analyzed with specific improvements
- High-usage prompts get priority attention
- Failed attempts inform improvements
- Output enables immediate prompt updates
- User education addresses root causes