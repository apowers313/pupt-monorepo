# Prompt Templates

PUPT uses Handlebars templating to create dynamic, interactive prompts. This guide will show you how to use templates effectively, starting with the most common features.

## Quick Start: User Input

The most powerful feature of PUPT is collecting user input directly within your prompts. Here's how to get started:

### Basic Input

Use `{{input}}` to collect text from users:

```handlebars
Project name: {{input "projectName" "What's your project name?"}}
Description: {{input "description" "Brief description:"}}
```

When run, this will:
1. Ask "What's your project name?"
2. Store the answer as `projectName`
3. Ask "Brief description:"
4. Store the answer as `description`

### Different Input Types

PUPT provides several input helpers for different scenarios:

```handlebars
# Project Setup

Name: {{input "name" "Project name:"}}
Type: {{select "type" "Project type:"}}
Features: {{multiselect "features" "Select features:"}}
Include tests? {{confirm "tests" "Add unit tests?"}}

## Requirements
{{editor "requirements" "Enter detailed requirements:"}}

Config file: {{file "config" "Select configuration file:"}}
API Key: {{password "apiKey" "Enter your API key:"}}
```

Each helper is designed for specific use cases:
- `{{input}}` - Single-line text
- `{{select}}` - Choose one option
- `{{multiselect}}` - Choose multiple options
- `{{confirm}}` - Yes/no questions
- `{{editor}}` - Multi-line text (opens your editor)
- `{{file}}` - File selection with tab completion
- `{{password}}` - Hidden input for sensitive data

## Using Variables

Once you collect input, you can reuse it throughout your prompt:

```handlebars
Project: {{input "project" "Project name:"}}

I'll help you set up {{project}}. 

First, let's configure {{project}}'s dependencies...
Later, we'll test {{project}} to ensure everything works.
```

The variable `project` is asked once and reused multiple times.

## Adding Metadata with Frontmatter

Frontmatter lets you add metadata and configure your prompts. It goes at the top of your file between `---` markers:

```markdown
---
title: My Awesome Prompt
labels: [development, automation]
---

Your prompt content here...
```

### Common Frontmatter Fields

```yaml
---
title: Feature Request Template    # Display name
labels: [feature, planning]       # Tags for searching
summary: Create feature request for {{input "feature"}}  # Shows in history
---
```

## Pre-defining Input Options

For `select` and `multiselect` inputs, you can define choices in frontmatter:

```markdown
---
title: Create Component
variables:
  - name: framework
    type: select
    message: "Choose framework:"
    choices: ["React", "Vue", "Angular", "Svelte"]
    default: "React"
    
  - name: features
    type: multiselect  
    message: "Include features:"
    choices: ["TypeScript", "Tests", "Storybook", "CSS Modules"]
---

Create a {{framework}} component with: {{features}}
```

## System Information Helpers

PUPT provides helpers for common system information:

```handlebars
Created by {{username}} on {{date}}
Working directory: {{cwd}}
System: {{platform}} ({{arch}})
Timestamp: {{timestamp}}
```

These are evaluated when the prompt runs.

## Conditional Content

Use Handlebars conditionals to show content based on user choices:

```handlebars
{{#if (confirm "includeTests" "Include unit tests?")}}
## Testing Requirements
- Write comprehensive unit tests
- Achieve 80% code coverage
- Include edge cases
{{/if}}
```

## File Selection and Review

The `{{file}}` helper provides interactive file selection:

```handlebars
Source file: {{file "source" "Select file to analyze:"}}
```

For files you want to review after generation, use `{{reviewFile}}`:

```handlebars
Output: {{reviewFile "output" "Where to save the generated code?"}}
```

PUPT will automatically open files marked with `reviewFile` after the prompt executes.

## Best Practices

### 1. Start Simple
Begin with basic `{{input}}` helpers and gradually add more features.

### 2. Use Clear Variable Names
```handlebars
Good: {{input "componentName" "Component name:"}}
Bad:  {{input "cn" "Name:"}}
```

### 3. Provide Helpful Prompts
```handlebars
{{input "port" "Server port (default: 3000):"}}
```

### 4. Group Related Inputs
Collect related information together for better user experience.

### 5. Use Defaults When Appropriate
In frontmatter:
```yaml
variables:
  - name: language
    type: select
    choices: ["JavaScript", "TypeScript", "Python"]
    default: "TypeScript"
```

## Complete Example

Here's a practical example combining these features:

```markdown
---
title: API Endpoint Generator
labels: [api, backend]
variables:
  - name: method
    type: select
    message: "HTTP Method:"
    choices: ["GET", "POST", "PUT", "DELETE"]
    default: "GET"
    
  - name: auth
    type: confirm
    message: "Require authentication?"
    default: true
---

# Generate {{method}} Endpoint

Endpoint path: {{input "path" "API path (e.g., /users/:id):"}}
Description: {{input "description" "What does this endpoint do?"}}

{{#if auth}}
This endpoint requires authentication.
Token type: {{select "tokenType" "Authentication type:"}}
{{/if}}

## Implementation Details

{{editor "details" "Describe the endpoint logic:"}}

---
Generated on {{date}} by {{username}}
```

## Advanced Variables (Frontmatter)

For complex scenarios, you can define detailed variable configurations in frontmatter:

```yaml
---
variables:
  - name: componentName
    type: input
    message: "Component name:"
    validate: "^[A-Z][a-zA-Z0-9]*$"  # Regex validation
    required: true
    
  - name: configFile
    type: file
    message: "Configuration file:"
    basePath: "./config"             # Start directory
    filter: "*.{json,yaml}"          # File patterns
    
  - name: description
    type: editor
    multiline: true                  # Enable multiline mode
---
```

This advanced configuration is optional - start with inline helpers and add frontmatter variables when you need more control.