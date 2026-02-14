# Browser Support

pupt-lib works in both Node.js and browser environments. This page covers how you load and use pupt-lib in the browser.

## Overview

pupt-lib bundles its key dependencies (`@babel/standalone`, `zod`, `minisearch`), so you only need to load pupt-lib itself. The library provides utilities to generate [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) for CDN-based loading, and it includes `@babel/standalone` for runtime JSX transformation so you can compile `.prompt` and `.tsx` source strings directly in the browser without a build step.

---

## Loading via CDN

The simplest way to use pupt-lib in a browser is with an import map and a CDN:

```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "pupt-lib": "https://esm.sh/pupt-lib@1.3.0",
      "pupt-lib/jsx-runtime": "https://esm.sh/pupt-lib@1.3.0/jsx-runtime"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import { createPromptFromSource, render } from 'pupt-lib';

    const source = `
      <Prompt name="hello">
        <Task>Say hello to the user.</Task>
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'hello.prompt');
    const result = await render(element);
    document.body.textContent = result.text;
  </script>
</body>
</html>
```

---

## Generating Import Maps

Rather than hand-writing import maps, you can generate them programmatically with the utilities described below. All of these functions are exported from `pupt-lib`.

### `generatePuptLibImportMap(options?)`

This is the quickest way to get a working import map. It produces the two entries pupt-lib needs (`pupt-lib` and `pupt-lib/jsx-runtime`) and optionally includes any extra packages you specify:

```typescript
import { generatePuptLibImportMap } from 'pupt-lib';

const importMap = generatePuptLibImportMap({ puptLibVersion: '1.3.0' });
// {
//   imports: {
//     'pupt-lib': 'https://esm.sh/pupt-lib@1.3.0',
//     'pupt-lib/jsx-runtime': 'https://esm.sh/pupt-lib@1.3.0/jsx-runtime',
//   }
// }
```

**Options:**

```typescript
interface PuptLibImportMapOptions {
  cdn?: CdnProvider;                      // CDN provider (default: 'esm.sh')
  cdnTemplate?: string;                   // Custom URL template with {name} and {version}
  puptLibVersion?: string;                // pupt-lib version (default: 'latest')
  additionalDependencies?: Dependency[];  // Extra packages to include
}
```

You can also add extra packages and switch CDN providers in the same call:

```typescript
const importMap = generatePuptLibImportMap({
  puptLibVersion: '1.3.0',
  cdn: 'unpkg',
  additionalDependencies: [
    { name: '@acme/prompt-components', version: '2.0.0' },
  ],
});
// {
//   imports: {
//     'pupt-lib': 'https://unpkg.com/pupt-lib@1.3.0',
//     'pupt-lib/jsx-runtime': 'https://unpkg.com/pupt-lib@1.3.0/jsx-runtime',
//     '@acme/prompt-components': 'https://unpkg.com/@acme/prompt-components@2.0.0',
//   }
// }
```

### `generatePuptLibImportMapScript(options?)`

If you want a ready-to-use `<script type="importmap">` HTML tag instead of a plain object, use this function. It accepts the same options as `generatePuptLibImportMap`:

```typescript
import { generatePuptLibImportMapScript } from 'pupt-lib';

const html = generatePuptLibImportMapScript({ puptLibVersion: '1.3.0' });
// <script type="importmap">
// {
//   "imports": {
//     "pupt-lib": "https://esm.sh/pupt-lib@1.3.0",
//     "pupt-lib/jsx-runtime": "https://esm.sh/pupt-lib@1.3.0/jsx-runtime"
//   }
// }
// </script>
```

### `generateImportMap(dependencies, options)`

Use this lower-level function when you want to build an import map for arbitrary packages (not just pupt-lib). You pass an array of `Dependency` objects and a `CdnOptions` object:

```typescript
import { generateImportMap } from 'pupt-lib';

const importMap = generateImportMap(
  [
    { name: '@acme/prompts', version: '2.0.0' },
    { name: 'my-components', version: '1.0.0' },
  ],
  { cdn: 'esm.sh' },
);
```

### `generateImportMapScript(dependencies, options)`

Like `generateImportMap`, but wraps the result in a `<script type="importmap">` HTML tag:

```typescript
import { generateImportMapScript } from 'pupt-lib';

const html = generateImportMapScript(
  [{ name: '@acme/prompts', version: '2.0.0' }],
  { cdn: 'esm.sh' },
);
```

---

## CDN Providers

pupt-lib ships with four built-in CDN providers. If none of these fit your setup, you can supply a custom `cdnTemplate` instead (see the example below the table).

| Provider | Type | URL Pattern |
|---|---|---|
| esm.sh (default) | `'esm.sh'` | `https://esm.sh/{name}@{version}` |
| unpkg | `'unpkg'` | `https://unpkg.com/{name}@{version}` |
| jsdelivr | `'jsdelivr'` | `https://cdn.jsdelivr.net/npm/{name}@{version}` |
| skypack | `'skypack'` | `https://cdn.skypack.dev/{name}@{version}` |

### `resolveCdn(name, version, options)`

Resolves a single package name and version to a full CDN URL. This is the primitive that `generateImportMap` uses internally, and you can call it directly when you need a one-off URL:

