# Refactoring & Modernization Prompts

**SDLC Phase:** Refactoring, Technical Debt Reduction
**Category Clarity:** FUZZY (overlaps with code review and implementation)
**Developer Trust:** MEDIUM for small refactors; LOW for large codebase work

---

## Prompt 1: Goal-Specific Refactoring

**Source:** Addy Osmani Playbook, Reddit
**Pattern:** Explicit goals + explicit boundaries
**Why it works:** Prevents AI from "improving" things you didn't ask about

```
Refactor the following function to eliminate duplicate code and improve
performance. Specifically:
1. Avoid repeating the fetch logic for users and orders -- use a helper
   or fetch them together
2. Fetch both lists in parallel if possible
3. Keep the error handling for each fetch (we want to know which failed)
4. Improve data combination using a Map for O(1) lookup instead of nested loop

Do NOT change:
- The function signature
- The return type
- The error types thrown
- Any behavior visible to callers

Provide the refactored code with comments explaining each change.

[paste code]
```

---

## Prompt 2: Legacy Code Understanding (Before Refactoring)

**Source:** understandlegacycode.com, Augment Code
**Pattern:** Understand first, change second
**Why it works:** AI misidentifies business logic as bugs when it lacks context

```
Before I refactor this code, I need to understand it.

[paste legacy code]

1. Explain what this code does in plain English
2. Summarize what each function does and how they connect
3. Identify the inputs, outputs, and side effects
4. List any implicit assumptions or business rules encoded in the logic
5. Flag any parts that look like workarounds or special cases
   (these may be intentional business logic, not bugs)

Do NOT suggest changes yet. I just want to understand it first.
```

---

## Prompt 3: Incremental Refactoring (Code Smells)

**Source:** GitHub craftvscruft/chatgpt-refactoring-prompts, developer blogs
**Pattern:** Grade then fix, one smell at a time
**Why it works:** Prevents the "rewrite everything" tendency

```
List the code smells in this file. For each one:
- Name the smell (e.g., Long Method, Feature Envy, God Class)
- Point to the specific lines
- Rate severity (1-5)
- Suggest the minimal change to fix it

Then, starting with the highest-severity smell, refactor ONLY that one.
Show me the diff. I'll review before you continue to the next one.

[paste code]
```

---

## Prompt 4: Design Pattern Application

**Source:** Dev.to prompt collections, refactoring guides
**Pattern:** Apply specific design pattern
**Why it works:** Clear target pattern gives the AI a concrete goal

```
Rewrite this code using the [Strategy/Observer/Factory/etc.] design pattern.

Current code:
[paste code]

Explain:
1. Why this pattern fits this situation
2. The before/after class/module structure
3. How this makes the code more extensible
4. Any tradeoffs (added complexity, indirection)

If this pattern would be over-engineering for the current use case,
tell me that instead and suggest a simpler approach.
```

---

## Prompt 5: Paradigm Modernization

**Source:** Reddit, Dev.to
**Pattern:** Convert between programming paradigms
**Why it works:** Well-defined transformation rules make this reliable

```
I have a React component written as a class. Refactor it to a functional
component using Hooks.

[paste class component]

Specifically:
- Convert lifecycle methods to useEffect with appropriate dependency arrays
- Convert this.state to useState hooks
- Convert class methods to regular functions or useCallback where needed
- Preserve all existing behavior exactly
- Add comments where the mapping isn't obvious
```

---

## Prompt 6: Extract and Decouple

**Source:** Forge Code blog, architecture guides
**Pattern:** Separate concerns into distinct modules
**Why it works:** Clear decomposition criteria prevent arbitrary splitting

```
This [route handler/controller/component] does too much. Extract it into
separate concerns:

[paste code]

1. Extract input validation into [middleware/validator/schema]
2. Extract business logic into [service/use-case]
3. Extract data access into [repository/data-layer]
4. Keep the [handler/controller] thin -- only [HTTP/UI] concerns

Maintain the same external behavior. Show me each extracted file separately.
Ensure the original file now delegates to the extracted modules.
```

---

## Prompt 7: Performance-Focused Refactoring

**Source:** Developer blogs, performance engineering
**Pattern:** Measurable performance goal
**Why it works:** "Make it faster" is vague; specific goals are actionable

```
This function is a performance bottleneck. It processes [N] items and
takes [X]ms. I need it under [Y]ms.

[paste code with profiling data]

Specifically look for:
- Unnecessary allocations (especially inside loops)
- Data structure mismatches (using array where Map/Set would be O(1))
- Synchronous operations that could be parallelized
- Redundant computations that could be cached/memoized
- Database queries that could be batched

Show the optimized version and explain the expected performance improvement
for each change.
```
