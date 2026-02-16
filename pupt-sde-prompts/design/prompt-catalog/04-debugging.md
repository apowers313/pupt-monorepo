# Debugging & Error Resolution Prompts

**SDLC Phase:** Debugging, Troubleshooting
**Category Clarity:** CLEAR
**Developer Trust:** MEDIUM

---

## Prompt 1: Structured Bug Report

**Source:** Addy Osmani Playbook, developerway.com
**Pattern:** Error + Code + Expected vs. Actual
**Why it works:** Provides all context needed for accurate diagnosis

```
I have a [language] function [functionName] that should [expected behavior].
However, it [actual behavior/error].

When I pass [example input], I get [actual output/error].

Here is the function code:
[paste code]

Expected result: [expected output]
Actual result: [actual output or error message]

What is the bug and how can I fix it?
```

---

## Prompt 2: Full Error Context

**Source:** Sentry blog, Neon blog
**Pattern:** Include stack trace and environment
**Why it works:** Organizations using structured AI debugging see 60-75% faster resolution

```
I'm getting this error when running my [framework] application:

```
[paste full error message and stack trace]
```

Here is the relevant code:

```[language]
[paste the code referenced in the stack trace]
```

Environment:
- [language] version: [X]
- [framework] version: [Y]
- OS: [Z]

The error happens when: [describe the trigger condition]
It does NOT happen when: [describe when it works]

What is causing this error and how do I fix it?
```

---

## Prompt 3: Line-by-Line Walkthrough (Rubber Duck)

**Source:** Multiple sources, rubber duck debugging pattern
**Pattern:** Force explicit reasoning about code behavior
**Why it works:** Articulating assumptions reveals bugs; AI catches what you miss

```
Walk through this function line by line and track the value of [variable]
at each step. Show me the state after each operation.

[paste function]

I expect [variable] to be [expected value] at the end, but it's
[actual value]. Where does the logic go wrong?
```

---

## Prompt 4: Symptom-Based Debugging

**Source:** Builder.io Claude Code guide
**Pattern:** Describe the observable behavior discrepancy
**Why it works:** Works well when you don't know where the bug is

```
Users are being logged out after 5 minutes even though the session timeout
is configured to 60 minutes. The session cookie shows the correct maxAge
value. This only happens in production, not in development.

Relevant configuration:
[paste session/auth config]

What could cause the session to expire prematurely despite correct
configuration?
```

---

## Prompt 5: React-Specific Debugging

**Source:** Reddit r/webdev, Dev.to
**Pattern:** Framework-specific debugging context
**Why it works:** Framework knowledge helps identify common patterns

```
I have a React component that fetches user data, but it's causing infinite
re-renders. Here's my code:

[paste component]

Expected behavior: Should fetch user data once when userId changes.
Actual behavior: Component re-renders infinitely.
Console warning: "Warning: Maximum update depth exceeded."

What's causing this infinite loop and how do I fix the dependency array?
```

---

## Prompt 6: Iterative Debugging with Logs

**Source:** Cursor tips, developer workflows
**Pattern:** Add observability, then analyze
**Why it works:** Grounds debugging in actual runtime data, not speculation

```
Step 1: "Add console.log/logging statements to [function/module] to show
the values of [key variables] at each decision point."

[Run the code, collect output]

Step 2: "Here are the log outputs:
[paste logs]

Based on these results, what's the issue and how do I fix it?"
```

---

## Prompt 7: Regression Bug Analysis

**Source:** Developer workflows
**Pattern:** Before/after comparison
**Why it works:** Narrows the search space to recent changes

```
This feature was working until [date/commit/PR]. Now it [describe broken
behavior].

Here's what changed recently:
[paste diff or describe changes]

The feature should: [expected behavior]
It now does: [actual behavior]

Did any of these changes cause the regression? If so, what's the minimal
fix that preserves the intended changes?
```

---

## Prompt 8: Error Message Interpreter

**Source:** Dev.to prompt collections
**Pattern:** Translate cryptic errors to actionable fixes
**Why it works:** Many error messages are opaque; AI can decode them

```
I'm getting this error and I don't understand what it means:

```
[paste full error message]
```

In the context of my [language/framework] project that [brief description].

1. What does this error mean in plain English?
2. What are the most likely causes (ranked by probability)?
3. How do I fix each possible cause?
4. How do I prevent this error in the future?
```
