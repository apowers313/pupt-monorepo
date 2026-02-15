# Creating Custom Prompt Sources

You can create custom prompt sources to discover `.prompt` files from any backend. This covers REST APIs, S3 buckets, databases, Git hosting services, and more. Custom sources implement the same `PromptSource` interface that the built-in sources use.

## The PromptSource Interface

```typescript
import type { PromptSource, DiscoveredPromptFile } from 'pupt-lib';

interface PromptSource {
  getPrompts(): Promise<DiscoveredPromptFile[]>;
}

interface DiscoveredPromptFile {
  filename: string;   // e.g., "code-review.prompt"
  content: string;    // raw .prompt file source
}
```

A prompt source returns raw `.prompt` file contents. pupt-lib handles compilation, metadata extraction, and search indexing from there.

## Implementing a Custom Source

Here is a complete example of an S3-based prompt source:

```typescript
// pupt-source-s3/index.ts
import type { PromptSource, DiscoveredPromptFile } from 'pupt-lib';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

export default class S3PromptSource implements PromptSource {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: { bucket: string; prefix?: string; region?: string }) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? 'prompts/';
    this.client = new S3Client({ region: config.region ?? 'us-east-1' });
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    // List .prompt files in the bucket
    const list = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: this.prefix,
    }));

    const promptKeys = (list.Contents ?? [])
      .map(obj => obj.Key!)
      .filter(key => key.endsWith('.prompt'));

    // Fetch each file's content
    return Promise.all(promptKeys.map(async (key) => {
      const obj = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        filename: key.split('/').pop()!,
        content: await obj.Body!.transformToString(),
      };
    }));
  }
}
```

The key requirements:

- Default export -- the class must be the default export so pupt-lib can instantiate it from config files
- Constructor takes config -- the constructor receives the `config` object from `{ source, config }` entries
- `getPrompts()` returns `DiscoveredPromptFile[]` -- each item has a `filename` and the raw `.prompt` file `content`

## Distributing as an npm Package

Publish your source as an npm package:

```json
{
  "name": "pupt-source-s3",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0"
  }
}
```

List `pupt-lib` as a peer dependency so the types are shared.

## Using Custom Sources

### Programmatic Usage (PromptSource Instances)

Pass a source instance directly. This is the natural approach for application code and pupt-react:

```typescript
import { Pupt } from 'pupt-lib';
import S3PromptSource from 'pupt-source-s3';

const pupt = new Pupt({
  modules: [
    'pupt-sde',  // npm package
    new S3PromptSource({ bucket: 'team-prompts', region: 'us-east-1' }),
  ],
});
await pupt.init();
```

### Config-Driven Usage (Package References)

Use `{ source, config }` objects in config files where class instances cannot be serialized:

```json
{
  "modules": [
    "pupt-sde",
    { "source": "pupt-source-s3", "config": { "bucket": "team-prompts", "region": "us-east-1" } }
  ]
}
```

pupt-lib dynamically imports the `source` package and instantiates its default export with the `config`. Then it calls `getPrompts()` like any other source.

## Built-In Sources Use the Same Interface

The built-in sources implement the same `PromptSource` interface. When the module loader encounters a `ResolvedModuleEntry` in the modules array, it routes by the `type` field to the appropriate built-in source and calls `getPrompts()` on it -- exactly as it does for custom sources.

This means:

- The interface is proven by real, production usage
- There are no special code paths for built-in sources
- Custom sources are first-class, not second-class plugins

## Another Example: REST API Source

```typescript
import type { PromptSource, DiscoveredPromptFile } from 'pupt-lib';

export default class RestApiSource implements PromptSource {
  private url: string;
  private headers: Record<string, string>;

  constructor(config: { url: string; apiKey?: string }) {
    this.url = config.url;
    this.headers = config.apiKey
      ? { 'Authorization': `Bearer ${config.apiKey}` }
      : {};
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const response = await fetch(this.url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: ${response.status}`);
    }

    const data = await response.json() as Array<{ name: string; content: string }>;
    return data.map(item => ({
      filename: `${item.name}.prompt`,
      content: item.content,
    }));
  }
}
```

## Type Guard

You can check if an object implements `PromptSource` using the `isPromptSource` type guard:

```typescript
import { isPromptSource } from 'pupt-lib';

if (isPromptSource(maybeSource)) {
  const prompts = await maybeSource.getPrompts();
}
```

This uses duck-typing: it checks for the presence of a `getPrompts` method.

## What to Learn Next

- [Prompt Sources](/modules/prompt-sources) -- How the built-in sources work
- [Publishing](/modules/publishing) -- Package and share prompts
- [Prompts vs. Components](/modules/prompts-vs-components) -- Understand the two concepts
