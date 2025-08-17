# Prompt Review - August 16, 2025

This document provides a comprehensive review of all prompts used in the prompt-tool project, analyzing their effectiveness based on usage history and annotations, and proposing improvements for each prompt.

## 1. Ad Hoc Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/ad-hoc.md`  
**Usage Count**: 27 times  
**Current Content**: `{{input "prompt"}}`

### Issues Identified

1. **Lack of structure**: The prompt provides no guidance or context for the AI
2. **No role definition**: The AI has no defined expertise or persona
3. **Missing constraints**: No boundaries or success criteria are established
4. **No output format specification**: The AI must guess the desired response format

### Opportunities for Improvement

- Add optional context setting for specialized tasks
- Include format hints based on common use cases
- Provide scaffolding for better responses

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a versatile AI assistant capable of handling various technical and non-technical tasks. Adapt your expertise based on the specific request.

**Objective**: {{input "prompt"}}

**Specific Requirements**:
- Provide accurate, helpful, and actionable responses
- If the task is ambiguous, ask clarifying questions before proceeding
- Use appropriate formatting (code blocks, lists, tables) based on content type

**Format & Structure**: Match the response format to the task type - use structured output for technical tasks, narrative for explanations, and step-by-step instructions for procedures.

**Examples**: N/A (varies by request)

**Constraints**: Stay focused on the specific request without adding unnecessary information unless it directly supports the main objective.

**Success Criteria**: The response directly addresses the user's request with appropriate depth and format for the task at hand.
```

## 2. Code Review Prompt (Empty Template)

**Path**: `/home/apowers/.pt/prompts/code-review.md`  
**Usage Count**: 25 times  
**Current Content**: `{{!-- Add your prompt content here --}}`

### Issues Identified

1. **Completely empty**: No actual prompt content, just a placeholder comment
2. **No guidance**: Users must create their own prompt from scratch
3. **Wasted potential**: High usage indicates need, but provides no value

### Opportunities for Improvement

- Create a comprehensive code review template
- Include common review criteria
- Add customization options

### Proposed Improved Prompt

```markdown
**Role & Context**: You are an experienced software engineer conducting a thorough code review, focusing on code quality, maintainability, security, and best practices.

**Objective**: Perform a comprehensive code review of the specified files or project, identifying issues and suggesting improvements.

**Specific Requirements**:
- Review code for: {{checklist "reviewAreas" options="bugs,performance,security,style,documentation,tests,architecture" default="all"}}
- Focus on files matching: {{input "filePattern" default="*"}}
- Severity threshold: {{select "severity" options="all,high,critical" default="all"}}
- Check for common patterns and anti-patterns
- Verify adherence to project conventions
- Assess test coverage and quality

**Format & Structure**: 
- Summary of findings by severity (Critical, High, Medium, Low)
- Detailed findings grouped by category
- Specific file and line references
- Actionable improvement suggestions
- Code examples for recommended changes

**Examples**: 
```
### Critical Issues
1. **SQL Injection Vulnerability** - `src/db/queries.js:45`
   - Current: `query("SELECT * FROM users WHERE id = " + userId)`
   - Recommended: Use parameterized queries
   ```

**Constraints**: 
- Focus on objective code quality metrics
- Avoid stylistic preferences unless they impact maintainability
- Prioritize security and correctness over optimization

**Success Criteria**: 
- All significant issues are identified with clear explanations
- Recommendations are actionable and include examples
- Review helps improve code quality and catches potential bugs
```

## 3. Implementation Phase Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/implementation_phase.md`  
**Usage Count**: 19 times  
**Current Content**: `Implement Phase {{input "phase"}} from {{input "implementationFile"}}. Ensure our tests cover at least 80% of our code. After completing the implementation, run testing and linting and make MINIMAL changes to address any errors. After testing and linting are passing, print out a message of what the new human-facing functionality is, how they can verify it is working, and what the next phase of the implementation is.`

### Issues Identified

1. **Vague success criteria**: "Ensure tests cover 80%" but no guidance on how to measure or what to test
2. **Ambiguous error handling**: "MINIMAL changes" is subjective and could lead to inadequate fixes
3. **Missing context**: No role definition or expertise level specified
4. **Incomplete workflow**: Doesn't specify what to do if tests fail after minimal changes

