# Examples & Recipes

This section provides practical examples and recipes for common PUPT use cases. Each example includes the complete prompt file and usage instructions.

## Code Generation

### React Component Generator

Generate consistent React components with customizable features.

```markdown
---
title: React Component Generator
tags: [react, component, frontend]
variables:
  - name: componentName
    type: input
    message: "Component name:"
    validate: "^[A-Z][a-zA-Z0-9]*$"
    default: "MyComponent"
    
  - name: includeProps
    type: confirm
    message: "Include props interface?"
    default: true
    
  - name: includeTests
    type: confirm
    message: "Generate test file?"
    default: true
---

# Generate React Component: &lbrace;&lbrace;componentName&rbrace;&rbrace;

Create a new functional React component with the following specifications:

## Component: `&lbrace;&lbrace;componentName&rbrace;&rbrace;`

Create the component at: `src/components/&lbrace;&lbrace;componentName&rbrace;&rbrace;/&lbrace;&lbrace;componentName&rbrace;&rbrace;.tsx`

&lbrace;&lbrace;#if includeProps&rbrace;&rbrace;
Include a TypeScript interface for props with proper documentation.
&lbrace;&lbrace;/if&rbrace;&rbrace;

The component should:
- Use modern React patterns (hooks, functional components)
- Include proper error boundaries
- Be fully typed with TypeScript
- Export as default

&lbrace;&lbrace;#if includeTests&rbrace;&rbrace;
## Tests

Create a test file at: `src/components/&lbrace;&lbrace;componentName&rbrace;&rbrace;/&lbrace;&lbrace;componentName&rbrace;&rbrace;.test.tsx`

Include tests for:
- Component rendering
- Props handling
- User interactions
- Edge cases
&lbrace;&lbrace;/if&rbrace;&rbrace;
```

### API Client Generator

Generate type-safe API clients from specifications.

```markdown
---
title: TypeScript API Client
tags: [api, typescript, client]
variables:
  - name: serviceName
    type: input
    message: "Service name:"
    default: "APIClient"
    
  - name: baseUrl
    type: input
    message: "Base URL:"
    default: "https://api.example.com"
    
  - name: authType
    type: select
    message: "Authentication type:"
    choices: ["None", "API Key", "Bearer Token", "OAuth2"]
    
  - name: endpoints
    type: editor
    message: "List endpoints (one per line, format: METHOD /path):"
---

# Generate TypeScript API Client: &lbrace;&lbrace;serviceName&rbrace;&rbrace;

## Configuration
- Service: &lbrace;&lbrace;serviceName&rbrace;&rbrace;
- Base URL: &lbrace;&lbrace;baseUrl&rbrace;&rbrace;
- Authentication: &lbrace;&lbrace;authType&rbrace;&rbrace;

## Endpoints to implement:
&lbrace;&lbrace;endpoints&rbrace;&rbrace;

## Requirements

1. Create a fully typed TypeScript client
2. Include request/response interfaces
3. Implement proper error handling with custom error classes
4. Add retry logic with exponential backoff
5. Include request/response interceptors
6. Support cancellation via AbortController

&lbrace;&lbrace;#if (eq authType "API Key")&rbrace;&rbrace;
## API Key Authentication
- Accept API key in constructor
- Add to request headers: `X-API-Key: ${apiKey}`
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (eq authType "Bearer Token")&rbrace;&rbrace;
## Bearer Token Authentication
- Accept token in constructor or via method
- Add Authorization header: `Bearer ${token}`
- Include token refresh logic
&lbrace;&lbrace;/if&rbrace;&rbrace;

Generate clean, well-documented code following TypeScript best practices.
```

## Documentation

### README Generator

Create comprehensive README files for projects.

