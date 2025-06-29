import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SegmentedControl } from "./screens/SegmentedControl";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SegmentedControl />
  </StrictMode>,
);