### Annotations Analysis

- Multiple partial completions reported tests failing after implementation
- Build failures occurred even when tests passed
- Pattern of incomplete error resolution

### Opportunities for Improvement

- Add explicit verification steps
- Define "minimal changes" more clearly
- Include rollback procedures for failed implementations
- Add quality gates between steps

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a senior software engineer implementing features according to a detailed implementation plan, with expertise in test-driven development and clean code practices.

**Objective**: Implement Phase {{input "phase"}} from {{file "implementationFile"}} following all specifications exactly.

**Specific Requirements**:
- Read and understand the full phase requirements before starting
- Implement features incrementally, testing after each change
- Write tests BEFORE implementing features (TDD approach)
- Achieve minimum 80% code coverage with meaningful tests
- Run `npm run build`, `npm run lint`, and `npm test` after implementation
- Fix ALL errors completely - "minimal changes" means fixing root causes without adding unnecessary code
- Verify the implementation matches the specification exactly

**Format & Structure**: 
1. First, summarize what Phase {{input "phase"}} requires
2. Implement features with appropriate tests
3. Run all verification commands and fix any issues
4. Provide a status report including:
   - Summary of implemented functionality
   - How users can verify it works (specific commands/steps)
   - Any deviations from the plan and why
   - Next phase number and brief description

**Examples**: N/A (varies by implementation plan)

**Constraints**: 
- Do NOT skip tests or use `.skip()` 
- Do NOT suppress linting errors with ignore comments
- If tests fail after fixes, investigate root cause rather than making superficial changes
- If blocked, report the specific issue rather than proceeding with partial implementation

**Success Criteria**: 
- All tests pass (100% success rate)
- Build completes without errors
- Linting passes without warnings
- Code coverage ≥ 80%
- Implementation exactly matches phase specification
- Clear user-facing functionality description provided
```

## 4. Fix Test Errors Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/fix-test-errors.md`  
**Usage Count**: 13 times  
**Current Content**: `Build the code, run linting, and run all tests. Create a list of EVERY ERROR. Identify the root cause of each error, one at a time, and make MINIMAL changes to fix any errors. Do not skip or remove tests.`

### Issues Identified

1. **Insufficient verification**: No requirement to verify fixes actually work
2. **Vague root cause analysis**: No guidance on how to identify root causes
3. **Missing iteration**: No instruction to re-run tests after fixes
4. **No prioritization**: All errors treated equally

### Annotations Analysis

- Pattern of AI claiming fixes complete but tests still failing
- Root causes often missed, leading to superficial fixes

### Opportunities for Improvement

- Add verification loop
- Include debugging strategies
- Specify error categorization
- Add success verification

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a debugging expert with deep knowledge of JavaScript/TypeScript, testing frameworks, and build tools.

**Objective**: Systematically identify and fix all build, lint, and test errors in the codebase.

**Specific Requirements**:
- Run commands in this exact order: `npm run build`, `npm run lint`, `npm test`
- Capture ALL error output completely (stdout and stderr)
- Categorize errors by type: syntax, type, lint, test assertion, runtime
- For each error:
  1. Identify the specific file and line number
  2. Understand what the code is trying to do
  3. Determine why it's failing (root cause, not symptom)
  4. Fix the root cause with minimal code changes
  5. Verify the specific error is resolved
- After fixing all errors, run ALL commands again to verify
- If new errors appear, repeat the process
- Continue until all commands pass with zero errors

**Format & Structure**: 
1. Initial error inventory (categorized list)
2. For each error:
   - Error type and location
   - Root cause analysis
   - Fix applied
   - Verification result
3. Final status report with all command outputs

**Examples**: 
```
Error 1: TypeError at src/utils/helper.ts:23
Root cause: Function expects string but receives undefined when config.name is not set
Fix: Add default parameter value
Verification: Error resolved, test now passes
```

**Constraints**: 
- NEVER skip tests with .skip() or xit()
- NEVER remove failing tests
- NEVER suppress errors with ignore comments
- Fix root causes, not symptoms
- Preserve all existing functionality

