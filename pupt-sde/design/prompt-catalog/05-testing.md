# Testing & Test Generation Prompts

**SDLC Phase:** Unit Testing, Integration Testing, QA
**Category Clarity:** MOSTLY CLEAR (overlaps with implementation in TDD)
**Developer Trust:** MEDIUM (confidence jumps from 27% to 61% with AI testing)

---

## Prompt 1: Comprehensive Unit Test Suite

**Source:** Reddit, Dev.to, multiple prompt collections
**Pattern:** Structured test generation with coverage targets
**Why it works:** Explicit categories prevent the common "happy path only" AI tendency

```
For the following function, generate a complete [testing framework] test suite:

[paste function]

Include:
- Happy path tests with standard inputs
- Edge cases: empty input, null/undefined, boundary values, max/min integers
- Tests that verify specific error messages for invalid arguments
- Tests that mock [dependency] to simulate [failure scenario]
- Aim for 100% branch coverage
- Structure tests using describe/it (or equivalent) blocks
- Use descriptive test names that explain the scenario being tested

Follow the Arrange-Act-Assert pattern.
```

---

## Prompt 2: TDD Specification (Tests as Spec)

**Source:** Ready, Set, Cloud blog; Cursor best practice
**Pattern:** Write tests first, implementation second
**Why it works:** Tests serve as both specification and verification; "Robots love TDD"

```
I need a function that [describe behavior]. Before writing the
implementation, write the test suite first.

The function should:
- [behavior 1]
- [behavior 2]
- Handle edge case: [edge case 1]
- Throw [error type] when: [error condition]

Write comprehensive tests in [testing framework] first. Then implement
the function to pass all tests. Then run the tests and fix any failures.
```

---

## Prompt 3: TDD Implementation (Code from Tests)

**Source:** Ready, Set, Cloud blog, Aider workflows
**Pattern:** Generate implementation from existing tests
**Why it works:** The implementation is constrained by pre-verified tests

```
Write a [language] function handler that satisfies all the following unit
tests in the most performant way possible but still easy to maintain
long term.

[paste complete test suite]

Do not modify the tests. Only write the implementation.
```

---

## Prompt 4: Edge Case Brainstorming

**Source:** Addy Osmani Playbook, multiple sources
**Pattern:** Adversarial test case generation
**Why it works:** Surfaces cases the developer didn't think of

```
Here is my function:

[paste function]

Can you provide test cases (specific inputs) that might break this function?
Think about:
- Empty/null/undefined inputs
- Very large or very small numbers
- Unicode and special characters
- Concurrent access
- Timing-dependent behavior
- Type coercion edge cases
- Boundary conditions at exactly the limits
```

---

## Prompt 5: Manual-to-Automated Test Conversion

**Source:** Dev.to prompt collections
**Pattern:** Translate human QA steps to code
**Why it works:** Bridges the gap between manual QA knowledge and automated tests

```
I currently test this feature manually:

Step 1: Navigate to /dashboard
Step 2: Click "Create New Project"
Step 3: Fill in project name "Test Project"
Step 4: Select team "Engineering"
Step 5: Click "Create"
Step 6: Verify the project appears in the list
Step 7: Verify the URL changed to /projects/[id]

Convert this into an automated end-to-end test using [Playwright/Cypress].
Include proper waiting strategies (don't use arbitrary timeouts).
Handle the case where the test needs cleanup (delete the project after).
```

---

## Prompt 6: Integration Test Generation

**Source:** Developer workflows
**Pattern:** Test interactions between components
**Why it works:** Catches bugs that unit tests miss

```
Write integration tests for the [endpoint/workflow] that verify:

1. The full request -> service -> database -> response flow
2. Authentication/authorization checks
3. Input validation rejections
4. Database transaction behavior (commit on success, rollback on failure)
5. Error propagation from service layer to API response

Use [test framework] with [database strategy: in-memory/test container/mock].
Set up and tear down test data for each test case.
```

---

## Prompt 7: Mutation Testing / Test Quality Check

**Source:** Developer workflows
**Pattern:** Verify tests actually catch bugs
**Why it works:** Prevents the common AI failure of "tests that pass but don't verify anything"

```
Review these tests and identify:

[paste test code]

1. Tests that would still pass even if the implementation had bugs
   (tests that don't actually assert meaningful behavior)
2. Missing test cases that a mutation testing tool would catch
3. Over-mocked tests where the mock replaces the thing being tested
4. Tests that are testing implementation details instead of behavior
5. Assertions that are trivially true (e.g., asserting a mock returns
   what you told it to return)

For each issue, suggest a replacement test that actually verifies correctness.
```

---

## Prompt 8: Test Refactoring

**Source:** Developer workflows
**Pattern:** Improve existing test suite quality
**Why it works:** Makes existing tests more maintainable and reliable

```
Refactor this test suite to:

[paste tests]

1. Extract common setup into beforeEach/setUp
2. Remove duplication between test cases
3. Use test factories/builders for test data
4. Make test names describe the scenario, not the implementation
5. Group related tests with describe/context blocks
6. Replace magic numbers with named constants
7. Ensure each test tests exactly one thing

Keep the same coverage -- don't remove any test scenarios.
```
