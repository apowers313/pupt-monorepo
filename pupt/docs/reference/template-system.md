# Template System

PUPT uses Handlebars as its template engine, enhanced with custom helpers for collecting user input and accessing system information. This powerful combination enables you to create dynamic, reusable prompt templates.

## Prompt File Structure

A prompt file consists of two main parts:

1. **Frontmatter** (optional): YAML metadata between `---` markers
2. **Template Content**: Markdown with Handlebars expressions

```markdown
---
title: Example Prompt
tags: [example, demo]
variables:
  - name: projectName
    type: input
    message: "What's your project name?"
    default: "my-project"
---

# Project: &lbrace;&lbrace;projectName&rbrace;&rbrace;

Your template content here...
```

## Frontmatter Reference

### `title`
- **Type**: `string`
- **Description**: Display name for the prompt
- **Default**: Filename without extension

### `tags`
- **Type**: `string[]`
- **Description**: Tags for categorization and search
- **Default**: `[]`

### `variables`
- **Type**: `object[]`
- **Description**: Pre-defined variables with validation
- **Properties**:
  - `name` (required): Variable identifier
  - `type`: Input type (see Input Helpers)
  - `message`: Prompt message
  - `default`: Default value
  - `choices`: Options for select/multiselect
  - `validate`: Regex pattern for validation
  - `required`: Whether input is required
  - `basePath`: Base directory for file inputs
  - `filter`: File pattern filter
  - `multiline`: Enable multiline for input type

### Example with All Properties

```yaml
---
title: Advanced Example
tags: [advanced, complete]
variables:
  - name: componentName
    type: input
    message: "Component name:"
    default: "MyComponent"
    validate: "^[A-Z][a-zA-Z0-9]*$"
    required: true
    
  - name: framework
    type: select
    message: "Choose framework:"
    choices: ["React", "Vue", "Angular", "Svelte"]
    default: "React"
    
  - name: features
    type: multiselect
    message: "Select features:"
    choices: ["TypeScript", "Testing", "Storybook", "CSS Modules"]
    
  - name: description
    type: editor
    message: "Component description:"
    multiline: true
    
  - name: configFile
    type: file
    message: "Configuration file:"
    basePath: "./"
    filter: "*.{json,yaml,yml}"
---
```

## Input Helpers

Input helpers are Handlebars helpers that collect information from users interactively. They can be used inline in templates or pre-defined in frontmatter.

### `&lbrace;&lbrace;input&rbrace;&rbrace;`

Collect single-line text input.

```handlebars
&lbrace;&lbrace;input "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Options via frontmatter:**
- `default`: Default value
- `validate`: Regex pattern for validation
- `required`: Make input mandatory

**Example:**
```handlebars
Project name: &lbrace;&lbrace;input "projectName" "What's your project name?"&rbrace;&rbrace;
Description: &lbrace;&lbrace;input "description"&rbrace;&rbrace;
```

### `&lbrace;&lbrace;select&rbrace;&rbrace;`

Present a single-choice selection.

```handlebars
&lbrace;&lbrace;select "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Options via frontmatter:**
- `choices`: Array of options (required)
- `default`: Default selection

**Example:**
```yaml
variables:
  - name: language
    type: select
    message: "Programming language:"
    choices: ["JavaScript", "TypeScript", "Python", "Go"]
    default: "TypeScript"
```

### `&lbrace;&lbrace;multiselect&rbrace;&rbrace;`

Allow multiple selections from a list.

```handlebars
&lbrace;&lbrace;multiselect "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Returns**: Comma-separated string of selections

**Example:**
```handlebars
Features to include: &lbrace;&lbrace;multiselect "features" "Select features:"&rbrace;&rbrace;
```

### `&lbrace;&lbrace;confirm&rbrace;&rbrace;`

Ask a yes/no question.

```handlebars
&lbrace;&lbrace;confirm "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Returns**: `"true"` or `"false"`

**Example:**
```handlebars
&lbrace;&lbrace;#if (confirm "includeTests" "Include unit tests?")&rbrace;&rbrace;
Generate comprehensive unit tests...
&lbrace;&lbrace;/if&rbrace;&rbrace;
```

### `&lbrace;&lbrace;editor&rbrace;&rbrace;`

Open the system editor for multi-line input.

```handlebars
&lbrace;&lbrace;editor "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Features:**
- Opens default editor ($EDITOR or $VISUAL)
- Supports multi-line content
- Preserves formatting

**Example:**
```handlebars
## Detailed Requirements

