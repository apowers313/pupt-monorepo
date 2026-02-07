import { AppShell, Drawer, Grid } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Header } from "./Header";
import { PromptInput } from "./PromptInput";
import { PromptOutput } from "./PromptOutput";
import { EnvironmentPanel } from "./EnvironmentPanel";

export function Layout() {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Header onSettingsClick={open} />
      </AppShell.Header>
      <AppShell.Main>
        <Grid gutter="md" styles={{ inner: { height: "100%" } }}>
          <Grid.Col span={6} data-testid="left-panel">
            <PromptInput />
          </Grid.Col>
          <Grid.Col span={6} data-testid="right-panel">
            <PromptOutput />
          </Grid.Col>
        </Grid>
      </AppShell.Main>
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="sm"
        title="Environment"
      >
        <EnvironmentPanel />
      </Drawer>
    </AppShell>
  );
}
