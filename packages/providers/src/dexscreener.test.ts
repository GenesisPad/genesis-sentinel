import { afterEach, describe, expect, it, vi } from "vitest";
import { createDexScreenerMarketDataProvider } from "./dexscreener.js";

const config = { chainId: 4663, networkSlug: "robinhood" };
const tokenAddress = "0x0000000000000000000000000000000000000001" as const;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("createDexScreenerMarketDataProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for a chain it does not support", async () => {
    const provider = createDexScreenerMarketDataProvider(config);
    const result = await provider.getMarketProfile({ chainId: 1, address: tokenAddress });
    expect(result).toBeNull();
  });

  it("selects the pair with the highest liquidity", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        {
          baseToken: { address: tokenAddress, name: "Low Liquidity Pool", symbol: "TOK" },
          liquidity: { usd: 100 },
          priceUsd: "1"
        },
        {
          baseToken: { address: tokenAddress, name: "Token", symbol: "TOK" },
          liquidity: { usd: 50000 },
          priceUsd: "1.5",
          marketCap: 1000000,
          volume: { h24: 20000 },
          pairCreatedAt: 1_700_000_000_000
        }
      ])
    );

    const provider = createDexScreenerMarketDataProvider(config);
    const result = await provider.getMarketProfile({ chainId: 4663, address: tokenAddress });

    expect(result?.name).toBe("Token");
    expect(result?.priceUsd).toBe("1.5");
    expect(result?.marketCapUsd).toBe("1000000");
    expect(result?.volume24hUsd).toBe("20000");
    expect(result?.pairCreatedAt).toEqual(new Date(1_700_000_000_000));
  });

  it("returns null when no pairs are returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
    const provider = createDexScreenerMarketDataProvider(config);
    const result = await provider.getMarketProfile({ chainId: 4663, address: tokenAddress });
    expect(result).toBeNull();
  });
});
