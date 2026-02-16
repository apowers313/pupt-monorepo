import { AppShell, Drawer, Grid } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Header } from "./Header";
import { PromptInput } from "./PromptInput";
import { PromptOutput } from "./PromptOutput";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { ModuleImport } from "./ModuleImport";

export function Layout() {
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Header onSettingsClick={openSettings} onImportClick={openImport} />
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
        opened={settingsOpened}
        onClose={closeSettings}
        position="right"
        size="sm"
        title="Environment"
      >
        <EnvironmentPanel />
      </Drawer>
      <ModuleImport opened={importOpened} onClose={closeImport} />
    </AppShell>
  );
}
