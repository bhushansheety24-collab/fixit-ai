import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { canTransition, ALLOWED_TRANSITIONS } from "@/services/repair-request.service";
import type { RepairRequestStatus } from "@/lib/validation/schemas";
import { repairRequestStatuses } from "@/lib/validation/schemas";

describe("repair request status transitions", () => {
  it("allows the happy-path lifecycle", () => {
    expect(canTransition("PENDING", "QUOTE_PROVIDED")).toBe(true);
    expect(canTransition("QUOTE_PROVIDED", "ACCEPTED")).toBe(true);
    expect(canTransition("ACCEPTED", "SCHEDULED")).toBe(true);
    expect(canTransition("SCHEDULED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("treats COMPLETED and CANCELLED as terminal", () => {
    expect(ALLOWED_TRANSITIONS.COMPLETED).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toHaveLength(0);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
    expect(canTransition("COMPLETED", "COMPLETED")).toBe(false);
  });

  it("rejects skipping stages", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(false);
    expect(canTransition("ACCEPTED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("QUOTE_PROVIDED", "SCHEDULED")).toBe(false);
  });

  it("allows cancellation only before completion, from any active status", () => {
    const cancellable: RepairRequestStatus[] = [
      "PENDING",
      "QUOTE_PROVIDED",
      "ACCEPTED",
      "SCHEDULED",
      "IN_PROGRESS",
    ];
    for (const status of repairRequestStatuses) {
      expect(canTransition(status, "CANCELLED")).toBe(cancellable.includes(status));
    }
    // The service layer narrows this further for non-admin users: they can
    // only cancel while work has not started (USER_CANCELLABLE).
  });

  it("declares an entry for every status", () => {
    for (const status of repairRequestStatuses) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
      for (const target of ALLOWED_TRANSITIONS[status]) {
        expect(repairRequestStatuses).toContain(target);
      }
    }
  });
});
