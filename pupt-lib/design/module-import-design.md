# Module Import Resolution Design

## Problem Statement

pupt-lib needs to dynamically evaluate JSX code at runtime. Users write `.prompt` or `.tsx` files containing JSX, and we transform and execute that code to produce rendered text.

The challenge: **transformed code contains `import` statements with bare specifiers** (like `'pupt-lib'` or `'zod'`), but Node.js resolves imports at startup, not at runtime.

### Why This Is Hard

```
Normal Node.js:    startup → resolve imports → run code
Our situation:     startup → run code → user calls createPrompt() → transform JSX → NOW we have imports → ???
```

When we dynamically generate code with `import { Prompt } from 'pupt-lib'`, Node.js has already finished its module resolution phase. We need to resolve these imports ourselves.

### Bare Specifier Resolution

Bare specifiers like `'pupt-lib'` (as opposed to `'./local-file.js'` or `'https://example.com/module.js'`) require a filesystem location to resolve from. Node.js walks up from the importing file's location looking for `node_modules/`.

Dynamic evaluation methods lack this location:

| Method | Location | Can resolve bare specifiers? |
|--------|----------|------------------------------|
| `import('./file.js')` | `./file.js` | ✅ Yes |
| `import('data:text/javascript,...')` | None | ❌ No |
| `import('file:///tmp/eval.mjs')` | `/tmp/` | ❌ No (no node_modules there) |

---

## Sources of Bare Specifiers

### 1. Built-in Components (We Control)

For `.prompt` files, our preprocessor injects:

```javascript
import { jsx } from 'pupt-lib/jsx-runtime';  // Babel adds for JSX
import { Prompt, Role, Task, ... } from 'pupt-lib';  // We add
```

### 2. User's `<Uses>` Declarations

```xml
<Uses component="Card" from="my-component-lib" />
```

Transforms to:

```javascript
import { Card } from 'my-component-lib';
```

### 3. User's `.tsx` Files

Users may write arbitrary imports:

```typescript
import { z } from 'zod';
import { CustomThing } from 'some-package';
```

---

## Options Considered

### Option A: Data URLs

**Approach:** Encode transformed code as a data URL and `import()` it.

```javascript
const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
const module = await import(dataUrl);
```

**Status:** ❌ Ruled out

**Reason:** Data URLs have no filesystem location, so bare specifiers cannot resolve. Node.js returns "Cannot find module 'pupt-lib'".

---

### Option B: Node.js Import Maps

**Approach:** Use `--experimental-import-map importmap.json` to map bare specifiers to paths.

```json
{
  "imports": {
    "pupt-lib": "./node_modules/pupt-lib/dist/index.js"
  }
}
```

**Status:** ❌ Ruled out (for now)