```markdown
---
title: README Generator
tags: [documentation, readme]
variables:
  - name: projectName
    type: input
    message: "Project name:"
    required: true
    
  - name: description
    type: input
    message: "Short description:"
    required: true
    
  - name: projectType
    type: select
    message: "Project type:"
    choices: ["Library", "Application", "CLI Tool", "API", "Other"]
    
  - name: badges
    type: multiselect
    message: "Include badges:"
    choices: ["Build Status", "Coverage", "NPM Version", "License", "Downloads"]
    
  - name: sections
    type: multiselect
    message: "Include sections:"
    choices: ["Installation", "Usage", "API", "Examples", "Contributing", "License"]
---

# Generate README for: &lbrace;&lbrace;projectName&rbrace;&rbrace;

Create a comprehensive README.md with the following:

## Project Information
- **Name**: &lbrace;&lbrace;projectName&rbrace;&rbrace;
- **Type**: &lbrace;&lbrace;projectType&rbrace;&rbrace;
- **Description**: &lbrace;&lbrace;description&rbrace;&rbrace;

## Badges to include:
&lbrace;&lbrace;badges&rbrace;&rbrace;

## Sections to include:
&lbrace;&lbrace;sections&rbrace;&rbrace;

## Requirements:

1. Use clear, concise language
2. Include code examples with syntax highlighting
3. Add a table of contents for easy navigation
4. Follow README best practices
5. Make it scannable with proper headings
6. Include relevant emoji for visual appeal (sparingly)

&lbrace;&lbrace;#if (includes sections "Installation")&rbrace;&rbrace;
### Installation Section
- Include multiple package managers (npm, yarn, pnpm)
- Add system requirements if applicable
- Include any setup steps
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes sections "API")&rbrace;&rbrace;
### API Documentation
- Document all public methods
- Include parameter types and return values
- Add usage examples for each method
&lbrace;&lbrace;/if&rbrace;&rbrace;

Generate a professional README that makes the project easy to understand and use.
```

### API Documentation

Generate comprehensive API documentation.

```markdown
---
title: API Documentation Generator
tags: [api, documentation]
variables:
  - name: apiName
    type: input
    message: "API name:"
    
  - name: version
    type: input
    message: "API version:"
    default: "v1"
    
  - name: format
    type: select
    message: "Documentation format:"
    choices: ["OpenAPI", "Markdown", "Postman Collection"]
    
  - name: includeExamples
    type: confirm
    message: "Include request/response examples?"
    default: true
---

# Generate API Documentation: &lbrace;&lbrace;apiName&rbrace;&rbrace; &lbrace;&lbrace;version&rbrace;&rbrace;

Create &lbrace;&lbrace;format&rbrace;&rbrace; documentation for the API with:

## API Overview
- Name: &lbrace;&lbrace;apiName&rbrace;&rbrace;
- Version: &lbrace;&lbrace;version&rbrace;&rbrace;
- Format: &lbrace;&lbrace;format&rbrace;&rbrace;

## Requirements:

1. Document all endpoints with:
   - HTTP method and path
   - Description and purpose
   - Request parameters (path, query, body)
   - Response format and status codes
   - Error responses

&lbrace;&lbrace;#if includeExamples&rbrace;&rbrace;
2. Include examples:
   - cURL commands
   - Request/response bodies
   - Common use cases
&lbrace;&lbrace;/if&rbrace;&rbrace;

3. Add authentication details
4. Include rate limiting information
5. Document versioning strategy

Make the documentation clear, complete, and easy to follow.
```

## Code Review

### Pull Request Review

Comprehensive pull request analysis.

