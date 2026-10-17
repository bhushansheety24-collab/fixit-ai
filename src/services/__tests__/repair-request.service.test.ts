import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  sustainabilityRecord: { upsert: vi.fn() },
  repairRequest: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  itemAnalysis: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  repairProfessional: { findUnique: vi.fn() },
  review: { create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  createRepairRequest,
  createReview,
  updateRepairRequest,
} from "@/services/repair-request.service";
import { recordSustainabilityEvent } from "@/services/sustainability.service";
import { AppError } from "@/lib/api/response";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("duplicate / double action prevention", () => {
  it("records sustainability events idempotently via an upsert on analysisId", async () => {
    prismaMock.sustainabilityRecord.upsert.mockResolvedValue({ id: "s1" });

    await recordSustainabilityEvent({
      userId: "u1",
      analysisId: "a1",
      activityType: "REPAIR",
      category: "Electronics",
      actualRepairCost: 400,
      estimatedReplacementCost: 1000,
    });
    await recordSustainabilityEvent({
      userId: "u1",
      analysisId: "a1",
      activityType: "REPAIR",
      category: "Electronics",
      actualRepairCost: 400,
      estimatedReplacementCost: 1000,
    });

    expect(prismaMock.sustainabilityRecord.upsert).toHaveBeenCalledTimes(2);
    const firstArg = prismaMock.sustainabilityRecord.upsert.mock.calls[0][0];
    expect(firstArg.where).toEqual({ analysisId: "a1" });
    expect(firstArg.create.userId).toBe("u1");
  });

  it("rejects a second review of the same repair", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u1",
      status: "COMPLETED",
      professionalId: "p1",
      review: { id: "rev1" },
    });

    await expect(
      createReview("u1", "r1", { rating: 5, comment: "great" }),
    ).rejects.toMatchObject({ name: "AppError", code: "ALREADY_REVIEWED", status: 409 });
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("rejects reviewing a repair that is not completed", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u1",
      status: "IN_PROGRESS",
      professionalId: "p1",
      review: null,
    });

    await expect(createReview("u1", "r1", { rating: 4 })).rejects.toMatchObject({
      code: "NOT_COMPLETED",
      status: 409,
    });
  });
});

describe("ownership checks", () => {
  it("refuses to create a request for someone else's analysis", async () => {
    prismaMock.itemAnalysis.findFirst.mockResolvedValue(null);

    await expect(
      createRepairRequest("u1", {
        analysisId: "not-mine",
        professionalId: "p1",
        description: "fix it",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(prismaMock.itemAnalysis.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "not-mine", userId: "u1" } }),
    );
    expect(prismaMock.repairRequest.create).not.toHaveBeenCalled();
  });

  it("refuses to update a request the user does not own (non-admin)", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue(null);

    await expect(
      updateRepairRequest("u1", "r-someone-else", { status: "CANCELLED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("404s when creating a request for a missing professional", async () => {
    prismaMock.itemAnalysis.findFirst.mockResolvedValue({ id: "a1" });
    prismaMock.repairProfessional.findUnique.mockResolvedValue(null);

    await expect(
      createRepairRequest("u1", {
        analysisId: "a1",
        professionalId: "ghost",
        description: "fix it",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("server-side status transition enforcement", () => {
  it("rejects an illegal status jump with 409 INVALID_TRANSITION", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u1",
      status: "PENDING",
      statusHistory: [],
    });

    await expect(
      updateRepairRequest("u1", "r1", { status: "COMPLETED" }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION", status: 409 });
    expect(prismaMock.repairRequest.update).not.toHaveBeenCalled();
  });

  it("blocks non-admin users from advancing a request themselves", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u1",
      status: "PENDING",
      statusHistory: [],
    });

    await expect(
      updateRepairRequest("u1", "r1", { status: "QUOTE_PROVIDED" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("blocks non-admin cancellation once work has started", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u1",
      status: "IN_PROGRESS",
      statusHistory: [],
    });

    await expect(
      updateRepairRequest("u1", "r1", { status: "CANCELLED" }),
    ).rejects.toMatchObject({ code: "NOT_CANCELLABLE", status: 409 });
  });

  it("allows a user to cancel a pending request and appends status history", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u1",
      status: "PENDING",
      statusHistory: [{ status: "PENDING", at: "2026-01-01T00:00:00.000Z", by: "u1" }],
    });
    prismaMock.repairRequest.update.mockResolvedValue({ id: "r1" });

    await updateRepairRequest("u1", "r1", { status: "CANCELLED" });

    expect(prismaMock.repairRequest.update).toHaveBeenCalledTimes(1);
    const arg = prismaMock.repairRequest.update.mock.calls[0][0];
    expect(arg.data.status).toBe("CANCELLED");
    expect(arg.data.statusHistory).toHaveLength(2);
    expect(arg.data.statusHistory[1]).toMatchObject({ status: "CANCELLED", by: "u1" });
  });

  it("lets an admin perform any legal transition", async () => {
    prismaMock.repairRequest.findFirst.mockResolvedValue({
      id: "r1",
      userId: "u2",
      status: "ACCEPTED",
      statusHistory: [],
    });
    prismaMock.repairRequest.update.mockResolvedValue({ id: "r1" });

    await updateRepairRequest("admin", "r1", { status: "SCHEDULED" }, { isAdmin: true });

    expect(prismaMock.repairRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1" } }),
    );
    expect(prismaMock.repairRequest.update).toHaveBeenCalledTimes(1);
  });
});

describe("AppError shape", () => {
  it("carries status and machine-readable code", () => {
    const err = new AppError("nope", 409, "CONFLICT");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});
