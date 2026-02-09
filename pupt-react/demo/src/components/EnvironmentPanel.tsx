import {
  Stack,
  SimpleGrid,
  Text,
  TextInput,
  NumberInput,
  Select,
  Autocomplete,
  Divider,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type { EnvironmentContext } from "pupt-react";
import { useDemoContext } from "../context/DemoContext";

const MODEL_OPTIONS = [
  "claude-opus-4-6",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2.0-flash",
];

const PROVIDER_OPTIONS = [
  "anthropic",
  "openai",
  "google",
  "aws-bedrock",
  "azure",
];

const LANGUAGE_OPTIONS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "Shell",
  "SQL",
  "HTML",
  "CSS",
];

const FORMAT_OPTIONS = [
  { value: "unspecified", label: "unspecified" },
  { value: "xml", label: "xml" },
  { value: "markdown", label: "markdown" },
  { value: "json", label: "json" },
  { value: "text", label: "text" },
];

export function EnvironmentPanel() {
  const {
    environmentOverrides,
    setEnvironmentOverrides,
    runtimeSnapshot,
    refreshRuntime,
  } = useDemoContext();

  function updateOverrides(patch: Partial<EnvironmentContext>) {
    setEnvironmentOverrides({ ...environmentOverrides, ...patch });
  }

  const llm = environmentOverrides.llm ?? {};
  const output = environmentOverrides.output ?? {};
  const code = environmentOverrides.code ?? {};

  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">LLM</Text>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
        <Select
          label="Model"
          size="xs"
          searchable
          clearable
          data={MODEL_OPTIONS}
          value={llm.model ?? null}
          onChange={(v) => updateOverrides({ llm: { ...llm, model: v ?? undefined } })}
          nothingFoundMessage="Use as custom value"
          allowDeselect
        />
        <Select
          label="Provider"
          size="xs"
          searchable
          clearable
          data={PROVIDER_OPTIONS}
          value={llm.provider ?? null}
          onChange={(v) => updateOverrides({ llm: { ...llm, provider: v ?? undefined } })}
          nothingFoundMessage="Use as custom value"
          allowDeselect
        />
        <NumberInput
          label="Temperature"
          size="xs"
          step={0.1}
          min={0}
          max={2}
          decimalScale={2}
          value={llm.temperature ?? ""}
          onChange={(v) =>
            updateOverrides({
              llm: { ...llm, temperature: v === "" ? undefined : Number(v) },
            })
          }
        />
        <NumberInput
          label="Max Tokens"
          size="xs"
          min={1}
          value={llm.maxTokens ?? ""}
          onChange={(v) =>
            updateOverrides({
              llm: { ...llm, maxTokens: v === "" ? undefined : Number(v) },
            })
          }
        />
      </SimpleGrid>

      <Divider />

      <Text fw={600} size="sm">Output & Code</Text>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
        <Select
          label="Format"
          size="xs"
          data={FORMAT_OPTIONS}
          value={output.format ?? "unspecified"}
          onChange={(v) =>
            updateOverrides({
              output: {
                ...output,
                format: (v ?? "unspecified") as EnvironmentContext["output"]["format"],
              },
            })
          }
        />
        <Autocomplete
          label="Programming Language"
          size="xs"
          placeholder="Pick or type a language"
          data={LANGUAGE_OPTIONS}
          value={code.language ?? ""}
          onChange={(v) =>
            updateOverrides({
              code: {
                ...code,
                language: v || undefined,
              },
            })
          }
        />
      </SimpleGrid>

      <Divider />

      <Group justify="space-between">
        <Text fw={600} size="sm">Runtime (detected)</Text>
        <ActionIcon variant="subtle" size="sm" onClick={refreshRuntime} aria-label="Refresh runtime">
          <IconRefresh size={14} />
        </ActionIcon>
      </Group>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
        <TextInput label="Hostname" size="xs" readOnly value={runtimeSnapshot.hostname} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="Username" size="xs" readOnly value={runtimeSnapshot.username} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="Platform" size="xs" readOnly value={runtimeSnapshot.platform} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="OS" size="xs" readOnly value={runtimeSnapshot.os} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="Locale" size="xs" readOnly value={runtimeSnapshot.locale} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="Date" size="xs" readOnly value={runtimeSnapshot.date} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="Time" size="xs" readOnly value={runtimeSnapshot.time} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="CWD" size="xs" readOnly value={runtimeSnapshot.cwd} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="UUID" size="xs" readOnly value={runtimeSnapshot.uuid} styles={{ input: { opacity: 0.6 } }} />
        <TextInput label="Timestamp" size="xs" readOnly value={String(runtimeSnapshot.timestamp)} styles={{ input: { opacity: 0.6 } }} />
      </SimpleGrid>
    </Stack>
  );
}
