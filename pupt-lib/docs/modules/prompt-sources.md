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

## How Modules Are Routed

The format of each entry in the `modules` array determines where pupt-lib looks:

| Entry format | Where it looks | Example |
|---|---|---|
| Local path | Scans the directory (or its `prompts/` subdirectory) | `./my-prompts` |
| npm package name | Scans `node_modules/pkg/prompts/` | `pupt-sde` |
| CDN or tarball URL | Downloads the package and extracts `prompts/` | `https://cdn.jsdelivr.net/npm/pupt-sde@1.0.0` |
| GitHub reference | Uses the GitHub API to find `prompts/` | `github:user/repo#v1.0.0` |

All sources follow the same `prompts/` directory convention. The discovered `.prompt` files are compiled and made searchable automatically.

## Configuring Modules

### String entries

The simplest approach. pupt-lib figures out the source type from the format:

```json
{
  "modules": [
    "./local-prompts",
    "pupt-sde",
    "github:user/community-prompts#v2.0"
  ]
}
```

### Custom sources

For sources that aren't covered by the built-in types (like S3, a REST API, or a database), you can use package references in config files:

```json
{
  "modules": [
    "pupt-sde",
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
