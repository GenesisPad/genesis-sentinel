import { describe, expect, it } from "vitest";
import { loadEnv } from "./index.js";

describe("environment validation", () => {
  it("loads defaults for local development", () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(4000);
    expect(env.API_RATE_LIMIT_MAX).toBe(120);
    expect(env.WORKER_CONCURRENCY).toBe(2);
    expect(env.TELEGRAM_SCAN_COOLDOWN_SECONDS).toBe(0);
    expect(env.TELEGRAM_SCAN_BURST_LIMIT).toBe(30);
    expect(env.TELEGRAM_SCAN_BURST_WINDOW_SECONDS).toBe(300);
    expect(env.SIMULATION_FORK_ENABLED).toBe(false);
  });

  it("rejects invalid ports", () => {
    expect(() => loadEnv({ API_PORT: "70000" })).toThrow();
  });

  it("loads production runtime limits", () => {
    const env = loadEnv({
      API_RATE_LIMIT_MAX: "60",
      API_RATE_LIMIT_TIME_WINDOW: "30 seconds",
      WORKER_CONCURRENCY: "4",
      TELEGRAM_SCAN_COOLDOWN_SECONDS: "30",
      TELEGRAM_SCAN_BURST_LIMIT: "3",
      TELEGRAM_SCAN_BURST_WINDOW_SECONDS: "120"
    });

    expect(env.API_RATE_LIMIT_MAX).toBe(60);
    expect(env.API_RATE_LIMIT_TIME_WINDOW).toBe("30 seconds");
    expect(env.WORKER_CONCURRENCY).toBe(4);
    expect(env.TELEGRAM_SCAN_COOLDOWN_SECONDS).toBe(30);
    expect(env.TELEGRAM_SCAN_BURST_LIMIT).toBe(3);
    expect(env.TELEGRAM_SCAN_BURST_WINDOW_SECONDS).toBe(120);
  });

  it("loads fork simulation controls", () => {
    const env = loadEnv({
      SIMULATION_FORK_ENABLED: "true",
      SIMULATION_FORK_TIMEOUT_MS: "45000",
      SIMULATION_FORK_NATIVE_AMOUNT_WEI: "12345"
    });

    expect(env.SIMULATION_FORK_ENABLED).toBe(true);
    expect(env.SIMULATION_FORK_TIMEOUT_MS).toBe(45_000);
    expect(env.SIMULATION_FORK_NATIVE_AMOUNT_WEI).toBe("12345");
  });
});
