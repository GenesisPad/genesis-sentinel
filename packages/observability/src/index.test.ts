import { describe, expect, it } from "vitest";
import { createLogger } from "./index.js";

describe("observability", () => {
  it("creates a logger with the configured level", () => {
    const logger = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" }, "test");

    expect(logger.level).toBe("silent");
  });
});
