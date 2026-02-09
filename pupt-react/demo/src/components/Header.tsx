import { Group, Title, ActionIcon } from "@mantine/core";
import { IconSettings, IconPackageImport } from "@tabler/icons-react";

interface HeaderProps {
  onSettingsClick: () => void;
  onImportClick: () => void;
}

export function Header({ onSettingsClick, onImportClick }: HeaderProps) {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={3}>JSX Prompt Demo</Title>
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label="Import library"
          onClick={onImportClick}
        >
          <IconPackageImport size={22} />
        </ActionIcon>
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
