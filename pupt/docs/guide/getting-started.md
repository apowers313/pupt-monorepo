# Getting Started

Welcome to PUPT (Powerful Universal Prompt Tool) - your faithful prompt companion for managing and using AI prompts with advanced templating capabilities.

## What is PUPT?

PUPT is a command-line tool designed to streamline your AI workflow by:
- Managing a library of reusable prompt templates
- Collecting user input dynamically through interactive prompts
- Integrating seamlessly with AI tools like Claude Code, Kiro, and others
- Tracking prompt history and analyzing usage patterns
- Sharing prompts across teams and projects

## Installation

Install PUPT globally using npm:

```bash
npm install -g pupt
```

Or with yarn:

```bash
yarn global add pupt
```

After installation, the `pt` command will be available globally.

## Quick Start

### 1. Initialize Your Configuration

Start by running the initialization command:

```bash
pt init
```

This interactive setup will help you configure:
- **Prompt directories**: Where to store your prompt files
- **History tracking**: Save executed prompts for future reference
- **Annotation support**: Add notes and tags to your executions
- **Default tool**: Your preferred AI tool (Claude, GPT, etc.)

### 2. Create Your First Prompt

Create a new prompt interactively:

```bash
pt add
```

This will:
1. Ask for a filename (e.g., `code-review.md`)
2. Collect metadata (title, description, tags)
3. Open your default editor to write the prompt content

Here's a simple example prompt:

```markdown
---
title: Code Review Assistant
tags: [code, review, analysis]
---

Please review the following code and provide feedback on:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Suggestions for improvement

&#123;&#123;input "code" "Paste the code to review:"&#125;&#125;
```

### 3. Use Your Prompt

Run PUPT without arguments to see the interactive prompt selector:

```bash
pt
```

This will:
1. Show a searchable list of all your prompts
2. Let you preview prompt content
3. Collect any required inputs
4. Display the generated prompt

### 4. Execute with Your AI Tool

To send the prompt directly to your configured AI tool:

```bash
pt run
```

Or specify a different tool:

```bash
pt run claude
pt run gpt
pt run code -
```

## Understanding Prompt Files

Prompt files are Markdown files with optional YAML frontmatter. They live in your configured prompt directories and can contain:

### Basic Structure

```markdown
---
title: My Prompt Template
tags: [category, subcategory]
---

Your prompt content here with &#123;&#123;variables&#125;&#125; and &#123;&#123;input "helpers"&#125;&#125;.
```

### Interactive Inputs

PUPT provides several helpers to collect user input:

- `&#123;&#123;input "name"&rbrace;&rbrace;` - Text input
- `&#123;&#123;select "name"&rbrace;&rbrace;` - Single choice selection
- `&#123;&#123;multiselect "name"&rbrace;&rbrace;` - Multiple choice selection
- `&#123;&#123;confirm "name"&rbrace;&rbrace;` - Yes/no question
- `&#123;&#123;editor "name"&rbrace;&rbrace;` - Multi-line text in editor
- `&#123;&#123;file "name"&rbrace;&rbrace;` - File path with tab completion
- `&#123;&#123;password "name"&rbrace;&rbrace;` - Masked password input

### System Variables

Access system information in your prompts:

- `&#123;&#123;date&rbrace;&rbrace;` - Current date
- `&#123;&#123;time&rbrace;&rbrace;` - Current time
- `&#123;&#123;username&rbrace;&rbrace;` - System username
- `&#123;&#123;cwd&rbrace;&rbrace;` - Current working directory
- `&#123;&#123;uuid&rbrace;&rbrace;` - Generate a unique ID

## Next Steps

Now that you have PUPT installed and configured:

1. **Explore Commands**: Learn about all available [commands](/commands/)
2. **Master Templates**: Dive deep into the [template system](/reference/template-system)
3. **Configure PUPT**: Customize your [configuration](/guide/configuration)
4. **Browse Examples**: Check out [recipes and examples](/examples/)

## Getting Help

- Run `pt help` for general help
- Run `pt help <command>` for command-specific help
- Visit our [GitHub repository](https://github.com/apowers313/pupt) for issues and discussions

Welcome to the PUPT community! 🐾