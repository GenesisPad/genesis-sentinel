import { describe, expect, it } from "vitest";
import {
  assertRiskScore,
  createHealth,
  createScanId,
  liquidityHealthTier,
  normalizeEvmAddress,
  scannerVersion,
  selectPrimaryLiquidityPool,
  type LiquidityPoolView
} from "./index.js";

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

describe("liquidityHealthTier", () => {
  it("flags negligible absolute liquidity as low even with no market cap to compute a ratio", () => {
    // Reproduces $UHOOD's real drained pool: $0.175 total liquidity, no market cap data.
    expect(liquidityHealthTier(0.175, null, null)).toBe("low");
  });

  it("returns null when liquidity isn't negligible but no market cap exists to rank it", () => {
    expect(liquidityHealthTier(10_000, null, null)).toBeNull();
  });

  it("applies stricter thresholds to an ultra-low-cap token than a $5M+ token", () => {
    expect(liquidityHealthTier(12_000, 15, 80_000)).toBe("medium");
    expect(liquidityHealthTier(750_000, 15, 10_000_000)).toBe("healthy");
  });
});

describe("selectPrimaryLiquidityPool", () => {
  it("picks the pool with the highest real liquidity, not the first in the list", () => {
    // Reproduces $CASHCAT's real pools: pool 0 was near-empty, the real pool held $2.7M.
    const pools: LiquidityPoolView[] = [
      {
        chainId: 4663,
        tokenAddress: "0x1111111111111111111111111111111111111111",
        poolAddress: "0x1111111111111111111111111111111111111111",
        liquidityData: { totalLiquidityUsd: 0.0000000000000037 }
      },
      {
        chainId: 4663,
        tokenAddress: "0x1111111111111111111111111111111111111111",
        poolAddress: "0x2222222222222222222222222222222222222222",
        liquidityData: { totalLiquidityUsd: 2_712_302.89 }
      }
    ];

    expect(selectPrimaryLiquidityPool(pools)?.poolAddress).toBe(
      "0x2222222222222222222222222222222222222222"
    );
  });

  it("returns undefined for an empty pool list", () => {
    expect(selectPrimaryLiquidityPool([])).toBeUndefined();
  });
});
