import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "@/components/shared/empty-state";
import { Wrench } from "lucide-react";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nothing here" description="Add your first item to get started." />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add your first item to get started.")).toBeInTheDocument();
  });

  it("renders an icon when provided", () => {
    const { container } = render(
      <EmptyState icon={Wrench} title="No repairs" />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("fires the action callback", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={<button onClick={onClick}>Start now</button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start now" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("hides the description block when not provided", () => {
    const { container } = render(<EmptyState title="Only a title" />);
    expect(screen.getByText("Only a title")).toBeInTheDocument();
    expect(container.querySelector("p.text-muted-foreground")).toBeNull();
  });
});
