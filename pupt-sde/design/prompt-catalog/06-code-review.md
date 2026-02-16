# Code Review & Quality Prompts

**SDLC Phase:** Code Review, Quality Assurance
**Category Clarity:** FUZZY (overlaps with debugging, security, refactoring)
**Developer Trust:** LOW-MEDIUM (finds bugs ~80% but terrible signal-to-noise)

---

## Prompt 1: Scoped Review (Bugs Only)

**Source:** Graphite guides, Addy Osmani
**Pattern:** Focused review scope to reduce noise
**Why it works:** The #1 complaint about AI review is noise; scoping fixes this

```
Review this code for logic bugs and edge cases ONLY. Do not comment on
style, naming, or formatting. Do not suggest refactoring.

For each bug found:
- Severity: Critical / Major / Minor
- The specific line(s)
- What the bug is and when it would manifest
- A concrete fix

[paste code]
```

---

## Prompt 2: Senior Engineer Review

**Source:** Reddit r/ClaudeAI, Graphite guides
**Pattern:** Role + scope + output format
**Why it works:** Combines persona with structure for professional-grade feedback

```
You are a senior software engineer reviewing a pull request.

Language: [language], Framework: [framework]

Review for:
1. Logic errors and race conditions
2. Edge cases that would cause failures in production
3. Performance issues (N+1 queries, unnecessary allocations, O(n^2))
4. Missing error handling
5. Violations of [specific coding standard]

For each issue:
- Severity (critical/major/minor)
- Explanation of WHY it matters (not just what's wrong)
- Concrete code fix

Ignore: style preferences, naming opinions, comment density.

[paste code]
```

---

## Prompt 3: Security-Focused Review

**Source:** crashoverride.com blog, Augment Code
**Pattern:** Checklist-based security audit
**Why it works:** Specificity about what to look for prevents generic responses

```
Analyze this code for security vulnerabilities. Check specifically for:

1. SQL injection (CWE-89)
2. Cross-site scripting / XSS (CWE-79)
3. Improper input validation (CWE-20)
4. Information exposure in error messages (CWE-200)
5. Hardcoded credentials or secrets (CWE-798)
6. Path traversal (CWE-22)
7. Insecure deserialization (CWE-502)
8. Missing authentication/authorization checks

For each finding:
- CWE identifier
- Severity (Critical/High/Medium/Low)
- The vulnerable code
- Attack scenario (how could this be exploited?)
- Remediation code

[paste code]
```

---

## Prompt 4: Performance Review

**Source:** Developer blogs, performance engineering
**Pattern:** Performance-specific analysis
**Why it works:** Focuses on measurable performance concerns

```
Review this code for performance issues:

[paste code]

Check for:
1. Algorithmic complexity (is there an O(n^2) or worse hidden?)
2. N+1 query patterns
3. Unnecessary memory allocations (especially in loops)
4. Missing database indexes for the query patterns used
5. Blocking operations that should be async
6. Cacheable computations being re-computed
7. Data structures that don't match the access pattern

For each issue, estimate the impact (how much slower) and provide
the optimized version.
```

---

## Prompt 5: PR Description Review

**Source:** What I Look For in AI-Assisted PRs blog
**Pattern:** Review the PR as a whole, not just code
**Why it works:** Catches architectural and context issues that line-by-line review misses

```
Here is a pull request diff:

[paste diff]

And the PR description:
[paste description]

Review this PR holistically:
1. Does the code change match what the PR description says?
2. Are there any unrelated changes mixed in?
3. Is the PR a reasonable size (<500 lines) or should it be split?
4. Are there any "vibe code smells" (scattered imports, excessive
   defensive coding, over-mocking in tests, tests that don't assert
   meaningful behavior)?
5. Does the code fit architecturally with the rest of the codebase?
6. Are there any missing test cases for the changes?
```

---

## Prompt 6: Focused Review with Context

**Source:** Graphite guides, Claude Code PR review
**Pattern:** Provide codebase context for better review
**Why it works:** Prevents false positives from AI not understanding the codebase

```
Review this code change in the context of our codebase:

Our patterns:
- Error handling: We use Result<T, AppError> types, never throw
- Database: All access through service layer, never directly in routes
- Auth: JWT tokens validated by middleware before reaching handlers
- Testing: Integration tests use test containers, not mocks

The change:
[paste code]

Given our patterns, does this code follow our conventions? Flag anything
that deviates and explain whether the deviation is justified or a mistake.
```

---

## Prompt 7: Concise PR Review (Minimal Noise)

**Source:** Builder.io Claude Code guide
**Pattern:** Direct instruction to be concise
**Why it works:** Explicitly fights the verbose AI tendency

```
Review for bugs and security issues ONLY. Be concise.
Do not explain things I already know.
Do not suggest improvements unless they fix a bug.
If the code is fine, say "LGTM" and nothing else.

[paste code]
```
