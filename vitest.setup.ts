import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Without globals enabled, Testing Library cannot auto-register its cleanup.
afterEach(() => {
  cleanup();
});