**Reasons:**
- Still experimental in Node.js
- Development stalled (~1 year since last activity on [nodejs/loaders#168](https://github.com/nodejs/loaders/issues/168))
- Requires CLI flag, complicating user experience
- Not available for stable use

**Reconsider when:** Node.js import maps become stable and don't require flags.

---

### Option C: Custom Node.js Loader

**Approach:** Use `--import ./loader.mjs` with `register()` from `node:module` to intercept resolution.

```javascript
import { register } from 'node:module';
register('./custom-resolver.mjs', import.meta.url);
```

**Status:** ❌ Ruled out

**Reasons:**
- Requires CLI flag (`--import`)
- Users would need to run `NODE_OPTIONS="--import ..." pt` or use wrapper scripts
- Adds complexity to CLI tool usage
- Different from how other Node.js tools work

**Reconsider when:** We're willing to accept CLI flag requirements or Node.js adds auto-loading of loaders.

---

### Option D: Shebang with Node Flags

**Approach:** Add Node.js flags directly in the shebang line.

```bash
#!/usr/bin/env -S node --import ./loader.mjs
```

**Status:** ❌ Ruled out

**Reasons:**
- `env -S` not available on older Linux systems
- Windows doesn't use shebangs at all
- Relative paths in `--import` resolve from cwd, not script location ([nodejs/node#23868](https://github.com/nodejs/node/issues/23868))
- Platform compatibility issues make this fragile

---

### Option E: `<Uses>` as Runtime Component

**Approach:** Make `<Uses>` a real component that does `import()` at render time.

```jsx
<Uses component="Card" from="my-lib" />
<Card>Hello</Card>
```

**Status:** ❌ Ruled out (direct approach)

**Reason:** JavaScript evaluates identifiers immediately. When the code runs:

```javascript
jsx(Uses, { component: "Card", from: "my-lib" });
jsx(Card, { children: "Hello" });  // Card is undefined!
```

The `Card` identifier is evaluated before `Uses.render()` executes.

**Variant still viable:** Render props pattern (see Option 6 below).

---

### Option F: vm.Module API

**Approach:** Use Node.js experimental `vm.Module` for ES module evaluation.

```javascript
import { Module } from 'vm';
const module = new vm.SourceTextModule(code);
```

**Status:** ❌ Ruled out

**Reasons:**
- Requires `--experimental-vm-modules` flag
- Experimental since Node.js v12 (~2019), still not stable
- Bare specifier resolution still requires custom `linker` function
- Doesn't simplify the core problem

**Reference:** [module-from-string](https://github.com/exuanbo/module-from-string) uses this approach.

---

## Remaining Viable Options

### Option 1: Temp Files in `node_modules/.cache/` (Current)

**How it works:**

1. Transform code with Babel (JSX + `<Uses>` → imports)
2. Rewrite `'pupt-lib'` imports to absolute `file://` paths
3. Write to `node_modules/.cache/pupt-lib/eval-xxx.mjs`
4. `import()` the temp file (Node resolves other bare specifiers)
5. Delete temp file

**Why `node_modules/.cache/`:** Node.js walks up from this location and finds `node_modules/` for other packages.

| Pros | Cons |
|------|------|
| Works today | Hybrid approach (both temp file trick AND path rewriting) |
| No new dependencies | Temp file creation/cleanup |
| Handles any user imports | Different codepath needed for browser |
| | Self-reference complexity when testing inside pupt-lib |

**Best for:** Minimal changes, already implemented.

---

### Option 2: Full Path Rewriting

**How it works:**

1. Transform code with Babel
2. Rewrite ALL bare specifiers to absolute `file://` paths using `require.resolve()`
3. Evaluate from anywhere (temp file location doesn't matter)

```javascript
// Before
import { Prompt } from 'pupt-lib';
import { Card } from 'my-lib';

// After
import { Prompt } from 'file:///project/node_modules/pupt-lib/dist/index.js';
import { Card } from 'file:///project/node_modules/my-lib/index.js';
```

| Pros | Cons |
|------|------|
| Simple mental model | Must resolve every import ourselves |
| No special temp file location | `require.resolve()` needed for each bare specifier |
| Errors surface at transform time | Browser needs different paths (CDN URLs) |
| No bundling overhead | Path resolution must handle edge cases (monorepos, symlinks) |

**Best for:** Clean solution with minimal dependencies, if we're okay with different browser/Node paths.

---

### Option 3: globalThis Injection (Built-ins Only)

**How it works:**

1. Before evaluation, set `globalThis.__PUPT__ = { jsx, Prompt, Role, ... }`
2. Preprocessor generates `const { Prompt, Role } = globalThis.__PUPT__` instead of imports
3. External packages (`<Uses>`) still need resolution via another method

```javascript
// Instead of:
import { Prompt, Role } from 'pupt-lib';

// Generate:
const { Prompt, Role, jsx, Fragment } = globalThis.__PUPT__;
```

| Pros | Cons |
|------|------|
| No module resolution for built-ins | Only solves built-in components |
| Simple | `<Uses from="external">` still needs resolution |
| Fast | Pollutes global namespace |
| | Non-standard pattern |

**Best for:** Optimizing built-in component loading, combined with another approach for external packages.

---

### Option 4: Babel + esbuild Bundle

**How it works:**

1. Babel transforms JSX + `<Uses>` → JavaScript with imports
2. esbuild bundles everything, resolving all imports
3. Output is self-contained (no bare specifiers)
4. Evaluate the bundled code

```javascript
const result = await esbuild.build({
  stdin: { contents: transformedCode, loader: 'js' },
  bundle: true,
  write: false,
  format: 'esm',
});
const bundled = result.outputFiles[0].text;
// bundled has no imports - everything is inlined
```

| Pros | Cons |
|------|------|
| Complete solution | Two dependencies (Babel + esbuild) |
| `<Uses from="anything">` works | Larger output (dependencies inlined) |
| Same approach for browser + Node | Slower (transform + bundle) |
| No temp files or path tricks | pupt-lib re-bundled each time* |

*Can optimize by marking `pupt-lib` as external and using globalThis.

**Reference:** [mdx-bundler](https://github.com/kentcdodds/mdx-bundler) uses this approach.

**Best for:** Complete solution where `<Uses>` must work with any npm package.

---

### Option 5: esbuild Only (Regex for `<Uses>`)

**How it works:**

1. Regex transforms `<Uses>` → `import` statements (before esbuild sees JSX)
2. esbuild handles TypeScript, JSX, AND bundling
3. Output is self-contained

```javascript
// Regex transform
source = source.replace(
  /<Uses\s+component="([^"]+)"\s+from="([^"]+)"\s*\/>/g,
  'import { $1 } from "$2";'
);

// esbuild does the rest
const result = await esbuild.build({
  stdin: { contents: source, loader: 'tsx' },
  jsx: 'automatic',
  jsxImportSource: 'pupt-lib',
  bundle: true,
});
```

| Pros | Cons |
|------|------|
| Single dependency (esbuild) | Regex fragile for edge cases |
| Fastest option | Strict `<Uses>` syntax required |
| Simple pipeline | Attribute order matters |
| Same approach browser + Node | Multi-line `<Uses>` needs handling |

**Edge cases to handle:**
- Different attribute orders: `<Uses from="x" component="Y" />`
- Multi-line: `<Uses\n  component="X"\n  from="y"\n/>`
- Multiple components: `<Uses component="A, B" from="x" />`

**Best for:** Simplicity and speed, if strict `<Uses>` syntax is acceptable.

---

### Option 6: Render Props `<Uses>`

**How it works:**

`<Uses>` becomes a real component. Users pass children as a function:

```jsx
<Uses component="Card" from="my-lib">
  {(Card) => <Card>Hello</Card>}
</Uses>
```

The `Uses` component:

```typescript
class Uses extends Component {
  async render({ component, from, children }) {
    const module = await import(from);  // Dynamic import at render time
    const Component = module[component];
    return children(Component);  // Call render prop with imported component
  }
}
```

| Pros | Cons |
|------|------|
| No compile-time transform needed | Uglier syntax for users |
| `<Uses>` is a real component | Requires async rendering |
| Works with any package | Still need to resolve `from` path for import() |
| | Different from standard import patterns |

**Best for:** If we want `<Uses>` to be a true runtime component and users accept the syntax.

---

## Comparison Matrix

| Option | Dependencies | Complexity | Browser + Node | `<Uses>` Support | Speed |
|--------|--------------|------------|----------------|------------------|-------|
| 1. Temp files (current) | Babel | Medium | Different | ✅ Babel plugin | Medium |
| 2. Full path rewrite | Babel | Low | Different | ✅ Babel plugin | Fast |
| 3. globalThis | Babel | Low | Same | ❌ External only | Fast |
| 4. Babel + esbuild | Both | Medium | Same | ✅ Babel plugin | Slow |
| 5. esbuild only | esbuild | Low | Same | ⚠️ Regex | Fast |
| 6. Render props | Babel | Low | Needs resolution | ✅ Runtime | Medium |

---

## How Other Projects Solve This

### mdx-bundler
[GitHub](https://github.com/kentcdodds/mdx-bundler)

Uses esbuild to bundle MDX strings at runtime. All imports resolved and inlined at bundle time.

### jiti
[GitHub](https://github.com/unjs/jiti)

Runtime TypeScript loader. Uses Babel for transform, runs in Node.js context where resolution works naturally.

### bundle-require
Uses esbuild to bundle to temp file, then imports. Similar to our Option 1 but bundles first.

### Browser solutions
Use import maps + CDN URLs (esm.sh, Skypack) to resolve bare specifiers to HTTPS URLs.

---

## Decision Criteria

When choosing an option, consider:

1. **Dependencies:** How much do we want to add? (Babel alone, esbuild alone, or both)
2. **Browser support:** Do we need identical codepaths for browser and Node?
3. **`<Uses>` flexibility:** Must it work with any npm package, or just known packages?
4. **Performance:** How important is transform/bundle speed?
5. **Syntax constraints:** Can we enforce strict `<Uses>` syntax?
6. **Maintenance:** How complex is the solution to maintain?

---

## Recommendation

**For simplicity:** Option 5 (esbuild only) - single dependency, fast, works everywhere.

**For flexibility:** Option 4 (Babel + esbuild) - handles any `<Uses>` pattern, battle-tested approach (mdx-bundler uses it).

**For minimal changes:** Option 2 (full path rewrite) - extend current approach, no new dependencies.

---

## Future Considerations

- **Node.js import maps:** Revisit when stable (no flags required)
- **Bun/Deno:** These runtimes handle bare specifiers differently; may simplify the problem
- **Browser-native solutions:** Import maps are stable in browsers; could unify with Node when Node catches up
