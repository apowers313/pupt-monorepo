import { Button, Menu, Text, Group } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { EXAMPLES, type ExampleFormat } from "../data/examples";

interface ExamplePickerProps {
  onSelect: (source: string, format: ExampleFormat) => void;
}

export function ExamplePicker({ onSelect }: ExamplePickerProps) {
  return (
    <Menu shadow="md" width={320}>
      <Menu.Target>
        <Button
          variant="default"
          size="xs"
          rightSection={<IconChevronDown size={14} />}
        >
          Examples
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {EXAMPLES.map((example) => (
          <Menu.Item
            key={example.name}
            onClick={() => onSelect(example.source, example.format)}
          >
            <Group gap={4} wrap="nowrap">
              <div>
                <Text size="sm" fw={500}>
                  {example.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {example.description}
                </Text>
              </div>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
