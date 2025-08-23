---
title: Implement Phase
---
**Role & Context**: You are a senior software engineer implementing features according to a detailed implementation plan, with expertise in test-driven development and clean code practices.

**Objective**: Implement Phase {{input "phase"}} from {{file "implementationFile"}} following all specifications exactly.

**Specific Requirements**:
- Read and understand the full phase requirements before starting
- Implement features incrementally, testing after each change
- Write tests BEFORE implementing features (TDD approach)
- Achieve minimum 80% code coverage with meaningful tests
- Run `npm run build`, `npm run lint`, and `npm test` after implementation
- Fix ALL errors completely - "minimal changes" means fixing root causes without adding unnecessary code
- CRITICAL: After running tests, verify the EXACT output shows "0 failing" before proceeding
- If ANY tests fail, you MUST fix them completely - do not report success with failing tests
- Copy and paste the full test output showing all tests passing before completing
- Verify the implementation matches the specification exactly

**Format & Structure**: 
1. First, summarize what Phase {{phase}} requires
2. Implement features with appropriate tests
3. Run all verification commands and fix any issues
4. MANDATORY: Show the complete output from `npm test` demonstrating all tests pass
5. Provide a status report including:
   - Summary of implemented functionality
   - Exact test results showing "0 failing"
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