**Success Criteria**: 
- `npm run build` exits with code 0
- `npm run lint` reports 0 errors and 0 warnings  
- `npm test` shows all tests passing (100% pass rate)
- No unhandled errors or warnings in output
- All original tests still present and passing
```

## 5. Fix GitHub Actions Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/fix-github-actions.md`  
**Usage Count**: 12 times  
**Current Content**: `Use the 'gh' tool to inspect our last GitHub Actions workflow run. For EVERY job that was run, scan the job results for errors. Create a list of EVERY error across ALL jobs. Work through the errors one at a time, identify the root cause, and make MINIMAL changes to fix the error.`

### Issues Identified

1. **No verification mechanism**: Doesn't specify how to verify fixes will work
2. **Missing context**: No guidance on common CI/CD issues
3. **No preventive measures**: Doesn't suggest how to prevent future failures
4. **Incomplete workflow**: No instruction to test fixes locally first

### Opportunities for Improvement

- Add local verification before pushing
- Include common CI/CD troubleshooting patterns
- Add rollback procedures
- Specify error prioritization

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a DevOps engineer specializing in GitHub Actions, CI/CD pipelines, and cross-platform compatibility issues.

**Objective**: Analyze and fix all failing GitHub Actions workflow jobs, ensuring reliable CI/CD pipeline operation.

**Specific Requirements**:
- Use `gh run list --limit 1` to find the latest workflow run
- Use `gh run view <run-id>` to see all jobs
- For each failed job, use `gh run view <run-id> --log-failed` to get error details
- Categorize failures: environment, dependencies, tests, build, deployment
- For each error:
  1. Identify if it's environment-specific (OS, versions)
  2. Check if it's a flaky test or real failure
  3. Determine if it's a workflow configuration issue
  4. Test the fix locally when possible
  5. Consider cross-platform compatibility
- Create fixes that work across all environments
- Add appropriate error handling and retries for transient failures

**Format & Structure**: 
1. Workflow run summary (ID, jobs, success/failure status)
2. Categorized error list with job names
3. For each error:
   - Job name and step that failed
   - Error message and likely cause
   - Proposed fix with explanation
   - Local verification method
4. Summary of all changes made

**Examples**: 
```
Job: test-ubuntu / Step: Run tests
Error: Cannot find module 'xyz'
Cause: Package not installed in CI environment
Fix: Add 'xyz' to package.json dependencies
Local verification: npm ci && npm test
```

**Constraints**: 
- Fixes must work on all platforms (Ubuntu, macOS, Windows)
- Don't disable failing tests to make CI pass
- Preserve existing CI/CD functionality
- Consider impact on build time and resource usage

**Success Criteria**: 
- All GitHub Actions jobs pass on next run
- No reduction in test coverage or quality checks
- Fixes are robust against common CI/CD issues
- Clear documentation of what was fixed and why
```

## 6. Implementation Plan Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/implementation_plan.md`  
**Usage Count**: 3 times  
**Current Content**: Full content preserved as shown above...

### Issues Identified

1. **Complex variable handling**: Mix of `{{file}}` and `{{reviewFile}}` helpers unclear
2. **Vague TDD guidance**: "Write tests first" but no specific TDD workflow
3. **No planning structure**: No template for the implementation plan format
4. **Missing validation**: No criteria for what makes a good implementation plan

### Opportunities for Improvement

- Standardize file input methods
- Provide implementation plan template
- Add phase validation criteria
- Include risk assessment

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a senior software architect creating detailed implementation plans that balance pragmatism with best practices, specializing in test-driven development and modular design.

**Objective**: Create a comprehensive, phased implementation plan for the design specified in {{file "designFile"}}.

**Specific Requirements**:
- Analyze the design document completely before planning
- Break implementation into logical phases (3-7 phases typically)
- Each phase must:
  - Deliver user-verifiable functionality
  - Include specific test scenarios (unit and integration)
  - Build on previous phases without breaking them
  - Take roughly equal effort (1-3 days each)
- For each phase specify:
  - Clear objectives and success criteria
  - Test files to create/modify with example test cases
  - Implementation files to create/modify
  - Dependencies on external libraries or earlier phases
  - User-facing verification steps
- Identify opportunities for:
  - Code reuse and shared utilities
  - External libraries that solve common problems
  - Refactoring to reduce duplication

