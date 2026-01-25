# Workflows

[← Back to Index](00-index.md) | [Previous: Simple Prompt Format](09-simple-prompt-format.md) | [Next: Search](11-search.md)

---

## Module Author Workflow

How to create and publish a component library.

### 1. Project Structure

```
my-components/
├── package.json
├── src/
│   ├── index.ts          # exports all components
│   ├── AcmeHeader.tsx
│   └── CustomerContext.tsx
└── dist/
    └── index.js          # built output
```

### 2. package.json

```json
{
  "name": "@acme/components",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  },
  "pupt": {
    "capabilities": ["network"]
  }
}
```

The `pupt.capabilities` field declares what the components need:
- `network` - Makes HTTP requests
- `filesystem` - Reads/writes files (CLI only)

### 3. Component Implementation

```typescript
// src/index.ts
export { AcmeHeader } from './AcmeHeader';
export { CustomerContext } from './CustomerContext';
```

```typescript
// src/AcmeHeader.tsx
import { Component, RenderContext } from 'pupt-lib';

interface AcmeHeaderProps {
  title?: string;
}

export class AcmeHeader extends Component<AcmeHeaderProps> {
  render({ title = 'ACME Corp' }, context: RenderContext) {
    const line = '='.repeat(title.length + 6);
    return `${line}\n== ${title} ==\n${line}`;
  }
}
```

```typescript
// src/CustomerContext.tsx
import { Component, RenderContext } from 'pupt-lib';

interface CustomerContextProps {
  customerId: string;
}

export class CustomerContext extends Component<CustomerContextProps> {
  async render({ customerId }, context: RenderContext) {
    // Async component - can fetch data
    const customer = await fetchCustomer(customerId);
    return `Customer: ${customer.name}\nAccount: ${customer.tier}`;
  }
}
```

### 4. Build & Publish

```bash
# Build
npm run build

# Test locally
npm link
cd ../test-project
npm link @acme/components

# Publish
npm publish --access public
```

---

## Prompt Author Workflow

How to publish prompts (simple or advanced).

### Option 1: Single Prompt File

For sharing a single prompt:

```xml
<!-- my-prompt.prompt -->
<Prompt name="code-review" description="Review code" tags="code, review">
  <Role>Senior engineer</Role>
  <Task>Review the code</Task>
</Prompt>
```

Share via:
- Gist URL
- Direct file download
- npm package (for discoverability)

### Option 2: Package of Prompts

```
my-prompts/
├── package.json
├── prompts/
│   ├── code-review.prompt
│   ├── bug-report.prompt
│   └── feature-request.prompt
└── README.md
```

```json
// package.json
{
  "name": "@alice/prompts",
  "version": "1.0.0",
  "type": "module",
  "pupt": {
    "prompts": ["prompts/*.prompt"]
  }
}
```

### Option 3: Advanced TypeScript Prompts

For prompts with complex logic:

```
my-advanced-prompts/
├── package.json
├── src/
│   ├── index.ts
│   ├── prompts/
│   │   └── data-analysis.tsx
│   └── components/
│       └── DataTable.tsx
└── dist/
```

```typescript
// src/prompts/data-analysis.tsx
import { Prompt, Role, Task, Ask, Data } from 'pupt-lib';
import { DataTable } from '../components/DataTable';

export const dataAnalysis = (
  <Prompt name="data-analysis" tags={['data', 'analytics']}>
    <Ask.File name="dataFile" label="CSV file to analyze" mustExist />

    <Role>You are a data analyst</Role>

    <Task>
      Analyze the following data and provide insights:
      <DataTable file={inputs.dataFile} />
    </Task>
  </Prompt>
);
```

---

## Testing Prompts Locally

### Using the Pupt Class

```typescript
import { Pupt } from 'pupt-lib';

const pupt = new Pupt({
  modules: ['./my-prompts/'],
});

await pupt.init();

const prompt = pupt.getPrompt('code-review');

// Test with sample inputs
const result = prompt.render({
  inputs: {
    code: 'function test() { return 1; }',
  },
});

console.log(result.text);
```

### Unit Testing Components

```typescript
import { describe, it, expect } from 'vitest';
import { render, createEnvironment } from 'pupt-lib';
import { AcmeHeader } from '../src/AcmeHeader';

describe('AcmeHeader', () => {
  it('renders with default title', () => {
    const element = <AcmeHeader />;
    const result = render(element);

    expect(result.text).toContain('ACME Corp');
  });

  it('renders with custom title', () => {
    const element = <AcmeHeader title="Custom Title" />;
    const result = render(element);

    expect(result.text).toContain('Custom Title');
  });

  it('respects environment format', () => {
    const element = <AcmeHeader title="Test" />;

    const xmlResult = render(element, {
      env: createEnvironment('claude'),
    });

    const mdResult = render(element, {
      env: createEnvironment('gpt'),
    });

    // Results may differ based on environment
  });
});
```

---

## Publishing Checklist

### For Component Libraries

- [ ] All components extend `Component<Props>`
- [ ] Components are exported from `index.ts`
- [ ] `peerDependencies` includes `pupt-lib`
- [ ] `pupt.capabilities` declared if using filesystem/network
- [ ] TypeScript types are exported
- [ ] README documents available components
- [ ] Unit tests pass

### For Prompt Packages

- [ ] All prompts have unique names
- [ ] Tags are consistent and useful
- [ ] Descriptions are clear
- [ ] Required inputs have good labels
- [ ] `<Uses>` declarations are complete (for portability)
- [ ] Prompts render correctly
- [ ] README documents available prompts

---

## Versioning Guidelines

Follow semantic versioning:

| Change | Version Bump | Example |
|--------|--------------|---------|
| Bug fix | Patch | 1.0.0 → 1.0.1 |
| New component | Minor | 1.0.0 → 1.1.0 |
| New prompt | Minor | 1.0.0 → 1.1.0 |
| Breaking change | Major | 1.0.0 → 2.0.0 |

**Breaking changes include:**
- Renaming components
- Changing required props
- Removing components
- Changing component output format

---

## Next Steps

- [Search](11-search.md) - Making prompts discoverable
- [Module Loading](08-module-loading.md) - How libraries are loaded
- [Components](05-components.md) - Built-in component reference
