import { describe, expect, it } from "vitest";
import { checkRedis, parseRedisConnectionOptions, scanQueueName } from "./index.js";

describe("queue readiness", () => {
  it("exposes a redis dependency check", () => {
    expect(typeof checkRedis).toBe("function");
  });

  it("uses a stable scan queue name", () => {
    expect(scanQueueName).toBe("scan-orchestration");
  });

  it("parses redis URLs for BullMQ connection options", () => {
    expect(parseRedisConnectionOptions("redis://user:pass@localhost:6380")).toMatchObject({
      host: "localhost",
      port: 6380,
      username: "user",
      password: "pass"
    });
  });
});