```markdown
---
title: Pull Request Review
tags: [review, pr, git]
variables:
  - name: prUrl
    type: input
    message: "Pull request URL or description:"
    
  - name: focusAreas
    type: multiselect
    message: "Focus areas:"
    choices: ["Security", "Performance", "Code Style", "Testing", "Documentation", "Architecture"]
    
  - name: severity
    type: select
    message: "Review depth:"
    choices: ["Quick scan", "Standard review", "Deep dive"]
---

# Pull Request Review

## PR Information:
&lbrace;&lbrace;prUrl&rbrace;&rbrace;

## Review Focus Areas:
&lbrace;&lbrace;focusAreas&rbrace;&rbrace;

## Review Depth: &lbrace;&lbrace;severity&rbrace;&rbrace;

Please review this pull request and provide feedback on:

&lbrace;&lbrace;#if (includes focusAreas "Security")&rbrace;&rbrace;
### Security
- Check for potential vulnerabilities
- Review authentication/authorization
- Look for sensitive data exposure
- Verify input validation
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes focusAreas "Performance")&rbrace;&rbrace;
### Performance
- Identify potential bottlenecks
- Check for N+1 queries
- Review algorithm efficiency
- Memory usage concerns
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes focusAreas "Code Style")&rbrace;&rbrace;
### Code Style
- Consistency with project conventions
- Naming conventions
- Code organization
- Readability improvements
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes focusAreas "Testing")&rbrace;&rbrace;
### Testing
- Test coverage adequacy
- Edge case handling
- Test quality and maintainability
- Missing test scenarios
&lbrace;&lbrace;/if&rbrace;&rbrace;

Provide actionable feedback with specific examples and suggestions for improvement.
```

### Code Refactoring

Analyze code for refactoring opportunities.

```markdown
---
title: Code Refactoring Analysis
tags: [refactor, code-quality]
variables:
  - name: codeFile
    type: file
    message: "Select file to analyze:"
    filter: "*.{js,ts,jsx,tsx,py,java,go}"
    
  - name: targetMetrics
    type: multiselect
    message: "Target improvements:"
    choices: ["Readability", "Performance", "Maintainability", "Testability", "Type Safety"]
---

# Refactoring Analysis

## File: &lbrace;&lbrace;codeFile&rbrace;&rbrace;

## Target Improvements: &lbrace;&lbrace;targetMetrics&rbrace;&rbrace;

Analyze the code and suggest refactoring to improve:

&lbrace;&lbrace;#each targetMetrics&rbrace;&rbrace;
### &lbrace;&lbrace;this&rbrace;&rbrace;
&lbrace;&lbrace;#if (eq this "Readability")&rbrace;&rbrace;
- Simplify complex expressions
- Improve variable and function names
- Break down large functions
- Add helpful comments where needed
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;#if (eq this "Performance")&rbrace;&rbrace;
- Optimize algorithms
- Reduce unnecessary computations
- Improve data structure choices
- Minimize memory allocations
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;#if (eq this "Maintainability")&rbrace;&rbrace;
- Reduce coupling
- Improve cohesion
- Apply SOLID principles
- Extract reusable components
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;/each&rbrace;&rbrace;

Provide specific before/after code examples for each suggestion.
```

## Testing

### Test Case Generator

Generate comprehensive test cases.

```markdown
---
title: Test Case Generator
tags: [testing, qa]
variables:
  - name: testTarget
    type: input
    message: "What are you testing?"
    
  - name: testFramework
    type: select
    message: "Test framework:"
    choices: ["Jest", "Vitest", "Mocha", "Pytest", "JUnit"]
    
  - name: testTypes
    type: multiselect
    message: "Types of tests:"
    choices: ["Unit", "Integration", "E2E", "Performance", "Security"]
---

# Generate Test Cases

## Target: &lbrace;&lbrace;testTarget&rbrace;&rbrace;
## Framework: &lbrace;&lbrace;testFramework&rbrace;&rbrace;
## Test Types: &lbrace;&lbrace;testTypes&rbrace;&rbrace;

Generate comprehensive test cases covering:

&lbrace;&lbrace;#if (includes testTypes "Unit")&rbrace;&rbrace;
### Unit Tests
- Test individual functions/methods
- Mock dependencies
- Test edge cases
- Verify error handling
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes testTypes "Integration")&rbrace;&rbrace;
### Integration Tests
- Test component interactions
- Verify data flow
- Test with real dependencies
- Check system boundaries
&lbrace;&lbrace;/if&rbrace;&rbrace;

Include:
1. Test descriptions
2. Setup and teardown
3. Assertions
4. Edge cases
5. Error scenarios

Follow &lbrace;&lbrace;testFramework&rbrace;&rbrace; best practices and conventions.
```

