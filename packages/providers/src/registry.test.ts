import { stableChainId } from "@genesis-sentinel/chain-adapters";
import { describe, expect, it } from "vitest";
import { getProviderSet } from "./registry.js";
import { robinhoodChainId } from "./robinhood-liquidity.js";

describe("provider registry", () => {
  it("returns a full provider set for Robinhood Chain", () => {
    const providers = getProviderSet(robinhoodChainId);
    expect(providers).not.toBeNull();
    expect(providers?.source.supportsChain(robinhoodChainId)).toBe(true);
    expect(providers?.explorer.supportsChain(robinhoodChainId)).toBe(true);
    expect(providers?.market.supportsChain(robinhoodChainId)).toBe(true);
    expect(providers?.holder.supportsChain(robinhoodChainId)).toBe(true);
    expect(providers?.liquidity.supportsChain(robinhoodChainId)).toBe(true);
  });

  it("returns null for a chain with no wired providers", () => {
    expect(getProviderSet(1)).toBeNull();
  });

  it("reports liquidity coverage for Robinhood Chain", () => {
    const providers = getProviderSet(robinhoodChainId);
    const coverage = providers?.liquidity.describeCoverage();
    expect(coverage?.checkedDexes).toEqual(["Uniswap V3", "Uniswap V4", "Uniswap V2"]);
    expect(coverage?.checkedQuoteSymbols).toEqual(["WETH", "USDE", "USDG"]);
  });

  it("wires dev-cluster wallet clustering for Stable Chain, not just Robinhood", () => {
    const providers = getProviderSet(stableChainId);
    expect(providers).not.toBeNull();
    expect(providers?.walletClustering).toBeDefined();
    expect(providers?.walletClustering?.supportsChain(stableChainId)).toBe(true);
  });
});
