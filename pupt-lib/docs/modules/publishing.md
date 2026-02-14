# Publishing Modules

You can share your custom tags and prompts with others by publishing them as npm packages, sharing files directly, or hosting on GitHub.

## Sharing a Single File

The simplest way to share is to send someone a `.prompt` file or a tag file. They import it with a relative path:

```xml
<Uses component="MyTag" from="./path/to/my-tags" />
```

For quick sharing without npm, host the file on GitHub and import it directly:

```xml
<Uses component="MyTag" from="github:yourname/my-tags" />
```

## Publishing an npm Package

For wider distribution, publish your tags as an npm package. This lets anyone install them with `npm install` and import them in their prompts.

### Project Structure

A typical tag library looks like this:

```
my-prompt-tags/
├── package.json
├── src/
│   ├── index.ts          # Exports all tags
│   ├── Warning.tsx
│   └── Callout.tsx
└── dist/
    └── index.js          # Built output
```

### package.json

```json
{
  "name": "@acme/prompt-tags",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  }
}
```

Always list `pupt-lib` as a `peerDependency`, not a direct dependency. This ensures everyone shares a single copy of pupt-lib and avoids version conflicts. Set `type` to `"module"` so the package uses ES modules, and include `types` so users get editor autocomplete and error checking.

### Entry Point

Export all your tags from `index.ts`:

```typescript
export { Warning } from './Warning';
export { Callout } from './Callout';
```

### Build and Publish

```bash
npm run build
npm publish --access public
```

Users can then import your tags:

```xml
<Uses component="Warning, Callout" from="@acme/prompt-tags" />
```

## Publishing Prompts

You can also share complete prompts, not just individual tags. A prompt package bundles `.prompt` files together so others can install and use them right away.

### Prompt Package

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
{
  "name": "@acme/prompts",
  "version": "1.0.0",
  "type": "module",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  }
}
```

### Tips for Good Prompt Packages

Give each prompt a unique `name` so users can tell them apart. Add `description` and `tags` to make your prompts easy to find and search. If your prompts collect user input, add clear `label` text to all inputs so people know what to fill in. Test that every prompt produces the output you expect before publishing.

## Declaring Capabilities

If your tags need special platform features, document them in `package.json` so users know what to expect. This is a convention -- pupt-lib does not enforce it, but it helps people understand whether your tags will work in their environment.

```json
{
  "pupt": {
    "capabilities": ["network"]
  }
}
```

| Capability | What it means |
|------------|--------------|
| `filesystem` | Reads or writes files (won't work in browsers) |
| `network` | Makes HTTP requests |
| `process` | Accesses system info (won't work in browsers) |

## Publishing Checklist

Before you publish, run through this list:

- [ ] All tags are exported from `index.ts`
- [ ] `pupt-lib` is in `peerDependencies` (not `dependencies`)
- [ ] `pupt.capabilities` is set if your tags use filesystem or network features
- [ ] Type declarations are included
- [ ] All prompts have unique `name` values
- [ ] All inputs have clear labels
- [ ] Everything produces the expected output

## What to Learn Next

- [Using Modules](/modules/using-modules) -- Import and use shared tags
- [Writing Tags](/developers/first-component) -- Build your own custom tags (for developers)
