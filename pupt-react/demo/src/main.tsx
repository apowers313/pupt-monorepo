import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import "./styles/global.css";
import { App } from "./App";

// Polyfill crypto.randomUUID for non-secure contexts (e.g., HTTP dev server)
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  crypto.randomUUID = () =>
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
        +c ^
        (crypto.getRandomValues(new Uint8Array(1))[0]! & (15 >> (+c / 4)))
      ).toString(16),
    ) as `${string}-${string}-${string}-${string}-${string}`;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
