---
title: Code Review
author: Adam Powers <apowers@ato.ms>
creationDate: 20250815
labels: []
---

Please perform a comprehensive code review of our project. My primary concerns for the code review are:
{{editor "codeReviewConcerns"}}

In addition, look for common problems with LLM-generated code including:
  - Repeated implementations of similar functionality
  - Inconsistent patterns across files
  - Not using shared utilities when appropriate
  - Verbose implementations instead of concise ones
  - Reinventing the wheel
  - Inconsistent error handling
  - Copy-paste style code with slight variations
  - Not following DRY principles

Please create a scratchpad of every file in the project, and review each file one at a time until you have reviewed EVERY FILE. Be meticulous and comprehensive. Think harder. Review the file for my concerns and identify if the file has any issues that need to be remediated. Store the remediations for each file in a scratchpad. 

After you have reviewed each file, look at common themes for the remediations and group together any common remediations into themes. Write the themes and remediations to {{input "codeReviewFile"}}. The file should be grouped into priorities of which issues are "critical", "high", "medium", and "low". Ensure each issue has sufficient description of what the problem is, thoughts on how to remediate it, and pointers to any source files that need to be remediated. Make sure the code review is easy for a human to read, but has enough detail for AI tooling to create a plan for remediating the problems.
