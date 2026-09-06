import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { exampleScenario } from "./scenarios/example";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App content={exampleScenario} />
  </StrictMode>,
);
