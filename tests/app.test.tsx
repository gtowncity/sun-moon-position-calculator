import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  it("renders the main tool and calculation controls", () => {
    const view = render(<App />);

    expect(view.getByRole("heading", { level: 1, name: /position tool|positionsrechner/i })).toBeInTheDocument();
    expect(view.getByRole("button", { name: /calculate|berechnen/i })).toBeInTheDocument();
    expect(view.getByRole("region", { name: /range explorer|zeitraum-auswahl/i })).toBeInTheDocument();
  });
});
