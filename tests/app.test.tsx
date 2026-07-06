import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  it("renders the terminal app frame and calculation controls", () => {
    const view = render(<App />);

    expect(view.getByText(/SUN\/MOON ASTRO TERMINAL/i)).toBeInTheDocument();
    expect(view.getByRole("button", { name: /analyze night/i })).toBeInTheDocument();
    expect(view.getByText(/\[Control panel\]|\[Kontrollpanel\]/i)).toBeInTheDocument();
  });
});
