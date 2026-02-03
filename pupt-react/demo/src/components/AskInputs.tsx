import {
  SimpleGrid,
  TextInput,
  NumberInput,
  Switch,
  Select,
  MultiSelect,
  PasswordInput,
  Slider,
  Textarea,
  Text,
} from "@mantine/core";
import type { InputRequirement } from "pupt-react";

interface AskInputsProps {
  requirements: InputRequirement[];
  values: Map<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

function renderInput(
  req: InputRequirement,
  value: unknown,
  onChange: (name: string, value: unknown) => void,
) {
  const common = {
    key: req.name,
    label: req.label || req.name,
    required: req.required,
    size: "xs" as const,
  };

  switch (req.type) {
    case "string":
      return (
        <TextInput
          {...common}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(req.name, e.currentTarget.value)}
        />
      );

    case "number":
      return (
        <NumberInput
          {...common}
          value={(value as number) ?? ""}
          min={req.min}
          max={req.max}
          onChange={(v) => onChange(req.name, v)}
        />
      );

    case "boolean":
      return (
        <Switch
          {...common}
          checked={(value as boolean) ?? false}
          onChange={(e) => onChange(req.name, e.currentTarget.checked)}
        />
      );

    case "select":
      return (
        <Select
          {...common}
          value={(value as string) ?? null}
          data={
            req.options?.map((o) => ({ value: o.value, label: o.label })) ?? []
          }
          onChange={(v) => onChange(req.name, v)}
        />
      );

    case "multiselect":
      return (
        <MultiSelect
          {...common}
          value={(value as string[]) ?? []}
          data={
            req.options?.map((o) => ({ value: o.value, label: o.label })) ?? []
          }
          onChange={(v) => onChange(req.name, v)}
        />
      );

    case "secret":
      return (
        <PasswordInput
          {...common}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(req.name, e.currentTarget.value)}
        />
      );

    case "date":
      return (
        <TextInput
          {...common}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(req.name, e.currentTarget.value)}
        />
      );

    case "rating":
      return (
        <div key={req.name}>
          <Text size="xs" fw={500} mb={2}>{common.label}</Text>
          <Slider
            size="xs"
            min={req.min ?? 1}
            max={req.max ?? 5}
            value={(value as number) ?? req.min ?? 1}
            onChange={(v) => onChange(req.name, v)}
            marks={Array.from(
              { length: (req.max ?? 5) - (req.min ?? 1) + 1 },
              (_, i) => ({
                value: (req.min ?? 1) + i,
                label: String((req.min ?? 1) + i),
              }),
            )}
          />
        </div>
      );

    case "file":
    case "path":
      return (
        <TextInput
          {...common}
          value={(value as string) ?? ""}
          placeholder={
            req.type === "file" ? "File path..." : "Directory path..."
          }
          onChange={(e) => onChange(req.name, e.currentTarget.value)}
        />
      );

    case "object":
    case "array":
      return (
        <Textarea
          {...common}
          value={(value as string) ?? ""}
          placeholder={`Enter ${req.type === "object" ? "JSON object" : "JSON array"}...`}
          minRows={2}
          onChange={(e) => onChange(req.name, e.currentTarget.value)}
        />
      );

    default:
      return (
        <TextInput
          {...common}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(req.name, e.currentTarget.value)}
        />
      );
  }
}

export function AskInputs({ requirements, values, onChange }: AskInputsProps) {
  if (requirements.length === 0) return null;

  return (
    <div>
      <Text size="xs" fw={600} mb={4}>Inputs</Text>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
        {requirements.map((req) => renderInput(req, values.get(req.name), onChange))}
      </SimpleGrid>
    </div>
  );
}
