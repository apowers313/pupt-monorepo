# Implementation Notes

[← Back to Index](00-index.md) | [Previous: Configuration](12-configuration.md) | [Next: Future Work](14-future-work.md)

---

## Priority Order

Based on research frequency and production importance:

### Phase 1: Core Foundation

| Priority | Component | Description |
|----------|-----------|-------------|
| 1 | **Core JSX Runtime** | Must work first for everything else |
| 2 | **Render Function** | Core text generation |
| 3 | **Environment Context** | LLM/output configuration |
| 4 | **Babel Transformer** | Runtime JSX compilation |
| 5 | **Component Registry** | Component registration and lookup |
| 6 | **Prompt Component** | Top-level prompt container |
| 7 | **Core Structural Components** | Role, Task, Context, Format, Constraint, Section |
| 8 | **Ask.* Components** | Text, Editor, Select, MultiSelect, Confirm, File, Number |

### Phase 2: Enhanced Components & Services

| Priority | Component | Description |
|----------|-----------|-------------|
| 9 | **InputIterator Service** | Depth-first input collection |
| 10 | **Additional Structural** | Audience, Tone, SuccessCriteria |
| 11 | **Example Components** | Example, Examples |
| 12 | **Reasoning Components** | Steps, Step |
| 13 | **Data Components** | Data, Code, File |
| 14 | **Control Components** | If, ForEach |

### Phase 3: Discovery & Ecosystem

| Priority | Component | Description |
|----------|-----------|-------------|
| 15 | **LibraryLoader Service** | Third-party library loading |
| 16 | **SearchEngine Service** | Fuzzy prompt search |

---

## Component Research Basis

| Component | Research Source | Usage/Importance |
|-----------|-----------------|------------------|
| Directive/Task | arXiv Templates | 86.7% usage |
| Context | arXiv Templates | 56.2% usage |
| Output Format | arXiv Templates | 39.7% usage |
| Constraints | arXiv Templates | 35.7% usage |
| Role/Persona | arXiv Templates | 28.4% usage |
| Steps/Workflow | arXiv Templates | 27.5% usage |
| Examples | arXiv Templates | 19.9% usage |
| Audience | CO-STAR, RISEN | Framework standard |
| Tone | CO-STAR, CRISPE | Framework standard |

---

## Testing Strategy

### Unit Tests

- Each component's render output
- JSX runtime functions (`jsx`, `jsxs`, `Fragment`)
- Environment-based output variations (XML vs markdown)
- InputIterator depth-first traversal order
- Conditional input handling
- ComponentRegistry inheritance and scoping
- SearchEngine fuzzy matching and filtering

### Integration Tests

- Full prompt rendering
- Third-party library loading
- Input collection workflows

### Test Fixtures

```
test/fixtures/
├── prompts/
│   ├── simple.tsx
│   ├── with-inputs.tsx
│   ├── conditional.tsx
│   └── complex.tsx
└── libraries/
    └── test-lib/
        ├── package.json
        └── src/
            └── index.ts
```

### Coverage Thresholds

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
}
```

---

## Scaffolding Tools

### Build & Development

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | ^5.7.x | Type-safe JavaScript |
| Vite | ^6.x | Build tool and dev server |
| tsx | ^4.x | TypeScript execution for development |

### Testing

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | ^2.x | Test framework |
| @vitest/coverage-v8 | ^2.x | Code coverage provider |

### Linting & Code Quality

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | ^9.x | Code linting (flat config) |
| typescript-eslint | ^8.x | TypeScript ESLint support |
| @stylistic/eslint-plugin | ^2.x | Code style enforcement |
| Knip | ^5.x | Unused dependency detection |

### Git Hooks & Commits

| Tool | Version | Purpose |
|------|---------|---------|
| Husky | ^9.x | Git hooks manager |
| Commitlint | ^20.x | Commit message linting |
| Commitizen | ^4.x | Interactive commit CLI |

### Release & CI/CD

| Tool | Version | Purpose |
|------|---------|---------|
| semantic-release | ^25.x | Automated versioning and releases |
| GitHub Actions | - | CI/CD workflows |

---

## Documentation

### JSDoc Comments

All public APIs should have JSDoc comments:

```typescript
/**
 * Render a PuptElement tree to text.
 *
 * @param element - The JSX element tree to render
 * @param options - Render options including inputs and environment
 * @returns The rendered text and any post-execution actions
 *
 * @example
 * ```typescript
 * const result = render(element, {
 *   inputs: { name: 'Alice' },
 *   env: createEnvironment('claude'),
 * });
 * console.log(result.text);
 * ```
 */
export function render(
  element: PuptElement,
  options?: RenderOptions
): RenderResult;
```

### README Structure

1. Quick start guide
2. Installation
3. Basic usage
4. Component reference
5. Creating custom components
6. Third-party libraries
7. API reference

### Additional Guides

- Creating third-party libraries
- Publishing prompts
- Environment configuration
- Input validation

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start development (watch mode)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix lint errors
npm run lint:fix

# Check for unused dependencies
npm run knip

# Build for production
npm run build
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(components): add Audience component
fix(render): handle null children correctly
docs(readme): add installation instructions
test(input): add validation tests
refactor(jsx-runtime): simplify element creation
chore(deps): update typescript to 5.7.0
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Run `npm run lint && npm test`
4. Commit with conventional message
5. Push and create PR
6. CI runs automatically
7. Review and merge

---

## Next Steps

- [Future Work](14-future-work.md) - Planned features
- [Configuration](12-configuration.md) - Project setup details
- [Architecture](03-architecture.md) - System design
