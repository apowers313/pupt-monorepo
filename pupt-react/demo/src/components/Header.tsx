import { Group, Title, ActionIcon } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";

export function Header() {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={3}>pupt-react Demo</Title>
      <ActionIcon
        component="a"
        href="https://github.com/apowers313/pupt-react"
        target="_blank"
        rel="noopener noreferrer"
        variant="subtle"
        size="lg"
        aria-label="GitHub"
      >
        <IconBrandGithub size={22} />
      </ActionIcon>
    </Group>
  );
}
