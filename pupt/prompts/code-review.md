---
title: Code Review
author: Adam Powers <apowers@ato.ms>
creationDate: 20250815
labels: []
---

Please perform a comprehensive code review of our project. My primary concerns for the code review are:
{{editor "codeReviewConcerns"}}

Please create a scratchpad of every project in the file, and review each file one at a time. Review the file for my concerns and identify if the file has any issues that need to be remediated. Store the remediations for each file in a scratchpad. After you have reviewed each file, look at common themes for the remediations and group together any common remediations into themes. Write the themes and remediations to {{input "codeReviewFile"}}. The file should be grouped into priorities of which issues are "critical", "high", "medium", and "low". Ensure each issue has sufficient description of what the problem is, thoughts on how to remediate it, and pointers to any source files that need to be remediated. Make sure the code review is easy for a human to read, but has enough detail for AI tooling to create a plan for remediating the problems. Think harder.