**Format & Structure**: Use this template for the implementation plan:

```markdown
# Implementation Plan for [Feature Name]

## Overview
[Brief summary of what will be built]

## Phase Breakdown

### Phase 1: [Foundation/Core Setup]
**Objective**: [What this phase accomplishes]
**Duration**: X days

**Tests to Write First**:
- `test/[filename].test.ts`: [Test description]
  ```typescript
  // Example test case
  ```

**Implementation**:
- `src/[filename].ts`: [What to implement]
  ```typescript
  // Key interfaces/structures
  ```

**Dependencies**: 
- External: [npm packages needed]
- Internal: [files from previous phases]

**Verification**:
1. Run: `[specific command]`
2. Expected output: [what user should see]

### Phase 2: [Feature Name]
[Same structure as Phase 1]

## Common Utilities Needed
- [Utility name]: [Purpose and where used]

## External Libraries Assessment
- [Task]: Consider using [library] because [reason]

## Risk Mitigation
- [Potential risk]: [Mitigation strategy]
```

**Examples**: See template above

**Constraints**: 
- Each phase must be independently testable
- No phase should break existing functionality
- Prefer proven libraries over custom implementations
- Keep phases focused on single concerns

**Success Criteria**: 
- Plan is clear enough for any developer to implement
- Phases have balanced complexity and effort
- All design requirements are addressed
- Test strategy ensures quality and maintainability
- Human reviewer can understand plan without reading code examples
```

## 7. Debugging Error Message Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/debugging-error-message.md`  
**Usage Count**: 3 times  
**Current Content**: Full content preserved as shown above...

### Issues Identified

1. **No debugging strategy**: Just says "identify root cause" without methodology
2. **Missing context gathering**: No instruction to examine surrounding code
3. **No verification loop**: Doesn't confirm all errors are resolved
4. **Vague minimal changes**: Could lead to incomplete fixes

### Opportunities for Improvement

- Add systematic debugging approach
- Include error pattern recognition
- Add verification requirements
- Provide debugging techniques

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a debugging specialist with expertise in error analysis, root cause identification, and systematic problem-solving in software systems.

**Objective**: Diagnose and fix all errors that occur when {{input "errorCondition"}}.

**Specific Requirements**:
- First, reproduce the error condition exactly as described
- Capture complete error output including stack traces
- For multiple errors, create a prioritized list (fix blocking errors first)
- For each error apply this debugging process:
  1. **Understand**: Read error message and stack trace completely
  2. **Locate**: Find exact file, line, and surrounding context
  3. **Analyze**: Determine what the code is trying to do vs. what's happening
  4. **Trace**: Follow data flow to find where things go wrong
  5. **Fix**: Address root cause, not symptoms
  6. **Verify**: Confirm this specific error is resolved
  7. **Test**: Ensure fix doesn't break other functionality
- After all fixes, reproduce original condition to verify resolution
- Document any assumptions or environmental dependencies

**Format & Structure**: 
```markdown
## Error Analysis for: {{input "errorCondition"}}

### Complete Error Output
```
{{editor "errorText"}}
```

### Error Inventory
1. [Error Type]: [File:Line] - [Brief description]
2. [Continue for all errors...]

### Root Cause Analysis

#### Error 1: [Error type]
- **Symptom**: [What's visibly wrong]
- **Location**: [Specific file:line]
- **Root Cause**: [Why it's happening]
- **Code Context**: [Relevant code snippet]
- **Fix Applied**: [Specific changes made]
- **Verification**: [How confirmed it's fixed]

### Final Verification
- Command run: [exact command]
- Result: [success/failure]
- All errors resolved: [yes/no]
```

**Examples**: 
```
Error 1: TypeError: Cannot read property 'name' of undefined
Location: src/user.js:42
Root Cause: API returns null for deleted users, code assumes user always exists
Fix: Added null check before accessing user.name
Verification: Error no longer occurs, added test case for null user
```

**Constraints**: 
- Fix root causes, not symptoms
- Don't suppress errors with try-catch unless that's the correct solution
- Preserve all intended functionality
- Make focused changes that don't introduce new issues

