import { Group, Title, ActionIcon } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={3}>JSX Prompt Demo</Title>
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label="Environment settings"
          onClick={onSettingsClick}
        >
          <IconSettings size={22} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
