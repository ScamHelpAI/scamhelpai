import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "../popup/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Options root element #root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
