import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { Win98AstroShellPrototype } from "./components/win98";
import "./styles.css";
import "./components/win98/win98Prototype.css";

const showPrototype = new URLSearchParams(window.location.search).get("prototype") === "win98";
const RootComponent = showPrototype ? Win98AstroShellPrototype : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
