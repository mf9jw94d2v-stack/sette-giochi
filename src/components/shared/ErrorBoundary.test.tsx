import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ fail }: { fail: boolean }) {
  if (fail) throw new Error("esplosione di prova");
  return <p>contenuto</p>;
}

describe("ErrorBoundary", () => {
  it("renders its children when nothing goes wrong", () => {
    render(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("contenuto")).toBeInTheDocument();
  });

  it("shows a readable panel instead of a blank page when a child throws", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom fail={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /qualcosa è andato storto/i,
    );
    expect(
      screen.getByRole("button", { name: /riprova/i }),
    ).toBeInTheDocument();
    err.mockRestore();
  });

  it("recovers when the cause is gone and the player retries", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    function Harness() {
      const [fail, setFail] = useState(true);
      return (
        <>
          <button onClick={() => setFail(false)}>ripara</button>
          <ErrorBoundary>
            <Boom fail={fail} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ripara" }));
    await user.click(screen.getByRole("button", { name: /riprova/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("contenuto")).toBeInTheDocument();
    err.mockRestore();
  });

  it("uses a custom fallback when one is given", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={() => <p>fallback su misura</p>}>
        <Boom fail={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fallback su misura")).toBeInTheDocument();
    err.mockRestore();
  });
});
