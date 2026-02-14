# Environment & Context

When you run a prompt, pupt knows about the world around it -- which AI model you're using, what time it is, and what computer you're on. Your prompts can use this information to adapt automatically.

## How It Works

Pupt detects your environment when a prompt runs and shares that information with your tags. Some tags use it automatically. For example, the `<Prompt>` tag adjusts its output format based on the AI provider you're targeting.

You don't need to configure anything for this to work. Pupt picks up your environment from the `pt` command-line tool or from your project settings.

## Adapting to Different AI Providers

Different AI models respond better to different prompting styles. Pupt handles this for you. When you target Claude (Anthropic), prompts use XML-style formatting. When you target GPT-4 (OpenAI), prompts switch to markdown formatting. Each provider gets the style it works best with.

You can also write provider-specific sections yourself using the `<If>` tag:

```xml
<If provider="anthropic">
  Use XML tags to structure your response.
</If>

<If provider="openai">
  Use markdown headers to structure your response.
</If>
```

Only the matching section appears in the final prompt. See [Conditional Logic](/guide/conditional-logic) for more about the `<If>` tag.

### Supported Providers

Pupt recognizes these AI providers and detects them automatically from the model name. You don't need to specify the provider separately.

| Provider | Recognized Models |
|----------|-------------------|
| Anthropic | Claude, Opus, Sonnet, Haiku |
| OpenAI | GPT-4, GPT-3.5, ChatGPT, o1, o3, o4 |
| Google | Gemini |
| Meta | Llama |
| Mistral | Mistral, Mixtral, Codestral, Pixtral |
| DeepSeek | DeepSeek |
| xAI | Grok |
| Cohere | Command |

## Smart Defaults from `<Prompt>`

The `<Prompt>` tag uses the environment to generate sensible defaults. When you write:

```xml
<Prompt name="helper">
  <Task>Help the user with their question.</Task>
</Prompt>
```

Pupt automatically adds a **role** section with a helpful assistant persona, a **format** section suggesting the best output format for your AI provider, and a **constraints** section with general best practices. These defaults adapt based on your environment -- for example, the format section recommends XML for Anthropic models and markdown for OpenAI models.

You can override any of these by writing your own version of that tag. If you include your own `<Role>` tag, pupt skips the default one. You can also disable individual defaults with `noRole`, `noFormat`, or `noConstraints`, or turn off all defaults at once with `bare`.

## Live Values from Your System

Pupt provides utility tags that insert live values from your system:

```xml
<Task>
  Running on <Hostname /> as <Username />.
  Current time: <DateTime />.
  Request ID: <UUID />.
</Task>
```

This produces something like:

```
Running on my-laptop as alice.
Current time: 2025-06-15T14:30:00.
Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890.
```

Here are the available utility tags:

| Tag | What it produces |
|-----|-----------------|
| `<Hostname />` | Your computer's name |
| `<Username />` | Your username |
| `<DateTime />` | Current date and time |
| `<Timestamp />` | Unix timestamp (milliseconds) |
| `<UUID />` | A unique identifier |
| `<Cwd />` | Current working directory |

These values are fresh on every run. The `<UUID />` tag produces a different identifier each time. The `<Timestamp />` tag reflects the moment the prompt was built.

## Configuration

When you use pupt through the `pt` command-line tool, your environment is configured automatically based on the choices you make during `pt init`.

::: tip For Developers
If you're building tools with pupt-lib programmatically, you have full control over the environment through the `createEnvironment()` function and `render()` options. See the [Environment Reference](/developers/environment) for the complete API, including all configuration fields, provider adaptations, and type definitions.
:::

## What to Learn Next

You've completed the Guide! Here's where to go from here:

- [Tags Overview](/components/) -- Browse every tag available in pupt
- [Presets](/components/presets) -- See all built-in presets for roles, tasks, and more
- [Using Modules](/modules/using-modules) -- Import and reuse shared prompt libraries
- [Writing Custom Tags](/developers/first-component) -- Build your own tags (for developers)
