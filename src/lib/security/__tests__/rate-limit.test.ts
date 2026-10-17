import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/security/rate-limit";

describe("in-memory rate limiter fallback", () => {
  it("allows up to the limit, then blocks", async () => {
    const key = `test-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await rateLimit(key, 3, 60_000));
    }

    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true);
    expect(results[2].remaining).toBe(0);
    expect(results.slice(3).every((r) => !r.allowed)).toBe(true);
    expect(results.every((r) => r.resetAt > Date.now())).toBe(true);
  });

  it("uses independent keys", async () => {
    const a = `test-${Math.random()}-a`;
    const b = `test-${Math.random()}-b`;
    await rateLimit(a, 1, 60_000);
    const secondOnA = await rateLimit(a, 1, 60_000);
    const firstOnB = await rateLimit(b, 1, 60_000);

    expect(secondOnA.allowed).toBe(false);
    expect(firstOnB.allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = `test-${Math.random()}`;
    await rateLimit(key, 1, 30);
    expect((await rateLimit(key, 1, 30)).allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 40));
    expect((await rateLimit(key, 1, 30)).allowed).toBe(true);
  });
});