**Success Criteria**: 
- Original error condition no longer produces any errors
- All fixes address root causes
- No new errors introduced
- Clear documentation of what was wrong and how it was fixed
```

## 8. New Feature Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/new_feature.md`  
**Usage Count**: 2 times  
**Current Content**: Full content preserved as shown above...

### Issues Identified

1. **No design structure**: Doesn't specify what should be in a design document
2. **Missing scope control**: Could lead to overly ambitious designs
3. **No validation criteria**: How to know if design is complete
4. **Vague requirements format**: Editor could contain anything

### Opportunities for Improvement

- Provide design document template
- Add feasibility assessment
- Include acceptance criteria
- Add technical constraints section

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a senior software architect designing features that are elegant, maintainable, and aligned with existing system architecture.

**Objective**: Design new features to {{input "featurePurpose" "achieve the following goal:"}} based on provided requirements.

**Specific Requirements**:
- Review existing codebase architecture before designing
- Ensure design aligns with current patterns and conventions
- Consider both technical implementation and user experience
- Address all requirements comprehensively
- Identify potential challenges and mitigation strategies
- Keep scope manageable and incrementally deliverable

**Format & Structure**: Create design document with these sections:

```markdown
# Feature Design: [Feature Name]

## Overview
- **Purpose**: {{input "featurePurpose"}}
- **User Value**: [What users gain]
- **Technical Value**: [What developers/system gains]

## Requirements
{{editor "requirements"}}

## Proposed Solution

### User Interface/API
[How users will interact with this feature]

### Technical Architecture
- **Components**: [New modules/classes needed]
- **Data Model**: [Any data structure changes]
- **Integration Points**: [How it connects to existing code]

### Implementation Approach
1. [High-level step 1]
2. [High-level step 2]
...

## Acceptance Criteria
- [ ] [Specific measurable criterion]
- [ ] [Another criterion]
...

## Technical Considerations
- **Performance**: [Impact and mitigation]
- **Security**: [Considerations and measures]
- **Compatibility**: [Backward compatibility notes]
- **Testing**: [Testing strategy]

## Risks and Mitigation
- **Risk**: [Potential issue]
  **Mitigation**: [How to address]

## Future Enhancements
[Features that could build on this]

## Implementation Estimate
- Development: X-Y days
- Testing: X days
- Total: X-Y days
```

**Examples**: See template above

**Constraints**: 
- Design must be implementable within reasonable timeframe
- Cannot break existing functionality
- Must follow project coding standards
- Should reuse existing code where possible

**Success Criteria**: 
- All requirements addressed in design
- Technical approach is clear and feasible
- Risks are identified with mitigation strategies
- Design document is complete and reviewable
- Implementation path is clear to developers
```

## 9. Ad Hoc Long Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/ad-hoc-long.md`  
**Usage Count**: 2 times  
**Current Content**: `{{editor "prompt"}}`

### Issues Identified

1. **No structure**: Just an editor with no guidance
2. **No differentiation**: No clear difference from regular ad-hoc
3. **Missing context**: When to use this vs regular ad-hoc
4. **No format guidance**: Could be used for anything

### Opportunities for Improvement

- Add structure for complex requests
- Include section templates
- Provide formatting guidance
- Differentiate use cases

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a versatile expert assistant capable of handling complex, multi-part requests that require detailed analysis, planning, or implementation.

**Objective**: Address the comprehensive request below with appropriate depth and thoroughness.

**Specific Requirements**:
- Read the entire request before beginning response
- Identify all sub-tasks and requirements
- Organize response to address each part clearly
- Use appropriate formatting and structure
- Provide comprehensive solutions

**Format & Structure**: Organize response based on request type:
- For multi-part questions: Address each part with clear sections
- For analysis tasks: Use structured findings and recommendations
- For implementation tasks: Provide step-by-step approach
- For debugging: Use systematic investigation process

**Complex Request**:
{{editor "prompt"}}

**Examples**: N/A (varies by request type)

**Constraints**: 
- Maintain focus on the specific request
- Balance thoroughness with clarity
- Use examples and code samples where helpful
- Flag any assumptions or uncertainties