```typescript
import { resolveCdn } from 'pupt-lib';

resolveCdn('@acme/prompts', '1.0.0', { cdn: 'esm.sh' });
// 'https://esm.sh/@acme/prompts@1.0.0'

resolveCdn('@acme/prompts', '1.0.0', { cdn: 'jsdelivr' });
// 'https://cdn.jsdelivr.net/npm/@acme/prompts@1.0.0'
```

You can also pass a custom CDN template with `{name}` and `{version}` placeholders:

```typescript
resolveCdn('@acme/prompts', '1.0.0', {
  cdnTemplate: 'https://my-cdn.example.com/{name}@{version}',
});
// 'https://my-cdn.example.com/@acme/prompts@1.0.0'
```

### `serializeImportMap(importMap)`

Converts an `ImportMap` object to a pretty-printed JSON string. This is handy when you already have an `ImportMap` and need the raw JSON (for example, to inject into an HTML template):

```typescript
import { serializeImportMap } from 'pupt-lib';

const json = serializeImportMap(importMap);
```

---

## Types

```typescript
type CdnProvider = 'esm.sh' | 'unpkg' | 'jsdelivr' | 'skypack';

interface CdnOptions {
  cdn?: CdnProvider;
  cdnTemplate?: string;       // Custom URL template with {name}, {version}, {path}
  path?: string;               // Optional subpath within the package
  scopes?: Record<string, Record<string, string>>;
}

interface Dependency {
  name: string;
  version: string;
}

interface ImportMap {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}
```

---

## Using with Bundlers

When you use a bundler (Vite, Webpack, etc.), you don't need import maps at all. Install pupt-lib as a regular dependency and configure your toolchain to use pupt-lib's JSX runtime.

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'pupt-lib',
  },
});
```

### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "pupt-lib"
  }
}
```

### Babel

If you use Babel directly, configure the `@babel/plugin-transform-react-jsx` plugin to point at pupt-lib's JSX runtime:

```json
// babel.config.json
{
  "plugins": [
    ["@babel/plugin-transform-react-jsx", {
      "runtime": "automatic",
      "importSource": "pupt-lib"
    }]
  ]
}
```

---

## Runtime Transformation

pupt-lib bundles `@babel/standalone` for runtime JSX transformation. This is the engine behind `createPromptFromSource()` -- it compiles JSX source strings into executable JavaScript on the fly, so you can render prompts in the browser without any build step.

```typescript
import { createPromptFromSource, render } from 'pupt-lib';

// This works in the browser without any build step
const source = `
  <Prompt name="example">
    <Task>Help the user.</Task>
  </Prompt>
`;

const element = await createPromptFromSource(source, 'example.prompt');
const result = await render(element);
```

You can also use the `Transformer` class directly if you need finer control over the compilation step:

```typescript
import { Transformer } from 'pupt-lib';

const transformer = new Transformer();
const code = await transformer.transformSourceAsync(source, 'example.tsx');
```

---

## Browser vs. Node.js Differences

Most of pupt-lib works identically in both environments. The main differences involve filesystem access and OS-level runtime values.

| Feature | Node.js | Browser |
|---------|---------|---------|
| `createPrompt()` (file loading) | Yes | No -- use `createPromptFromSource()` instead |
| `createPromptFromSource()` | Yes | Yes |
| `render()` | Yes | Yes |
| Runtime values (`hostname`, `username`, `os`) | Detected from the OS | Returns static fallbacks (`'browser'`, `'anonymous'`, `'unknown'`) |
| `<File>` component | Reads from the filesystem | Not available |
| `FileSearchEngine` | Yes | Not available |
| Import maps / CDN utilities | Yes | Yes |

---

## Example: Browser-Based Prompt Editor

Here is a minimal prompt editor that lets you type JSX into a textarea and render it live in the browser. Drop this into an HTML file and open it directly -- no build step required:

```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "pupt-lib": "https://esm.sh/pupt-lib@1.3.0",
      "pupt-lib/jsx-runtime": "https://esm.sh/pupt-lib@1.3.0/jsx-runtime"
    }
  }
  </script>
</head>
<body>
  <textarea id="source" rows="10" cols="60">
<Prompt name="demo">
  <Role preset="engineer" />
  <Task>Review the code for bugs.</Task>
  <Steps preset="debugging" />
</Prompt>
  </textarea>
  <button id="render">Render</button>
  <pre id="output"></pre>

  <script type="module">
    import { createPromptFromSource, render } from 'pupt-lib';

    document.getElementById('render').addEventListener('click', async () => {
      const source = document.getElementById('source').value;
      try {
        const element = await createPromptFromSource(source, 'demo.prompt');
        const result = await render(element);
        document.getElementById('output').textContent = result.text;
      } catch (e) {
        document.getElementById('output').textContent = `Error: ${e.message}`;
      }
    });
  </script>
</body>
</html>
```

---

## Related

- [API Reference](/developers/api) — `render()`, `createPromptFromSource()`, types
- [Writing Modules](/developers/first-module) — importing from URLs and CDNs
- [Creating Modules](/developers/creating-modules) — publishing packages for browser use
