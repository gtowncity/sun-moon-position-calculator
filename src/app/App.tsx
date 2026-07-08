import { useState } from "react";

import { Win98ShellPrototype } from "../components/Win98ShellPrototype";
import { DsoPlannerPage } from "../dso/components/DsoPlannerPage";

type AppMode = "sunmoon" | "dso";

export function App() {
  const [mode, setMode] = useState<AppMode>("sunmoon");

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          display: "flex",
          gap: "8px",
          padding: "8px",
          background: "#111827",
          borderBottom: "1px solid #374151"
        }}
      >
        <button type="button" onClick={() => setMode("sunmoon")}>
          Sun / Moon Tool
        </button>
        <button type="button" onClick={() => setMode("dso")}>
          DSO Planner
        </button>
      </div>

      {mode === "sunmoon" ? <Win98ShellPrototype /> : <DsoPlannerPage />}
    </div>
  );
}