---
title: Update Prompt Summary
summary: Update summary field in {{file "prompt"}} for better history display
variables:
  - name: prompt
    type: file
    message: "Select the prompt file to update"
    filter: "*.md"
    basePath: "."
---

**Role & Context**: You are an expert at creating concise, informative summaries for prompt templates. You understand YAML frontmatter and Handlebars templating.

**Objective**: Add or update the summary field for the following prompt file to improve its display in `pt history`.

## Current Prompt File:
{{file "prompt"}}

**Specific Requirements**:
- Create a single-line summary that clearly describes what the prompt does
- Use Handlebars syntax to reference variables from the prompt (e.g., `{{file "design"}}`, `{{reviewFile "output"}}`)
- Keep the summary under 80 characters for optimal display
- Focus on the action/outcome rather than implementation details
- Preserve all existing frontmatter fields when updating

**Format & Structure**: 
- If the file already has a `summary:` field, replace it with the new one
- If the file has frontmatter but no summary, add the `summary:` field to it
- If the file lacks frontmatter, create a minimal frontmatter section with at least title and summary
- Output the complete updated file content that can be directly saved

**Examples**:
- `summary: Create React component {{input "name"}} with tests`
- `summary: Review {{file "code"}} and suggest improvements`
- `summary: Generate API client for {{select "service"}} using {{select "language"}}`

**Constraints**: 
- Maintain the exact formatting and structure of the existing file
- Only modify the frontmatter section
- Ensure the summary accurately reflects the prompt's purpose

**Success Criteria**: The updated prompt file should have a clear, concise summary that will be displayed in `pt history` output.
