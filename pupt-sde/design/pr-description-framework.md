# Pull Request Description Framework

A research-backed framework for writing effective pull request descriptions, synthesized from academic research, industry practitioner experience, and engineering practices at major technology companies.

## 1. Core Principles

### 1.1 WHY Over WHAT

The most consistently cited principle across all sources is that PR descriptions must explain **why** changes were made, not merely restate what changed. The diff already shows what changed; the description must add context, motivation, and rationale.

> "Reading source code may reveal what the software is doing but it may not reveal why it exists, which can make it harder for future developers to know whether they can move Chesterton's fence."
> -- [Google Engineering Practices: Writing Good CL Descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html)

### 1.2 The PR Description as Permanent Record

PR descriptions become permanent version control history read by many people over years. Future developers search for changes based on descriptions. This means descriptions must be written for an audience beyond the immediate reviewer.

**Source:** [Google Engineering Practices](https://github.com/google/eng-practices/blob/master/review/developer/cl-descriptions.md)

### 1.3 Audience-Aware Writing

A PR description serves three audiences simultaneously:

| Audience | Needs |
|---|---|
| **Reviewers** | Scope, risk, focus areas, review order |
| **Future maintainers** | Historical context, rationale for decisions |
| **Release managers** | Deployment impact, rollback plan, breaking changes |

### 1.4 Proportional Detail

Description depth should be proportional to change complexity. A one-line fix needs a brief description. A large architectural change needs thorough documentation.

## 2. PR Title Best Practices

### 2.1 Format Guidelines

| Guideline | Source |
|---|---|
| First line is a complete imperative sentence (e.g., "Add TTL support" not "Added TTL support") | [Google CL Descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) |
| Keep under 70 characters | Multiple sources |
| Should stand alone -- readers can understand the change from the title without reading the body | Google Engineering Practices |
| Start with a verb | Common industry practice |

### 2.2 Conventional Commits Integration

The [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification provides a machine-readable format:

```
<type>[optional scope]: <description>
```

Types include: `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`

This convention enables:
- Automatic CHANGELOG generation
- Automatic semantic version bumps (feat -> MINOR, fix -> PATCH, BREAKING CHANGE -> MAJOR)
- Structured, searchable commit history

**Note:** While some organizations use conventional commit prefixes in PR titles (for squash-merge workflows), others like Google prefer clean, human-readable titles without type prefixes. The choice depends on the team's workflow.

## 3. PR Size and Reviewability

### 3.1 Empirical Research on Optimal Size

| Metric | Finding | Source |
|---|---|---|
| Optimal PR size | 25-100 lines changed | [Graphite: The Ideal PR is 50 Lines Long](https://graphite.com/blog/the-ideal-pr-is-50-lines-long) |
| Review speed | 50-line PRs reviewed/merged ~40% faster than 250-line PRs | Graphite analysis |
| Defect detection ceiling | Defect discovery rate falls above 300 lines, drops significantly above 500 LOC | [Cisco Code Review Study](https://bssw.io/items/pull-request-size-matters) |
| Review efficiency drops | After 90 minutes of review time | Multiple studies |
| Revert rates | 50-line PRs 15% less likely to be reverted than 250-line PRs | Graphite analysis |
| Review engagement | 50-line PRs have 40% more review comments per line | Graphite analysis |
| Elite team threshold | Under 194 code changes | [LinearB benchmarks](https://linearb.io/blog/software-development-metrics-guide) |

### 3.2 The Single Responsibility Principle for PRs

Each PR should address a single concern. If you need to use the word "and" to describe what the PR does, it may need to be split.

**Source:** [One Pull Request, One Concern](https://medium.com/@fagnerbrack/one-pull-request-one-concern-e84a27dfe9f1), [Microsoft Engineering Playbook](https://microsoft.github.io/code-with-engineering-playbook/code-reviews/pull-requests/)

### 3.3 Shopify's Guideline

Shopify recommends around 200-300 lines of code affected per PR. If above this threshold, work should almost always be broken into smaller blocks.

**Source:** [Shopify Engineering: Great Code Reviews](https://shopify.engineering/great-code-reviews)

### 3.4 Stripe's Approach

Stripe merges an average of 1,145 PRs per day. Each PR is designed to be reviewable in under 5 minutes, safely revertible, and provides immediate value.

**Source:** [How Stripe Ships 1,145 Pull Requests Per Day](https://blog.pullnotifier.com/blog/how-stripe-ships-1145-pull-requests-per-day)

## 4. Essential PR Description Sections

### 4.1 Summary

2-3 sentences covering what and why. Links to the related issue using closure keywords (Closes, Fixes) when the PR fully resolves the issue.

### 4.2 Motivation / Problem Statement

Explains the problem being solved, the user need, or the technical debt prompting the change. This is the most important section for future readers.

### 4.3 Change Breakdown (by functional area)

Changes grouped by component/area rather than listed as a flat file list. Each group explains the rationale for the changes within it.

### 4.4 Breaking Changes

Must be explicitly addressed -- either documented with migration guidance or stated as absent. The [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard requires:
- Breaking changes indicated by `!` after type/scope or `BREAKING CHANGE:` footer
- Minimum notice period (e.g., 10 months for API deprecations at some companies)
- Clear migration steps and workarounds

### 4.5 Test Plan

Concrete verification steps including:
- Automated tests (new/modified and what they verify)
- Manual verification steps
- Edge cases considered

### 4.6 Reviewer Notes

- **Focus areas:** Specific files or sections needing careful review
- **Review order:** Suggested sequence for reviewing files in complex PRs
- **Key decisions:** Non-obvious design choices reviewers should understand
- **Alternatives considered:** Other approaches and why they were rejected

### 4.7 Visual Evidence (for UI changes)

Screenshots, GIFs, or videos for any change affecting the user interface. Before/after comparisons are strongly recommended.

> "For any PR that touches the user interface, screenshots aren't optional -- they're essential."
> -- [Make Your Pull Requests Visual for Front-End Changes](https://medium.com/statuscode/make-your-pull-requests-visual-for-front-end-changes-ef91d83d4fc2)

### 4.8 Deployment Notes

- Feature flags gating the change
- Database migrations required
- Configuration changes needed
- Rollback plan (how to revert if problems occur)
- Monitoring and alerting considerations
- Coordination required with other teams or services

### 4.9 Security Considerations

For changes touching authentication, authorization, data handling, or other security-sensitive areas:
- Security implications documented
- Input validation and sanitization verified
- Secrets and sensitive data handling reviewed

**Source:** [Crux Security: Using GitHub PR Templates for Security Checklists](https://www.cruxsecurity.ai/blog/tactics/using-github-pull-request-templates-and-checks-to-implement-security-checklists)

### 4.10 Performance Impact

For performance-related changes:
- Before/after benchmark data
- Methodology for measuring improvement
- Potential regressions in other areas

**Source:** [GitHub Action: Pull Request Benchmark](https://github.com/openpgpjs/github-action-pull-request-benchmark)

## 5. Changelog and Release Notes Integration

### 5.1 Structured PR Descriptions Enable Automation

Well-structured PR descriptions serve as input for automated changelog and release note generation. Tools like [Release Drafter](https://github.com/release-drafter/release-drafter), [github-changelog-generator](https://github.com/github-changelog-generator/github-changelog-generator), and GitHub's [automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) all rely on PR metadata.

### 5.2 Release Notes Section in PR Template

Adding a dedicated `## Release Notes` section in the PR template ensures engineers write user-facing descriptions while the feature is fresh, rather than having a single engineer handle it at release time.

**Source:** [Auto by Intuit: Automatic Release Notes Generation](https://medium.com/@calanoue/automatic-release-notes-generation-5dc68ff760fb)

### 5.3 Label-Based Categorization

PR labels (feature, bugfix, breaking, internal) enable tools to automatically categorize changes into appropriate changelog sections.

## 6. Academic Research Findings

### 6.1 Code Quality vs. PR Acceptance

A study of 28 Java open-source projects analyzing 4.7 million code quality issues in 36,000 pull requests found that **code quality did not significantly affect PR acceptance**. Factors like maintainer reputation and feature importance mattered more.

**Source:** [Does Code Quality Affect Pull Request Acceptance? An Empirical Study](https://arxiv.org/abs/1908.09321) (Lenarduzzi et al., 2019)

### 6.2 Characteristics of Useful Code Reviews (Microsoft)

A study of 1.5 million review comments at Microsoft found:
- The more files in a change, the lower the proportion of useful review comments
- Reviewer experience at the company (first year growth is steep, then plateaus) affects review usefulness
- Good descriptions motivate reviewers and lead to better feedback

**Source:** [Characteristics of Useful Code Reviews: An Empirical Study at Microsoft](https://www.microsoft.com/en-us/research/publication/characteristics-of-useful-code-reviews-an-empirical-study-at-microsoft/) (Bosu et al., 2015)

### 6.3 Expectations, Outcomes, and Challenges of Code Review

A Microsoft study of 165 managers and 873 programmers found:
- Code review is less about defects than expected -- it provides knowledge transfer, team awareness, and alternative solutions
- Reviewers highlighted the need for authors to explain the reason, background, and motivation for changes
- Good descriptions have a more significant impact on review quality than PR size alone

**Source:** [Expectations, Outcomes, and Challenges of Modern Code Review](https://www.microsoft.com/en-us/research/publication/expectations-outcomes-and-challenges-of-modern-code-review/) (Bacchelli & Bird, 2013)

### 6.4 Change Reviewability

An ACM study on what makes code changes easier to review found that change description quality, size, and organization were among the primary factors affecting reviewability.

**Source:** [What Makes a Code Change Easier to Review: An Empirical Investigation](https://dl.acm.org/doi/10.1145/3236024.3236080) (Baysal et al., 2018)

### 6.5 Pull Request Decision Factors

An analysis of 3.35 million pull requests across 11,230 GitHub projects found that a small number of factors explain PR decisions, with integrator identity being the most important factor.

**Source:** [Pull Request Decision Explained: An Empirical Overview](https://arxiv.org/pdf/2105.13970) (2021)

## 7. Common Anti-Patterns

### 7.1 Description Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **"Fix bug" / "Update code"** | No context, no searchability, no value to future readers | Use specific, descriptive titles |
| **Restating the diff** | Adds no information beyond what the diff shows | Explain WHY, not WHAT |
| **"Various improvements"** | Vague, unsearchable, multiple concerns mixed | One PR per concern, specific descriptions |
| **Suggesting future work** | Scope creep, distracts from current review | Keep focused on this PR's changes |
| **Missing breaking change callout** | Downstream consumers blindsided | Always explicitly address breaking changes |
| **No test plan** | Reviewers cannot verify correctness | Always include verification steps |

### 7.2 Process Anti-Patterns

| Anti-Pattern | Description | Source |
|---|---|---|
| **The Hoarder** | Working privately, delivering one massive PR | [Five PR Review Anti-patterns](https://albertofaci.medium.com/five-pull-request-review-anti-patterns-6ba73b2a4e1a) |
| **Rubber Stamp** | Approving without thorough review | Same source |
| **Merge Buddies** | Two developers auto-approving each other | Same source |
| **The Gatekeeper** | One person responsible for all reviews | Same source |
| **Judge Dredd** | Developer reviews and merges their own PR | Same source |

## 8. Feature Flag Integration

Feature flags reduce deployment risk by decoupling deployment from release. For PRs involving risky changes:
- Document which feature flag gates the change
- Note the flag's default state (enabled/disabled)
- Describe the rollback process (toggling the flag)
- List the criteria for fully enabling the feature

**Sources:**
- [GitHub Blog: Ship Code Faster and Safer with Feature Flags](https://github.blog/engineering/infrastructure/ship-code-faster-safer-feature-flags/)
- [Harness: Feature Flags as Part of Your Rollback Plan](https://www.harness.io/blog/are-feature-flags-a-part-of-your-rollback-plan)

## 9. Summary of Key Recommendations

1. **Explain WHY**, not WHAT -- the diff shows what changed
2. **Keep PRs small** -- 25-100 lines optimal, never exceed 400 without strong justification
3. **One concern per PR** -- apply the Single Responsibility Principle
4. **Structure descriptions** with consistent sections for scannability
5. **Address breaking changes explicitly** -- document with migration steps or state "None"
6. **Include a concrete test plan** -- automated and manual verification steps
7. **Guide reviewers** -- suggest review order, flag complex areas, explain non-obvious decisions
8. **Include visual evidence** for UI changes -- screenshots, GIFs, before/after comparisons
9. **Document deployment considerations** -- feature flags, migrations, rollback plans
10. **Write for future readers** -- PR descriptions are permanent historical records
11. **Note security implications** for changes touching auth, data handling, or sensitive code
12. **Include performance data** for optimization changes -- before/after benchmarks
13. **Enable changelog automation** -- structured descriptions feed release note generation
14. **Scale proportionally** -- small changes need brief descriptions, large ones need thorough docs

## 10. References

### Academic Sources
- Lenarduzzi, V., et al. (2019). [Does Code Quality Affect Pull Request Acceptance? An Empirical Study](https://arxiv.org/abs/1908.09321). Journal of Systems and Software.
- Bosu, A., et al. (2015). [Characteristics of Useful Code Reviews: An Empirical Study at Microsoft](https://www.microsoft.com/en-us/research/publication/characteristics-of-useful-code-reviews-an-empirical-study-at-microsoft/). IEEE/ACM MSR.
- Bacchelli, A. & Bird, C. (2013). [Expectations, Outcomes, and Challenges of Modern Code Review](https://www.microsoft.com/en-us/research/publication/expectations-outcomes-and-challenges-of-modern-code-review/). ICSE.
- Baysal, O., et al. (2018). [What Makes a Code Change Easier to Review](https://dl.acm.org/doi/10.1145/3236024.3236080). ACM ESEC/FSE.
- Nikkola, V. (2019). [Code Quality in Pull Requests, An Empirical Study](https://trepo.tuni.fi/bitstream/handle/10024/116502/NikkolaVili.pdf). Tampere University.

### Industry Practitioner Sources
- [Google Engineering Practices: Writing Good CL Descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html)
- [Microsoft Engineering Playbook: Pull Requests](https://microsoft.github.io/code-with-engineering-playbook/code-reviews/pull-requests/)
- [Shopify Engineering: Great Code Reviews](https://shopify.engineering/great-code-reviews)
- [Stripe: How Stripe Ships 1,145 PRs Per Day](https://blog.pullnotifier.com/blog/how-stripe-ships-1145-pull-requests-per-day)
- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Graphite: The Ideal PR is 50 Lines Long](https://graphite.com/blog/the-ideal-pr-is-50-lines-long)
- [Graphite: Best Practices Managing PR Size](https://graphite.com/guides/best-practices-managing-pr-size)
- [Atlassian: The Written Unwritten Guide to Pull Requests](https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests)
- [The Pragmatic Engineer: Pull Request Best Practices](https://blog.pragmaticengineer.com/pull-request-or-diff-best-practices/)
- [Codacy: Pull Request Best Practices](https://blog.codacy.com/pull-request-best-practices)
- [HackerOne: Writing A Great Pull Request Description](https://www.pullrequest.com/blog/writing-a-great-pull-request-description/)
- [Five Pull Request Review Anti-Patterns](https://albertofaci.medium.com/five-pull-request-review-anti-patterns-6ba73b2a4e1a)
- [Shopify Engineering: On the Importance of Pull Request Discipline](https://shopify.engineering/on-the-importance-of-pull-request-discipline)