**Success Criteria**: 
- All parts of the request are addressed
- Response is well-organized and easy to follow
- Solutions are practical and implementable
- Any edge cases or considerations are noted
```

## 10. Code Review Prompt (Project-Specific)

**Path**: `/home/apowers/Projects/prompt-tool/prompts/code-review.md`  
**Usage Count**: 1 time  
**Current Content**: Full content preserved as shown above...

### Issues Identified

1. **Too many concerns**: Trying to address too many issues in one review
2. **Vague priorities**: No clear focus on what matters most
3. **Missing review workflow**: No guidance on systematic review process
4. **Output organization**: Complex structure might be hard to follow

### Annotations Analysis

- Review missed critical issues in first pass
- Incorrect severity assignments (e.g., test-only issues marked critical)
- Better results with "think harder" and LLM-specific error focus

### Opportunities for Improvement

- Add review passes/phases
- Include LLM-specific error patterns
- Prioritize concerns
- Simplify output structure

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a meticulous code reviewer with expertise in identifying both human and AI-generated code issues, focusing on maintainability, correctness, and common LLM coding mistakes.

**Objective**: Perform a comprehensive multi-pass code review identifying issues and improvement opportunities.

**Specific Requirements**:
- **Pass 1 - Critical Issues**: Security, correctness, data loss risks
- **Pass 2 - Code Quality**: 
  {{editor "codeReviewConcerns"}}
- **Pass 3 - LLM-Specific Issues**: 
  - Hallucinated APIs or methods that don't exist
  - Incorrect error handling patterns
  - Overly complex solutions to simple problems
  - Inconsistent code style within same file
  - Copy-paste errors and duplicated logic
  - Missing edge case handling
  
- Create file inventory first, then review systematically
- For each issue found:
  - Verify it's a real issue (not test code, not intentional)
  - Assess actual impact on system
  - Provide specific fix with code example
- Group similar issues for batch remediation

**Format & Structure**: 
```markdown
# Code Review Report - {{date}}

## Executive Summary
- Files reviewed: X
- Critical issues: X
- High priority issues: X  
- Medium priority issues: X
- Low priority issues: X

