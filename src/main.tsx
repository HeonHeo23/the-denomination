import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { exampleScenario } from "./scenarios/example";

const scenarioCatalog = [
  { contentVersion: 2, content: exampleScenario },
] as const;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App catalog={scenarioCatalog} />
  </StrictMode>,
);
