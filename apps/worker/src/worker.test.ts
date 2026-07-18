import { describe, expect, it } from "vitest";
import { scannerVersion } from "@genesis-sentinel/shared";

describe("worker foundation", () => {
  it("uses the shared scanner version", () => {
    expect(scannerVersion).toBe("0.1.0-foundation");
  });
});