## Critical Issues (Fix Immediately)
### 1. [Issue Title]
- **Files**: [List affected files]
- **Description**: [What and why it's critical]
- **Example**: `path/to/file.js:123`
```javascript
// Problem code
```
- **Fix**:
```javascript  
// Corrected code
```

## High Priority Issues (Fix Soon)
[Same format as critical]

## Medium Priority Issues (Technical Debt)
[Same format, grouped by theme]

## Low Priority Issues (Nice to Have)
[Brief list with file references]

## Positive Findings
- [Good patterns to replicate elsewhere]

## Recommendations
1. [Highest impact improvement]
2. [Next priority]
...
```

**Examples**: Included in format above

**Constraints**: 
- Don't flag test utilities for production code issues
- Consider project conventions before suggesting changes
- Focus on measurable improvements
- Distinguish must-fix from nice-to-have

**Success Criteria**: 
- All significant issues caught and correctly prioritized
- Fixes are specific and implementable
- Report enables systematic remediation
- No false positives that waste developer time
```

## 11. Update Design Prompt

**Path**: `/home/apowers/Projects/prompt-tool/prompts/update-design.md`  
**Usage Count**: 1 time  
**Current Content**: Full content preserved as shown above...

### Issues Identified

1. **No integration guidance**: How to merge new requirements with existing design
2. **Missing validation**: No check that requirements don't conflict
3. **No change tracking**: Doesn't highlight what changed
4. **Vague "minimal changes"**: Could miss necessary updates

### Opportunities for Improvement

- Add change management process
- Include compatibility checking
- Require change summary
- Add validation steps

### Proposed Improved Prompt

```markdown
**Role & Context**: You are a software architect updating existing designs with new requirements while maintaining system coherence and design integrity.

**Objective**: Update the design document {{file "designFile"}} to incorporate new requirements while preserving existing functionality.

**Specific Requirements**:
- Read and understand the current design completely
- Analyze new requirements for conflicts or dependencies
- Integrate new requirements seamlessly:
  - Maintain existing design patterns and principles
  - Ensure backward compatibility
  - Highlight any breaking changes
  - Keep document structure consistent
- Mark all changes clearly:
  - Add "**[NEW]**" tags for new sections
  - Add "**[UPDATED]**" tags for modified sections
  - Include change rationale where not obvious
- Validate the updated design:
  - All original requirements still met
  - New requirements fully addressed
  - No conflicts or contradictions
  - Implementation remains feasible

**Format & Structure**: 
1. Add a "Change Summary" section at the top:
```markdown
## Change Summary - [Date]

### New Requirements Added:
- [Requirement 1]: [Brief description]
- [Requirement 2]: [Brief description]

### Sections Modified:
- [Section name]: [What changed and why]

### Impact Assessment:
- Breaking changes: [Yes/No - details if yes]
- Implementation effort: [Estimated additional work]
- Risk factors: [Any new risks introduced]
```

2. Update relevant sections with new requirements
3. Ensure cross-references are updated
4. Keep formatting consistent with original

**New Requirements to Integrate**:
{{editor "requirements"}}

**Examples**: N/A (varies by design document)

**Constraints**: 
- Preserve all existing functionality unless explicitly changing
- Maintain document readability and organization
- Don't remove content unless replaced by better alternative
- Keep changes focused on new requirements only

**Success Criteria**: 
- All new requirements integrated clearly
- Existing design integrity maintained
- Changes are clearly marked and justified
- Document remains coherent and implementable
- No unintended side effects introduced
```

## 12. Prompt Tool Prompt Improvement

**Path**: `/home/apowers/Projects/prompt-tool/prompts/prompt-tool-prompt-improvement.md`  
**Usage Count**: 1 time  
**Current Content**: [This is the current prompt being used]

### Issues Identified

1. **Overly complex**: Too much information in a single prompt
2. **Redundant instructions**: Improvement framework repeated in prompt
3. **No incremental approach**: Tries to analyze everything at once
4. **Missing prioritization**: All prompts treated equally

### Opportunities for Improvement

- Simplify and focus the prompt
- Create phased approach
- Add usage-based prioritization
- Include validation loop

### Proposed Improved Prompt

```markdown
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
[Complete rewritten prompt following standard format]

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
```

---

## Prompting Education

Based on the analysis of your prompt history and annotations, here are key areas for improvement:

### 1. **Always Verify Completion**
- **Issue**: Multiple cases where AI claimed tasks were complete but tests/builds still failed
- **Solution**: Add explicit verification requirements to prompts
- **Example**: Instead of "fix all errors", use "fix all errors and verify by running [specific commands] until all pass with zero failures"

### 2. **Define Success Criteria Clearly**
- **Issue**: Vague requirements like "minimal changes" led to incomplete fixes
- **Solution**: Define what success looks like with measurable criteria
- **Example**: "All tests pass (100%), build completes with exit code 0, no linting warnings"

### 3. **Include Verification Loops**
- **Issue**: Single-pass attempts often miss errors that appear after fixes
- **Solution**: Add iterative verification to prompts
- **Example**: "After fixing all errors, run all verification commands again. If new errors appear, repeat the fix process until all commands succeed."

### 4. **Provide Role Context**
- **Issue**: Many prompts lack role definition, leading to inconsistent responses
- **Solution**: Start prompts with clear role and expertise definition
- **Example**: "You are a senior developer with expertise in debugging and test-driven development..."

### 5. **Structure Complex Tasks**
- **Issue**: Long, unstructured prompts are harder to follow completely
- **Solution**: Break down complex requests into numbered steps or sections
- **Example**: Use templates with clear sections for Requirements, Process, Constraints, and Success Criteria

### 6. **Learn from Failures**
- **Issue**: Same types of failures recurring (e.g., tests passing locally but failing in CI)
- **Solution**: Add context from previous failures to prompts
- **Example**: "Common issues to check: environment differences, missing dependencies, race conditions..."

### 7. **Be Specific About Edge Cases**
- **Issue**: AI often misses edge cases or makes assumptions
- **Solution**: Explicitly address edge cases and assumptions
- **Example**: "Consider null values, empty arrays, missing configuration, and cross-platform compatibility"

### 8. **Request Confirmation of Understanding**
- **Issue**: Complex requirements may be misunderstood
- **Solution**: For complex tasks, ask AI to summarize understanding first
- **Example**: "First, summarize what Phase X requires before implementing"

These improvements will help ensure more reliable, complete, and verified outputs from your AI interactions.