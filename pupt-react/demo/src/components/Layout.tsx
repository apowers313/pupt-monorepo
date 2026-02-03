import { AppShell, Grid } from "@mantine/core";
import { Header } from "./Header";
import { PromptInput } from "./PromptInput";
import { PromptOutput } from "./PromptOutput";

export function Layout() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Header />
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
    </AppShell>
  );
}
