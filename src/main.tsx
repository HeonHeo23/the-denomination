import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { exampleScenario } from "./scenarios/example";
import { strasbourgScenario } from "./scenarios/strasbourg";

const scenarioCatalog = [
  { contentVersion: 4, content: exampleScenario },
  { contentVersion: 2, content: strasbourgScenario },
] as const;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App catalog={scenarioCatalog} />
  </StrictMode>,
);
