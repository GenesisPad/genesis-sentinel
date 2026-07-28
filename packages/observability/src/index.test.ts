import { describe, expect, it } from "vitest";
import { createLogger, redactRpcCredentials } from "./index.js";

describe("observability", () => {
  it("creates a logger with the configured level", () => {
    const logger = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" }, "test");

    expect(logger.level).toBe("silent");
  });

  it("redacts Dwellir URL-path credentials from nested RPC errors", () => {
    expect(
      redactRpcCredentials({
        details: "request failed",
        metaMessages: [
          "URL: https://api-robinhood-mainnet-archive.n.dwellir.com/secret-key-123",
          "URL: https://api-stable-mainnet.n.dwellir.com/another-key?batch=1"
        ]
      })
    ).toEqual({
      details: "request failed",
      metaMessages: [
        "URL: https://api-robinhood-mainnet-archive.n.dwellir.com/[redacted]",
        "URL: https://api-stable-mainnet.n.dwellir.com/[redacted]?batch=1"
      ]
    });
  });
});
