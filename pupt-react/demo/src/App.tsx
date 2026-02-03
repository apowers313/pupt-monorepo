import { MantineProvider } from "@mantine/core";
import { PuptProvider } from "pupt-react";
import { theme } from "./theme";
import { Layout } from "./components";
import { DemoProvider } from "./context/DemoContext";

export function App() {
  return (
    <MantineProvider theme={theme}>
      <PuptProvider>
        <DemoProvider>
          <Layout />
        </DemoProvider>
      </PuptProvider>
    </MantineProvider>
  );
}
