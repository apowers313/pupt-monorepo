---
title: Fix GitHub Actions
author: Adam Powers <apowers@ato.ms>
creationDate: 20250816
labels: []
---

Use the 'gh' tool to inspect our last GitHub Actions workflow run. For EVERY job that was run, scan the job results for errors. Create a list of EVERY error across ALL jobs. Work through the errors one at a time, identify the root cause, and make MINIMAL changes to fix the error.
