# Data Tags

Data tags embed code snippets, files, and structured data into your prompt. Use them when you need the AI to work with specific content.

## Code

Wraps a code snippet in a labeled code block so the AI can distinguish it from the rest of your prompt.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `language` | `string` | `""` | Programming language (e.g., `"python"`, `"typescript"`) |
| `filename` | `string` | — | Optional filename for additional context |

### Examples

**Basic code block:**

```xml
<Code language="python">
def hello():
    print("Hello, world!")
</Code>
```

Output:

````
```python
def hello():
    print("Hello, world!")
```
````

**With a filename:**

```xml
<Code language="typescript" filename="app.ts">
const app = express();
app.listen(3000);
</Code>
```

Output:

````
<!-- app.ts -->
```typescript
const app = express();
app.listen(3000);
```
````

When you include a `filename`, it appears as a comment above the code block. This gives the AI extra context about where the code comes from.

---

## Data

Wraps a named data section in your prompt. Use this when you need to include structured information that isn't code.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | *(required)* | Name for the data section |
| `format` | `'json'` \| `'xml'` \| `'text'` \| `'csv'` | `"text"` | Data format hint |

### Examples

**Plain data:**

```xml
<Data name="user-info">
Name: Alice
Role: Admin
</Data>
```

Output:

```
<data name="user-info" format="text">
Name: Alice
Role: Admin
</data>
```

Because the default format is `"text"`, the output always includes a `format` attribute even when you don't set one explicitly.

---

## File

Reads a file from your computer and embeds its contents directly in the prompt. The file is read each time you run the prompt, so the output always reflects the latest version.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `path` | `string` | *(required)* | Path to the file |
| `language` | `string` | *auto-detected* | Language label for the code block |
| `encoding` | `string` | `"utf-8"` | File encoding |

If you don't set `language`, it is detected automatically from the file extension. Common extensions like `.ts`, `.py`, `.json`, `.md`, `.html`, and many more are recognized. You can always override the detected language by setting it explicitly.

The output includes the filename as a comment above a code block, just like the `<Code>` tag with a `filename`.

### Examples

```xml
<File path="./config.json" />
```

Output (assuming `config.json` contains `{"debug": true}`):

````
<!-- config.json -->
```json
{"debug": true}
```
````

::: tip
In `.prompt` files, you can give the file a `name` to create a variable that you can reference elsewhere in the prompt.
:::

---

## Json

Formats its content as JSON inside a labeled code block.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `indent` | `number` | `2` | Number of spaces for indentation |

### Examples

::: tip
The `<Json>` tag expects content that is already valid JSON text. Because curly braces `{}` in `.prompt` files are interpreted as expressions, you'll typically use the `<Json>` tag in `.tsx` files or pass JSON through a variable.
:::

---

## Xml

Wraps content in XML tags inside a labeled code block. You can set the outer tag name with `root`.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `root` | `string` | `"data"` | Root tag name |

### Examples

```xml
<Xml root="config">
  value
</Xml>
```

Output:

````
```xml
<config>
value
</config>
```
````

If you omit `root`, it defaults to `"data"`.

---

## Related

- [Structural Tags](/components/structural) -- for organizing prompt structure
- [Writing Your First Prompt](/guide/first-prompt) -- tutorial covering all building blocks
