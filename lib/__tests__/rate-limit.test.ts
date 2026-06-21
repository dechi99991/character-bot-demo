import { describe, it, expect } from "vitest";
import { checkRateLimit, clearStore } from "../rate-limit";

describe("checkRateLimit", () => {
  it("first request passes", () => {
    const store = new Map();
    expect(checkRateLimit("1.2.3.4", store).ok).toBe(true);
  });

  it("20th request still passes", () => {
    const store = new Map();
    for (let i = 0; i < 19; i++) checkRateLimit("1.2.3.4", store);
    expect(checkRateLimit("1.2.3.4", store).ok).toBe(true);
  });

  it("21st request is blocked with retryAfterMs", () => {
    const store = new Map();
    for (let i = 0; i < 20; i++) checkRateLimit("1.2.3.4", store);
    const result = checkRateLimit("1.2.3.4", store);
    expect(result.ok).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("different IPs are independent", () => {
    const store = new Map();
    for (let i = 0; i < 20; i++) checkRateLimit("1.2.3.4", store);
    expect(checkRateLimit("5.6.7.8", store).ok).toBe(true);
  });
});