## DevOps

### CI/CD Pipeline

Generate CI/CD pipeline configurations.

```markdown
---
title: CI/CD Pipeline Generator
tags: [devops, ci, cd]
variables:
  - name: platform
    type: select
    message: "CI/CD platform:"
    choices: ["GitHub Actions", "GitLab CI", "Jenkins", "CircleCI", "Travis CI"]
    
  - name: projectType
    type: select
    message: "Project type:"
    choices: ["Node.js", "Python", "Java", "Go", "Docker"]
    
  - name: deployTarget
    type: select
    message: "Deployment target:"
    choices: ["AWS", "Google Cloud", "Azure", "Heroku", "Self-hosted"]
    
  - name: stages
    type: multiselect
    message: "Pipeline stages:"
    choices: ["Lint", "Test", "Build", "Security Scan", "Deploy", "Notify"]
---

# Generate &lbrace;&lbrace;platform&rbrace;&rbrace; Pipeline

## Project: &lbrace;&lbrace;projectType&rbrace;&rbrace;
## Deploy to: &lbrace;&lbrace;deployTarget&rbrace;&rbrace;
## Stages: &lbrace;&lbrace;stages&rbrace;&rbrace;

Create a CI/CD pipeline configuration with:

&lbrace;&lbrace;#each stages&rbrace;&rbrace;
### &lbrace;&lbrace;this&rbrace;&rbrace; Stage
&lbrace;&lbrace;#if (eq this "Lint")&rbrace;&rbrace;
- Code style checking
- Static analysis
- Commit message validation
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;#if (eq this "Test")&rbrace;&rbrace;
- Unit tests
- Integration tests
- Coverage reporting
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;#if (eq this "Security Scan")&rbrace;&rbrace;
- Dependency vulnerability scan
- Code security analysis
- Secret detection
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;#if (eq this "Deploy")&rbrace;&rbrace;
- Environment-specific deployments
- Rollback capability
- Health checks
&lbrace;&lbrace;/if&rbrace;&rbrace;
&lbrace;&lbrace;/each&rbrace;&rbrace;

Include:
- Caching for dependencies
- Parallel job execution where possible
- Proper secret management
- Clear failure notifications
```

### Docker Configuration

Generate Docker configurations.

```markdown
---
title: Docker Setup Generator
tags: [docker, devops, containerization]
variables:
  - name: appType
    type: select
    message: "Application type:"
    choices: ["Node.js", "Python", "Java Spring", "Go", "Ruby on Rails"]
    
  - name: includeCompose
    type: confirm
    message: "Include docker-compose?"
    default: true
    
  - name: services
    type: multiselect
    message: "Additional services:"
    choices: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"]
---

# Generate Docker Configuration

## Application: &lbrace;&lbrace;appType&rbrace;&rbrace;
## Services: &lbrace;&lbrace;services&rbrace;&rbrace;

Create Docker configuration files:

## Dockerfile
- Multi-stage build for &lbrace;&lbrace;appType&rbrace;&rbrace;
- Security best practices (non-root user)
- Minimal final image size
- Proper layer caching

&lbrace;&lbrace;#if includeCompose&rbrace;&rbrace;
## docker-compose.yml
- Application service
&lbrace;&lbrace;#each services&rbrace;&rbrace;
- &lbrace;&lbrace;this&rbrace;&rbrace; service with proper configuration
&lbrace;&lbrace;/each&rbrace;&rbrace;
- Network isolation
- Volume management
- Environment variables
&lbrace;&lbrace;/if&rbrace;&rbrace;

Include:
- Health checks
- Logging configuration
- Resource limits
- Development vs production configs
```

