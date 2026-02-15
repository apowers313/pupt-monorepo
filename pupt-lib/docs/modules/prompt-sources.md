# Prompt Sources

pupt-lib discovers `.prompt` files from different locations based on what you put in the `modules` array.

::: tip Looking for imports?
This page is about how the API discovers prompts from packages and directories (the `modules` array). If you want to import a tag into a `.prompt` file, see [Using Modules](/modules/using-modules) for the `<Uses>` tag.
:::

## The `prompts/` Directory Convention

Packages place `.prompt` files in a `prompts/` directory at the package root. The module loader discovers them automatically -- no manifest or configuration required:

```
my-prompt-package/
├── package.json
└── prompts/
    ├── code-review.prompt
    ├── debug-root-cause.prompt
    └── security-audit.prompt
```

When given a package root path, pupt-lib checks for a `prompts/` subdirectory and scans for `.prompt` files there. This convention works for all source types -- local directories, npm packages, and GitHub repositories.

This default can be overridden per-module using the `promptDirs` field in a `ResolvedModuleEntry`, which lets you scan multiple directories or directories with non-standard names (e.g., `["prompts", "advanced-prompts", "templates"]`).

## How Modules Are Routed

The format of each entry in the `modules` array determines where pupt-lib looks:

| Entry type | Where it looks | Example |
|---|---|---|
| `local` | Scans the directory (or its `prompts/` subdirectory) | `{ name: 'my-prompts', type: 'local', source: './my-prompts' }` |
| `npm` | Scans `node_modules/pkg/prompts/` | `{ name: 'pupt-sde', type: 'npm', source: 'pupt-sde' }` |
| `url` | Downloads the package and extracts `prompts/` | `{ name: 'pupt-sde', type: 'url', source: 'https://...' }` |
| `git` | Uses the GitHub API to find `prompts/` | `{ name: 'repo', type: 'git', source: 'https://github.com/user/repo' }` |

All sources follow the same `prompts/` directory convention by default. The discovered `.prompt` files are compiled and made searchable automatically.

## Configuring Modules

### Module entries

Each entry in the `modules` array is a `ResolvedModuleEntry` with an explicit `type` field that determines where pupt-lib looks for prompts:

```json
{
  "modules": [
    {
      "name": "pupt-sde",
      "type": "npm",
      "source": "pupt-sde"
    },
    {
      "name": "team-prompts",
      "type": "git",
      "source": "https://github.com/team/prompts",
      "promptDirs": ["prompts", "advanced-prompts"],
      "version": "abc12345"
    }
  ]
}
```

The `type` field (`git`, `npm`, `local`, `url`) routes directly to the appropriate source. When `promptDirs` is provided, those directories are scanned instead of the default `prompts/`. See the [API reference](/developers/api#pupt-class) for the full `ResolvedModuleEntry` type.

### Custom sources

For sources that aren't covered by the built-in types (like S3, a REST API, or a database), you can use package references in config files:

```json
{
  "modules": [
    { "name": "pupt-sde", "type": "npm", "source": "pupt-sde" },
    { "source": "pupt-source-s3", "config": { "bucket": "team-prompts", "region": "us-east-1" } }
  ]
}
```

See [Custom Sources](/developers/custom-sources) for details on creating and using custom prompt sources.

## Error Handling

If a source fails (network error, rate limit, bad credentials), pupt-lib **skips that source and continues** loading the rest. A warning is recorded so you can see what went wrong, but the working sources still load normally.

This means one broken source does not prevent access to all your other prompts.

## What to Learn Next

- [Prompts vs. Components](/modules/prompts-vs-components) -- Understand the two concepts
- [Publishing](/modules/publishing) -- Package and share your prompts
- [Custom Sources](/developers/custom-sources) -- Build your own prompt source
