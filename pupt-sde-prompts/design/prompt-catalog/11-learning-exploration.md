# Learning & Exploration Prompts

**SDLC Phase:** Cross-cutting (not a traditional SDLC phase)
**Category Clarity:** FUZZY (overlaps with documentation and debugging)
**Developer Trust:** HIGH (44% learned coding techniques via AI)

---

## Prompt 1: Concept Explanation with Code

**Source:** Dev.to, Reddit r/learnprogramming
**Pattern:** Concept + example + use case
**Why it works:** Concrete examples ground abstract concepts

```
Explain the concept of [e.g., memoization, currying, event loop, CQRS]
in [language].

Include:
1. What it is in plain English (one paragraph)
2. Why and when you'd use it (real-world scenarios)
3. A short, complete code example demonstrating it
4. Common mistakes when implementing it
5. When NOT to use it (anti-patterns / overkill scenarios)

Assume I'm an experienced developer in [other language] learning [this
language] for the first time.
```

---

## Prompt 2: Technology Comparison

**Source:** Developer decision-making workflows
**Pattern:** Structured comparison for decision-making
**Why it works:** Side-by-side comparison with criteria helps choose

```
I need to choose between [Option A] and [Option B] for [use case].

My requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

My constraints:
- Team size: [N]
- Team experience: [describe]
- Timeline: [timeframe]
- Scale: [expected load/data size]

Compare these options across:
1. Learning curve
2. Performance for my use case
3. Ecosystem / community / library support
4. Long-term maintenance burden
5. Hiring (how easy is it to find developers?)

Include a recommendation, but explain the tradeoffs clearly so I can
make an informed decision. Don't just tell me the popular choice.
```

---

## Prompt 3: Codebase Exploration

**Source:** Claude Code workflows, developer onboarding
**Pattern:** AI-guided codebase tour
**Why it works:** Faster than reading every file when joining a project

```
I'm new to this codebase and need to understand it quickly.

Here's the project structure:
[paste directory tree or describe structure]

And here's a key file:
[paste a central file like the main router, app entry point, etc.]

Help me understand:
1. What is the overall architecture? (monolith, microservices, etc.)
2. What is the request flow from entry point to response?
3. Where is the business logic? Where is the data access?
4. What patterns/conventions does this codebase follow?
5. What are the key abstractions I need to understand?
6. What files should I read first to understand the core domain?

Give me a prioritized reading list of 5-10 files to understand the system.
```

---

## Prompt 4: "Explain This Error" for Learning

**Source:** Stack Overflow, Reddit r/learnprogramming
**Pattern:** Deep explanation, not just fix
**Why it works:** Builds understanding rather than just solving the immediate problem

```
I'm getting this error:

[paste error]

Don't just tell me how to fix it. I want to understand:

1. What does this error mean conceptually?
2. What is the underlying mechanism that causes it?
3. What are the 3 most common scenarios that produce this error?
4. How do I diagnose which scenario I'm in?
5. How do I fix each scenario?
6. What should I understand about [relevant concept] to avoid this
   class of errors in the future?
```

---

## Prompt 5: Design Pattern Discovery

**Source:** Refactoring and architecture blogs
**Pattern:** Identify applicable patterns from code
**Why it works:** Bridges theory and practice

```
Here's a piece of code that works but feels messy:

[paste code]

1. What design patterns could improve this code?
2. For each suggested pattern:
   - Explain the pattern in one paragraph
   - Show how it would look applied to MY code (not a generic example)
   - Explain the tradeoffs (what you gain vs. what complexity you add)
3. Honestly assess: would applying these patterns be worthwhile for
   code of this scale, or am I better off keeping it simple?

I'd rather have no pattern than a forced one.
```
