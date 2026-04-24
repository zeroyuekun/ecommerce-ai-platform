import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FreshStartButton } from "@/components/app/chat/FreshStartButton";

describe("FreshStartButton", () => {
  it("renders nothing when turnCount is below the threshold", () => {
    const { container } = render(
      <FreshStartButton turnCount={4} onReset={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a button when turnCount >= threshold", () => {
    render(<FreshStartButton turnCount={10} onReset={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /fresh start|new conversation/i }),
    ).toBeInTheDocument();
  });

  it("invokes onReset on click", async () => {
    const onReset = vi.fn();
    render(<FreshStartButton turnCount={10} onReset={onReset} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
