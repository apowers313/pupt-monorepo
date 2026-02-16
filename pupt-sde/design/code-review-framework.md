# A Framework for Thinking About Code Reviews

Based on research across academic literature (Google Scholar, arXiv, IEEE, ACM) and practitioner sources (Google, Meta, Microsoft engineering blogs, Reddit, Hacker News, dev.to).

---

## The Five Dimensions of Effective Code Review

### 1. PURPOSE — Why We Review

Academic research (Bacchelli & Bird, ICSE 2013) found that **defect detection is the stated motivation but not the primary outcome.** The actual value spectrum is broader:

| Purpose | Evidence |
|---------|----------|
| **Defect detection** | Unreviewed commits have 2x the bug rate (Bavota & Russo, 2015) |
| **Knowledge transfer** | Reviews increase file familiarity by 66-150% (Rigby & Bird, 2013) |
| **Code improvement** | Design, readability, maintainability gains |
| **Team awareness** | Shared understanding of system evolution |
| **Mentoring** | Onboarding and skill development vehicle |
| **Gatekeeping** | Architectural consistency, security, standards enforcement |

**Key insight:** A review focused solely on "finding bugs" misses most of its value. The best reviews treat knowledge sharing and code improvement as first-class outcomes alongside correctness.

---

### 2. PARAMETERS — The Science of How

Empirical research converges on hard numbers:

| Parameter | Optimal | Evidence |
|-----------|---------|----------|
| **Change size** | 200-400 LOC | Cisco/SmartBear: 70-90% defect discovery at this range. Beyond 2K lines, reading becomes skimming |
| **Review speed** | < 500 LOC/hr, ideally ~200 LOC/hr | Kemerer & Paulk (2009): 200 LOC/hr catches ~2/3 of defects |
| **Session duration** | ≤ 60 minutes | Effectiveness degrades measurably after 60 min (SmartBear) |
| **Number of reviewers** | 2 optimal | Diminishing returns beyond 2; Google uses 1 for 75% of reviews |
| **Response time** | < 4 hours first response, < 24 hours turnaround | Google: 70% committed within 24 hours (Sadowski et al., 2018). Meta: P75 time correlates with engineer dissatisfaction |
| **File ordering** | Important files first | Bugs in first file are **64% more likely** to be found than last file (Fregnan et al., 2023) |
| **Reviewer familiarity** | Same reviewer, same area | Useful comments reach **80%** when reviewer has seen the file 5+ times (Bosu et al., 2015) |

---

### 3. FOCUS — What to Actually Look At

Review hierarchically — start high-level and work down. HN practitioners argue **maintainability > correctness** because correctness is better caught by tests and types, while maintainability requires human judgment.

**Review hierarchy (top-down):**

1. **Design & architecture** — Does this belong here? Does it fit the system's patterns? Is this the right abstraction?
2. **Correctness & logic** — Edge cases, error handling, race conditions, off-by-ones
3. **Security** — Input validation, auth boundaries, data exposure
4. **Test quality** — Not just coverage, but: do the tests actually verify the right behavior? Start by reading tests to understand intent (Microsoft recommendation)
5. **Readability & maintainability** — Can the next developer understand this? Naming, complexity, cognitive load
6. **Performance** — Only when contextually relevant (hot paths, data-heavy operations)
7. **Style & formatting** — **Automate this entirely.** Linters, formatters, CI checks. Never spend human review time on it.

---

### 4. COMMUNICATION — The Human Layer

This is where practice most frequently breaks down. Research shows engineers use self-regulation strategies (reframing, avoidance, defensiveness) when receiving critical feedback (Alami et al., 2025). Communication quality determines whether feedback gets adopted or ignored.

**Three frameworks practitioners have converged on:**

**A. The OIR Rule** (Philipp Hauer):
- **Observation:** "This method is 100 lines long"
- **Impact:** "This makes it hard for me to grasp the logic"
- **Request:** "Could we extract the validation into a helper?"

**B. Conventional Comments** (widely adopted):
```
suggestion (non-blocking): Consider using a Map here for O(1) lookups.
issue (blocking): This doesn't handle the case where `user` is null.
praise: Nice use of the builder pattern here — very readable.
question: What happens if this promise rejects before the timeout?
nitpick (non-blocking): Typo in variable name.
```

**C. The Three Filters** (before commenting):
1. Is it **true**?
2. Is it **necessary**?
3. Is it **kind**?

**Communication principles backed by research:**
- Talk about the code, not the coder ("This code requests the service twice" not "You're requesting the service twice")
- Ask questions rather than make demands ("What do you think about...?" not "Change this to...")
- Use I-messages ("It's hard for me to understand..." not "This is confusing")
- Ground feedback in principles, not preference ("This violates SRP" not "I'd do it differently")
- Prefix minor items with "Nit:" to signal non-blocking
- Escalate to synchronous conversation after 2-3 rounds of back-and-forth (Gergely Orosz)
- Limit to 2-3 code examples per round to avoid seeming condescondescending (Michael Lynch)

---

### 5. ANTI-PATTERNS — What Destroys Review Culture

Simon Tatham's catalog and AWS guidance identify the most destructive patterns:

| Anti-Pattern | Description |
|-------------|-------------|
| **Death of 1000 Round Trips** | Finding one issue, stopping, forcing resubmit, repeat |
| **The Ransom Note** | Blocking approval unless unrelated work is done |
| **The Priority Inversion** | Nitpicking details first, then revealing fundamental design problems after effort is wasted |
| **The Late-Breaking Design Review** | Challenging the entire approach after implementation is nearly complete |
| **The Flip-Flop** | Objecting to a pattern previously approved |
| **Rubber Stamping** | Approving without reading. Meta tracks "Eyeball Time" as a guardrail against this |
| **Perfectionism** | Requiring perfection when the standard should be "improves overall code health" (Google) |
| **Style Warring** | Debating formatting when linters could handle it |
| **Weaponized Reviews** | Using reviews as political tools or bullying |

---

## Cognitive Biases That Undermine Reviews

Academic research (Jetzen et al., 2024; Fregnan et al., 2023) identifies biases that distort review quality:

- **Confirmation bias** — Seeing what you expect to see, missing what you don't
- **Decision fatigue** — Quality degrades as session length increases
- **File ordering bias** — First files get 64% better scrutiny than last files
- **The IKEA Effect** — Authors overvalue their own code
- **Change size bias** — Large changes get less review per line
- **Familiarity bias** — Approving code from trusted authors with less scrutiny

**Countermeasures:** Checklists, time-boxing, file reordering by importance, rotation of reviewers.

---

## What AI Can and Cannot Do (Current State)

Recent research (2024-2025) shows:

- LLM-based review tools achieve **73.8% comment resolution** but increase PR closure time by ~42% (Cihan et al., 2024)
- The best LLM system scores only **19.38% F1** on realistic benchmarks (SWR-Bench, 2025)
- AI is useful for **routine/mechanical** checks but humans remain superior for **semantic, contextual, and architectural** judgment
- AI shifts engagement from "emotion management" to "cognitive load management" (Alami et al., 2025)

**Bottom line:** AI assists but doesn't replace the human judgment that makes reviews valuable.

---

## Sources

### Scholarly
- Bacchelli & Bird, "Expectations, Outcomes, and Challenges of Modern Code Review" (ICSE 2013) — [IEEE](https://ieeexplore.ieee.org/document/6606617/)
- Rigby & Bird, "Convergent Contemporary Software Peer Review Practices" (ESEC/FSE 2013) — [ACM](https://dl.acm.org/doi/10.1145/2491411.2491444)
- Bosu, Greiler & Bird, "Characteristics of Useful Code Reviews" (MSR 2015) — [IEEE](https://ieeexplore.ieee.org/document/7180075/)
- Bavota & Russo, "Four Eyes Are Better Than Two" (ICSME 2015) — [IEEE](https://ieeexplore.ieee.org/document/7332454/)
- McIntosh et al., "Impact of Modern Code Review on Software Quality" (ESE 2016) — [Springer](https://link.springer.com/article/10.1007/s10664-015-9381-9)
- Sadowski et al., "Modern Code Review: A Case Study at Google" (ICSE SEIP 2018) — [Google Research](https://research.google/pubs/modern-code-review-a-case-study-at-google/)
- Kemerer & Paulk, "Impact of Design and Code Reviews on Software Quality" (IEEE TSE 2009) — [IEEE](https://ieeexplore.ieee.org/document/4815279/)
- Fregnan et al., "Assessing the Impact of File Ordering Strategies" (2023) — [arXiv](https://arxiv.org/html/2306.06956)
- Chouchen et al., "Does Code Review Speed Matter?" (ESE 2024) — [arXiv](https://arxiv.org/abs/2311.02489)
- Jetzen et al., "Towards Debiasing Code Review Support" (2024) — [arXiv](https://arxiv.org/abs/2407.01407)
- Alami et al., "Engagement in Code Review" (2025) — [arXiv](https://arxiv.org/abs/2512.05309)
- Yang et al., "A Survey on Modern Code Review" (2024, 231 papers surveyed) — [arXiv](https://arxiv.org/abs/2405.18216)
- Cihan et al., "Automated Code Review In Practice" (ICSE 2025) — [arXiv](https://arxiv.org/abs/2412.18531)

### Practitioner
- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/reviewer/)
- [Google SWE Book Ch. 9: Code Review](https://abseil.io/resources/swe-book/html/ch09.html)
- [Meta: Improving Code Review Time](https://engineering.fb.com/2022/11/16/culture/meta-code-review-time-improving/)
- [Microsoft Code-With Engineering Playbook](https://microsoft.github.io/code-with-engineering-playbook/code-reviews/process-guidance/)
- [Gergely Orosz: Good Code Reviews, Better Code Reviews](https://blog.pragmaticengineer.com/good-code-reviews-better-code-reviews/)
- [Philipp Hauer: Code Review Guidelines for Humans](https://phauer.com/2018/code-review-guidelines/)
- [Michael Lynch: How to Do Code Reviews Like a Human](https://mtlynch.io/human-code-reviews-1/)
- [SmartBear/Cisco: Best Practices for Peer Code Review](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [Simon Tatham: Code Review Antipatterns](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/code-review-antipatterns/)
- [AWS: Anti-patterns for Code Review](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/anti-patterns-for-code-review.html)
- [Michaela Greiler: 30 Proven Code Review Best Practices](https://www.michaelagreiler.com/code-review-best-practices/)
