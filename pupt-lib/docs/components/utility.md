# Utility Tags

Utility tags insert live values from your system into the prompt. They produce fresh output every time you run your prompt.

## UUID

Generates a random unique identifier (UUID v4). This is useful for giving each prompt run a trackable ID.

### Properties

None.

### Example

```xml
<Task>
  Process this request. Request ID: <UUID />
</Task>
```

Produces something like:

```
<task>
Process this request. Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
</task>
```

A new UUID is generated each time you run the prompt.

---

## DateTime

Outputs the current date and time. It defaults to ISO 8601 format, but you can customize it with a format string.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `format` | `string` | — | A format string using `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss` tokens. When omitted, output uses ISO 8601. |

### Examples

**Default (ISO 8601):**

```xml
Current time: <DateTime />
```

Produces something like:

```
Current time: 2026-02-13T16:58:22.540Z
```

**Custom format:**

```xml
Today's date: <DateTime format="YYYY-MM-DD" />
```

Produces something like:

```
Today's date: 2026-02-13
```

---

## Timestamp

Outputs the current Unix timestamp (in seconds).

### Properties

None.

### Example

```xml
Timestamp: <Timestamp />
```

Produces something like:

```
Timestamp: 1771001902
```

---

## Hostname

Outputs the hostname of the machine running the prompt.

### Properties

None.

### Example

```xml
Running on: <Hostname />
```

Produces something like:

```
Running on: my-laptop
```

---

## Username

Outputs the current system username.

### Properties

None.

### Example

```xml
User: <Username />
```

Produces something like:

```
User: alice
```

---

## Cwd

Outputs the current working directory.

### Properties

None.

### Example

```xml
Working directory: <Cwd />
```

Produces something like:

```
Working directory: /home/alice/my-project
```

---

## Putting Them Together

Utility tags shine when you want the AI to know about the environment it is running in. Combine several of them inside a `<Context>` tag, and the AI gets a full picture of when, where, and who is running the prompt -- without you typing any of that information by hand.

```xml
<Prompt name="context-aware" bare>
  <Context>
    Running on <Hostname /> as <Username />.
    Current time: <DateTime />.
    Working directory: <Cwd />.
    Request ID: <UUID />.
  </Context>
  <Task>Help the user with their project.</Task>
</Prompt>
```

---

## Related

- [Environment & Context](/guide/environment) — how pupt adapts to different AI providers
- [Tags Overview](/components/) — browse all available tags
