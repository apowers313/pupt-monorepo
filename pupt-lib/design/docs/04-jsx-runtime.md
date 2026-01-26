# JSX Runtime

[← Back to Index](00-index.md) | [Previous: Architecture](03-architecture.md) | [Next: Components](05-components.md)

---

pupt-lib implements a custom JSX runtime that does NOT depend on React. The runtime is designed specifically for text generation.

## Custom JSX Runtime

**Key Design Choice:** The JSX runtime outputs **string-based element types** (Option B), not component references. Components are resolved from a scoped registry at render time. See [Design Decisions](02-design-decisions.md#component-resolution) for rationale.

```typescript
// src/jsx-runtime/index.ts

export interface PuptElement {
  /** Component name as string - resolved from registry at render time */
  type: string;
  props: Record<string, unknown>;
  children: PuptNode[];
}

export type PuptNode =
  | PuptElement
  | string
  | number
  | boolean
  | null
  | undefined
  | PuptNode[];
```

### JSX Functions

```typescript
/**
 * JSX runtime function for single-child elements
 * Called by Babel when transforming JSX
 */
export function jsx(
  type: string | ComponentClass,
  props: Record<string, unknown>,
  key?: string
): PuptElement {
  const { children, ...restProps } = props;
  return {
    type: typeof type === "string" ? type : type.name,
    props: { ...restProps, key },
    children: children !== undefined ? [children] : [],
  };
}

/**
 * JSX runtime function for multi-child elements
 */
export function jsxs(
  type: string | ComponentClass,
  props: Record<string, unknown>,
  key?: string
): PuptElement {
  const { children, ...restProps } = props;
  return {
    type: typeof type === "string" ? type : type.name,
    props: { ...restProps, key },
    children: Array.isArray(children) ? children : [],
  };
}

/**
 * Fragment component for grouping without wrapper
 */
export const Fragment = Symbol.for("pupt.Fragment");
```

---

## Component Interface

Components are classes that extend `Component<Props>`:

```typescript
// src/component.ts

const COMPONENT_MARKER = Symbol.for('pupt-lib:component:v1');

export abstract class Component<Props = {}> {
  static [COMPONENT_MARKER] = true;

  /**
   * Render this component to text or child elements.
   * @param props - The component's props
   * @param context - Render context with scope, inputs, and environment
   */
  abstract render(props: Props, context: RenderContext): PuptNode;
}

/**
 * Type guard for Component classes.
 * Uses Symbol.for() to work across bundle boundaries.
 */
export function isComponentClass(value: unknown): value is typeof Component {
  return (
    typeof value === 'function' &&
    value[Symbol.for('pupt-lib:component:v1')] === true
  );
}
```

### Example Custom Component

```typescript
import { Component, RenderContext } from 'pupt-lib';

export class AcmeHeader extends Component<{ title: string }> {
  render({ title }, context: RenderContext) {
    return `=== ${title} ===`;
  }
}
```

---

## Environment Context

The environment context configures LLM targeting, output format, and runtime values.

### EnvironmentContext Interface

```typescript
export interface EnvironmentContext {
  /** Target LLM configuration */
  llm: LlmConfig;

  /** Output formatting preferences */
  output: OutputConfig;

  /** Code context for development prompts */
  code: CodeConfig;

  /** Runtime values (hostname, username, timestamps) */
  runtime: RuntimeConfig;

  /** User-defined extensions */
  extensions: Record<string, unknown>;
}

export interface LlmConfig {
  /** Model identifier: 'claude', 'gpt', 'gemini', etc. */
  model: string;
  /** Provider: 'anthropic', 'openai', 'google' */
  provider: string;
  /** Optional temperature */
  temperature?: number;
  /** Optional max tokens */
  maxTokens?: number;
}

export interface OutputConfig {
  /** Preferred format: 'xml', 'markdown', 'plain' */
  format: 'xml' | 'markdown' | 'plain';
  /** Whether to trim whitespace */
  trim: boolean;
  /** Indentation string */
  indent: string;
}

export interface CodeConfig {
  /** Primary language: 'typescript', 'python', etc. */
  language?: string;
  /** Framework: 'react', 'vue', 'django', etc. */
  framework?: string;
}

export interface RuntimeConfig {
  /** Current hostname */
  hostname: string;
  /** Current username */
  username: string;
  /** Current working directory */
  cwd: string;
  /** Current timestamp (ISO string) */
  timestamp: string;
  /** Current date (YYYY-MM-DD) */
  date: string;
  /** Current time (HH:MM:SS) */
  time: string;
  /** UUID generator */
  uuid: () => string;
}
```

### Default Environment

```typescript
export const DEFAULT_ENVIRONMENT: EnvironmentContext = {
  llm: {
    model: 'claude',
    provider: 'anthropic',
  },
  output: {
    format: 'xml',
    trim: true,
    indent: '  ',
  },
  code: {},
  runtime: {
    hostname: os.hostname(),
    username: os.userInfo().username,
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].split('.')[0],
    uuid: () => crypto.randomUUID(),
  },
  extensions: {},
};
```

### Creating Environments

```typescript
import { createEnvironment } from 'pupt-lib';

// Create environment optimized for Claude
const claudeEnv = createEnvironment('claude', {
  code: {
    language: 'typescript',
    framework: 'react',
  },
});

// Create environment for GPT (uses markdown instead of XML)
const gptEnv = createEnvironment('gpt');

// Custom environment with extensions
const customEnv = createEnvironment('claude', {
  extensions: {
    companyStyle: 'formal',
    maxResponseLength: 500,
  },
});
```

### Component Usage of Environment

Components can access the environment via the render context:

```typescript
class SmartFormat extends Component {
  render(props, context: RenderContext) {
    const { format } = context.env.output;

    if (format === 'xml') {
      return `<${props.tag}>${props.children}</${props.tag}>`;
    } else if (format === 'markdown') {
      return `## ${props.tag}\n${props.children}`;
    }
    return props.children;
  }
}
```

---

## LLM-Specific Optimization Guidelines

Components use the `env.output.format` setting to adjust their output based on the target LLM:

| LLM | Recommended Format | Notes |
|-----|-------------------|-------|
| `claude` | `xml` | Trained with XML tags, better section parsing |
| `gpt` | `markdown` | Strong markdown understanding, good with headers |
| `gemini` | `markdown` | Prefers structured markdown |
| `llama` | `plain` | Simpler formatting often works better |
| `generic` | `xml` | Safe default with clear structure |

### Claude (Anthropic)

Claude models were trained with XML tags. pupt-lib outputs XML-delimited sections by default:

```xml
<role>
You are an expert software architect...
</role>