&lbrace;&lbrace;editor "requirements" "Enter detailed requirements:"&rbrace;&rbrace;
```

### `&lbrace;&lbrace;password&rbrace;&rbrace;`

Collect sensitive input with masked display.

```handlebars
&lbrace;&lbrace;password "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Features:**
- Input is masked during entry
- Values are masked in history
- Not shown in debug output

**Example:**
```handlebars
API_KEY=&lbrace;&lbrace;password "apiKey" "Enter your API key:"&rbrace;&rbrace;
```

### `&lbrace;&lbrace;file&rbrace;&rbrace;`

Interactive file path selection with tab completion.

```handlebars
&lbrace;&lbrace;file "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Options via frontmatter:**
- `basePath`: Starting directory
- `filter`: File pattern (glob)

**Features:**
- Tab completion
- Home directory expansion (~)
- Real-time filtering

**Example:**
```yaml
variables:
  - name: sourceFile
    type: file
    message: "Select source file:"
    basePath: "./src"
    filter: "*.{js,ts}"
```

### `&lbrace;&lbrace;reviewFile&rbrace;&rbrace;`

Select a file for automatic review after execution.

```handlebars
&lbrace;&lbrace;reviewFile "variableName" "Optional prompt message"&rbrace;&rbrace;
```

**Features:**
- Same as `&lbrace;&lbrace;file&rbrace;&rbrace;` helper
- File is automatically reviewed post-execution
- Useful for analyzing generated outputs

**Example:**
```handlebars
Output file: &lbrace;&lbrace;reviewFile "output" "File to review after generation:"&rbrace;&rbrace;
```

## Static Helpers

Static helpers provide system information and utilities. They're evaluated when the template is processed.

### Date and Time

- `&lbrace;&lbrace;date&rbrace;&rbrace;` - Current date (e.g., "12/25/2024")
- `&lbrace;&lbrace;time&rbrace;&rbrace;` - Current time (e.g., "2:30:45 PM")
- `&lbrace;&lbrace;datetime&rbrace;&rbrace;` - Date and time combined
- `&lbrace;&lbrace;timestamp&rbrace;&rbrace;` - Unix timestamp in milliseconds
- `&lbrace;&lbrace;isoDate&rbrace;&rbrace;` - ISO 8601 date format

### System Information

- `&lbrace;&lbrace;username&rbrace;&rbrace;` - Current system username
- `&lbrace;&lbrace;hostname&rbrace;&rbrace;` - Machine hostname
- `&lbrace;&lbrace;cwd&rbrace;&rbrace;` - Current working directory
- `&lbrace;&lbrace;platform&rbrace;&rbrace;` - Operating system platform
- `&lbrace;&lbrace;arch&rbrace;&rbrace;` - System architecture

### Utilities

- `&lbrace;&lbrace;uuid&rbrace;&rbrace;` - Generate a UUID v4
- `&lbrace;&lbrace;random min max&rbrace;&rbrace;` - Random number in range
- `&lbrace;&lbrace;env "VARIABLE"&rbrace;&rbrace;` - Environment variable value

**Examples:**
```handlebars
Generated by &lbrace;&lbrace;username&rbrace;&rbrace; on &lbrace;&lbrace;hostname&rbrace;&rbrace;
Date: &lbrace;&lbrace;isoDate&rbrace;&rbrace;
Request ID: &lbrace;&lbrace;uuid&rbrace;&rbrace;
Port: &lbrace;&lbrace;random 3000 9999&rbrace;&rbrace;
Home: &lbrace;&lbrace;env "HOME"&rbrace;&rbrace;
```

## Conditional Logic

Use Handlebars built-in helpers for conditional rendering:

### `&lbrace;&lbrace;#if&rbrace;&rbrace;`

```handlebars
&lbrace;&lbrace;#if includeDocumentation&rbrace;&rbrace;
## Documentation

Please include comprehensive documentation...
&lbrace;&lbrace;/if&rbrace;&rbrace;
```

### `&lbrace;&lbrace;#unless&rbrace;&rbrace;`

```handlebars
&lbrace;&lbrace;#unless skipTests&rbrace;&rbrace;
Include unit tests for all functions.
&lbrace;&lbrace;/unless&rbrace;&rbrace;
```

### `&lbrace;&lbrace;#each&rbrace;&rbrace;`

```handlebars
&lbrace;&lbrace;#each selectedFeatures&rbrace;&rbrace;
- Implement &lbrace;&lbrace;this&rbrace;&rbrace; support
&lbrace;&lbrace;/each&rbrace;&rbrace;
```

