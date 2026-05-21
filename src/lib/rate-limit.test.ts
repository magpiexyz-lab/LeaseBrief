import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, clientIpFromHeaders } from "./rate-limit";

// Each test uses a unique key to avoid cross-test state in the module-level Map.
// We also use `vi.useFakeTimers()` for the window-reset test so it's deterministic.

describe("rateLimit()", () => {
  it("allows the first request and reports remaining = limit - 1", () => {
    const result = rateLimit("test-key-allow-1", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows up to `limit` requests within the window", () => {
    const key = "test-key-burst";
    const results = [
      rateLimit(key, { limit: 3, windowMs: 60_000 }),
      rateLimit(key, { limit: 3, windowMs: 60_000 }),
      rateLimit(key, { limit: 3, windowMs: 60_000 }),
    ];
    expect(results.every((r) => r.success)).toBe(true);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0]);
  });

  it("denies the (N+1)th request with success=false and remaining=0", () => {
    const key = "test-key-deny";
    rateLimit(key, { limit: 2, windowMs: 60_000 });
    rateLimit(key, { limit: 2, windowMs: 60_000 });
    const fourth = rateLimit(key, { limit: 2, windowMs: 60_000 });
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("continues to deny subsequent requests within the same window", () => {
    const key = "test-key-deny-sustained";
    const limit = 2;
    rateLimit(key, { limit, windowMs: 60_000 });
    rateLimit(key, { limit, windowMs: 60_000 });
    const blocked1 = rateLimit(key, { limit, windowMs: 60_000 });
    const blocked2 = rateLimit(key, { limit, windowMs: 60_000 });
    expect(blocked1.success).toBe(false);
    expect(blocked2.success).toBe(false);
  });

  describe("window reset", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resets and allows a new request after the window elapses", () => {
      const key = "test-key-reset";
      const limit = 2;
      const windowMs = 60_000;

      // Pin time at t=0.
      vi.setSystemTime(new Date(0));
      rateLimit(key, { limit, windowMs });
      rateLimit(key, { limit, windowMs });
      const blocked = rateLimit(key, { limit, windowMs });
      expect(blocked.success).toBe(false);

      // Advance just past the window. A request now must succeed and reset
      // the remaining counter to limit - 1.
      vi.setSystemTime(new Date(windowMs + 1));
      const fresh = rateLimit(key, { limit, windowMs });
      expect(fresh.success).toBe(true);
      expect(fresh.remaining).toBe(limit - 1);
    });

    it("does NOT reset before the window elapses", () => {
      const key = "test-key-no-early-reset";
      const limit = 1;
      const windowMs = 60_000;

      vi.setSystemTime(new Date(0));
      rateLimit(key, { limit, windowMs });

      vi.setSystemTime(new Date(windowMs - 1));
      const blocked = rateLimit(key, { limit, windowMs });
      expect(blocked.success).toBe(false);
    });
  });

  it("uses default limit=10 and windowMs=60_000 when options omitted", () => {
    const key = "test-key-defaults";
    let last: { success: boolean; remaining: number } | undefined;
    for (let i = 0; i < 10; i++) {
      last = rateLimit(key);
    }
    expect(last?.success).toBe(true);
    expect(last?.remaining).toBe(0);
    const blocked = rateLimit(key);
    expect(blocked.success).toBe(false);
  });

  it("keeps counters isolated per key", () => {
    const a = rateLimit("isolated-key-a", { limit: 1, windowMs: 60_000 });
    const b = rateLimit("isolated-key-b", { limit: 1, windowMs: 60_000 });
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
  });
});

describe("clientIpFromHeaders()", () => {
  it("returns the LAST (trusted proxy-appended) entry from x-forwarded-for", () => {
    // Vercel/proxy appends the verified client IP as the LAST entry. Entries
    // before it can be attacker-supplied and MUST NOT be used.
    const h = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1, 198.51.100.7",
    });
    expect(clientIpFromHeaders(h)).toBe("198.51.100.7");
  });

  it("trims surrounding whitespace from the last x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "10.0.0.1,   198.51.100.7   " });
    expect(clientIpFromHeaders(h)).toBe("198.51.100.7");
  });

  it("handles a single-entry x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "198.51.100.7" });
    expect(clientIpFromHeaders(h)).toBe("198.51.100.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.42" });
    expect(clientIpFromHeaders(h)).toBe("198.51.100.42");
  });

  it("returns 'unknown' when no IP header is present", () => {
    const h = new Headers();
    expect(clientIpFromHeaders(h)).toBe("unknown");
  });

  it("does NOT trust an attacker-supplied first x-forwarded-for entry (regression: header spoofing)", () => {
    // Attacker tries to inject a unique-per-request key to bypass per-IP caps.
    const h = new Headers({
      "x-forwarded-for": "1.2.3.4, 198.51.100.7",
    });
    // Must be the trusted proxy-appended IP (last), not the attacker value.
    expect(clientIpFromHeaders(h)).not.toBe("1.2.3.4");
    expect(clientIpFromHeaders(h)).toBe("198.51.100.7");
  });
});