<task>
Review the following code and provide feedback...
</task>
```

Reference: [Anthropic Prompt Engineering Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)

### GPT (OpenAI)

GPT models work well with markdown. When targeting GPT:

```markdown
## Role
You are an expert software architect...

## Task
Review the following code and provide feedback...
```

### Gemini (Google)

Gemini supports both formats. Use XML for consistency or markdown based on preference.

---

## Runtime JSX Transformation

### Babel Configuration

pupt-lib uses Babel to transform JSX at runtime (for `.prompt` files) or build time (for `.tsx` files).

```typescript
// src/babel/preset.ts

export const puptBabelPreset = {
  presets: [
    ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
  ],
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      runtime: 'automatic',
      importSource: 'pupt-lib',
    }],
  ],
};
```

### Babel Preset Options

```typescript
export interface BabelPresetOptions {
  /** Enable TypeScript support (default: true) */
  typescript?: boolean;
  /** Development mode with extra checks (default: false) */
  development?: boolean;
}

export function createBabelPreset(options?: BabelPresetOptions) {
  return {
    presets: [
      options?.typescript !== false && [
        '@babel/preset-typescript',
        { isTSX: true, allExtensions: true },
      ],
    ].filter(Boolean),
    plugins: [
      ['@babel/plugin-transform-react-jsx', {
        runtime: 'automatic',
        importSource: 'pupt-lib',
        development: options?.development ?? false,
      }],
    ],
  };
}
```

### TypeScript Configuration

For TypeScript projects using pupt-lib JSX:

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "pupt-lib"
  }
}
```

---

## Next Steps

- [Components](05-components.md) - Explore the built-in component library
- [User Input](06-user-input.md) - Learn about input collection
- [API](07-api.md) - See the public API surface