## Advanced Features

### Variable Caching

Variables are cached after first use:

```handlebars
Project: &lbrace;&lbrace;input "project"&rbrace;&rbrace;
...
// Later in the same template
Working on &lbrace;&lbrace;project&rbrace;&rbrace; // Uses cached value
```

### Custom Helpers

Register custom helpers via configuration:

```javascript
// In .pt-config.js
module.exports = {
  helpers: {
    uppercase: {
      type: 'inline',
      value: '&lbrace;&lbrace;uppercase text&rbrace;&rbrace;'
    }
  }
}
```

```javascript
// helpers/custom.js
export default function(handlebars) {
  handlebars.registerHelper('uppercase', (text) => {
    return text.toUpperCase();
  });
}
```

### Partials

Define reusable template fragments:

```json
{
  "helpers": {
    "header": {
      "type": "file",
      "path": "./partials/header.md"
    }
  }
}
```

Usage:
```handlebars
&lbrace;&lbrace;> header&rbrace;&rbrace;

Your content here...
```

### Escaping

To output literal Handlebars syntax:

```handlebars
&lbrace;&lbrace;escaped&rbrace;&rbrace;     → &lbrace;&lbrace;escaped&rbrace;&rbrace;
&lbrace;&lbrace;&lbrace;&lbrace;raw&rbrace;&rbrace;&rbrace;&rbrace;      → Start raw block
  &lbrace;&lbrace;literal&rbrace;&rbrace;    → &lbrace;&lbrace;literal&rbrace;&rbrace;
&lbrace;&lbrace;&lbrace;&lbrace;/raw&rbrace;&rbrace;&rbrace;&rbrace;     → End raw block
```

## Best Practices

1. **Use Frontmatter Variables**: Define variables upfront for better documentation
2. **Provide Defaults**: Always include sensible defaults
3. **Validate Input**: Use regex patterns to ensure valid input
4. **Group Related Inputs**: Collect related information together
5. **Use Descriptive Names**: Make variable names self-documenting
6. **Add Comments**: Document complex template logic

## Complete Example

```markdown
---
title: React Component Generator
tags: [react, component, generator]
variables:
  - name: componentName
    type: input
    message: "Component name:"
    validate: "^[A-Z][a-zA-Z0-9]*$"
    default: "MyComponent"
    
  - name: componentType
    type: select
    message: "Component type:"
    choices: ["Functional", "Class"]
    default: "Functional"
    
  - name: features
    type: multiselect
    message: "Include features:"
    choices: ["PropTypes", "State", "Hooks", "Tests", "Storybook"]
    
  - name: styleFile
    type: file
    message: "Style file to import:"
    basePath: "./src/styles"
    filter: "*.{css,scss,less}"
---

# Generate React Component: &lbrace;&lbrace;componentName&rbrace;&rbrace;

Create a new &lbrace;&lbrace;componentType&rbrace;&rbrace; React component with the following specifications:

## Component Details
- **Name**: &lbrace;&lbrace;componentName&rbrace;&rbrace;
- **Type**: &lbrace;&lbrace;componentType&rbrace;&rbrace; Component
- **Features**: &lbrace;&lbrace;features&rbrace;&rbrace;
- **Style Import**: &lbrace;&lbrace;styleFile&rbrace;&rbrace;

## Requirements

1. Create the component file at `src/components/&lbrace;&lbrace;componentName&rbrace;&rbrace;/&lbrace;&lbrace;componentName&rbrace;&rbrace;.jsx`
2. Follow React best practices and conventions
3. Include proper error boundaries

&lbrace;&lbrace;#if (includes features "PropTypes")&rbrace;&rbrace;
## PropTypes
Define comprehensive PropTypes for all props with appropriate validations.
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes features "Tests")&rbrace;&rbrace;
## Testing
Create unit tests using Jest and React Testing Library:
- Test all props variations
- Test user interactions
- Achieve >90% coverage
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes features "Storybook")&rbrace;&rbrace;
## Storybook Stories
Create stories showcasing:
- Default state
- All prop variations
- Edge cases
- Interactive examples
&lbrace;&lbrace;/if&rbrace;&rbrace;

---
Generated by &lbrace;&lbrace;username&rbrace;&rbrace; on &lbrace;&lbrace;date&rbrace;&rbrace; at &lbrace;&lbrace;time&rbrace;&rbrace;
```

This example demonstrates:
- Variable definition with validation
- Conditional sections based on user input
- System information integration
- Clear structure and requirements