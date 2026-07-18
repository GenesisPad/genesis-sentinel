import { describe, expect, it } from "vitest";
import { assertRiskScore, createHealth, createScanId, normalizeEvmAddress, scannerVersion } from "./index.js";

describe("shared foundation contracts", () => {
  it("creates stable service health metadata", () => {
    const health = createHealth("api");

    expect(health.status).toBe("ok");
    expect(health.service).toBe("api");
    expect(health.version).toBe(scannerVersion);
  });

  it("normalizes addresses in foundation scan ids", () => {
    expect(createScanId(4663, "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD", "request-1")).toContain(
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
  });

  it("normalizes EVM addresses for persistence keys", () => {
    expect(normalizeEvmAddress("0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD")).toBe(
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
  });

  it("rejects out-of-range risk scores", () => {
    expect(() => assertRiskScore(101)).toThrow("Risk score");
  });
});