## Workflow Automation

### Git Hooks

Automate development workflows with Git hooks.

```markdown
---
title: Git Hooks Setup
tags: [git, automation, hooks]
variables:
  - name: hooks
    type: multiselect
    message: "Select hooks to implement:"
    choices: ["pre-commit", "commit-msg", "pre-push", "post-merge"]
    
  - name: preCommitChecks
    type: multiselect
    message: "Pre-commit checks:"
    choices: ["Lint", "Format", "Tests", "Type Check", "Security Scan"]
---

# Setup Git Hooks

## Hooks to implement: &lbrace;&lbrace;hooks&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes hooks "pre-commit")&rbrace;&rbrace;
### pre-commit hook
Checks to run: &lbrace;&lbrace;preCommitChecks&rbrace;&rbrace;

- Prevent commits with failing checks
- Run only on changed files
- Provide clear error messages
- Allow bypass with --no-verify
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes hooks "commit-msg")&rbrace;&rbrace;
### commit-msg hook
- Validate commit message format
- Enforce conventional commits
- Check message length
- Add ticket numbers if needed
&lbrace;&lbrace;/if&rbrace;&rbrace;

&lbrace;&lbrace;#if (includes hooks "pre-push")&rbrace;&rbrace;
### pre-push hook
- Run full test suite
- Check for console.log/debugger
- Verify no sensitive data
- Ensure branch protection
&lbrace;&lbrace;/if&rbrace;&rbrace;

Create hook scripts that are:
- Fast and reliable
- Easy to understand
- Well documented
- Cross-platform compatible
```

## Best Practices

### Prompt Organization

1. **Use descriptive filenames**: `api-client-generator.md`, not `prompt1.md`
2. **Group by category**: Create subdirectories for different types
3. **Version your prompts**: Use git to track changes
4. **Share common patterns**: Extract reusable templates

### Variable Naming

```yaml
variables:
  # Good: Clear, specific names
  - name: componentName
  - name: includeTests
  - name: deploymentTarget
  
  # Avoid: Generic names
  - name: input1
  - name: option
  - name: thing
```

### Template Structure

1. **Start with context**: What you're generating and why
2. **Be specific**: Clear requirements and constraints
3. **Include examples**: Show desired output format
4. **Add validation**: Use regex patterns for inputs

### Sharing Prompts

Create a git repository for team prompts:

```bash
# Create prompts repository
mkdir team-prompts && cd team-prompts
git init

# Organize by category
mkdir -p {frontend,backend,devops,docs}

# Add README
echo "# Team Prompt Library" > README.md

# Share with team
git remote add origin git@github.com:team/prompts.git
git push -u origin main

# Team members install
pt install git@github.com:team/prompts.git
```

## Advanced Recipes

### Multi-Stage Prompts

Chain prompts together for complex workflows:

```bash
# Generate API spec
pt run -s "api spec" > api-spec.md

# Generate client from spec
pt run -s "api client" -f api-spec.md > client.ts

# Generate tests
pt run -s "api tests" -f client.ts > client.test.ts
```

### Conditional Templates

Use Handlebars conditions for dynamic content:

```handlebars
&lbrace;&lbrace;#if (eq environment "production")&rbrace;&rbrace;
  # Production Configuration
  - Enable monitoring
  - Set up alerts
  - Configure backups
&lbrace;&lbrace;else&rbrace;&rbrace;
  # Development Configuration
  - Enable debug mode
  - Use local services
  - Disable caching
&lbrace;&lbrace;/if&rbrace;&rbrace;
```

### Custom Validators

Add complex validation to variables:

```yaml
variables:
  - name: email
    type: input
    validate: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    
  - name: port
    type: input
    validate: "^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$"
    
  - name: version
    type: input
    validate: "^v?\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+)?$"
```

These examples demonstrate the flexibility and power of PUPT for various development workflows. Customize them for your specific needs and share your own recipes with the community!