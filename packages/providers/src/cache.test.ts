import { describe, expect, it } from "vitest";
import { createCachedContractSourceProvider } from "./cache.js";
import type { ContractSourceProvider } from "./types.js";

const address = "0x0000000000000000000000000000000000000001" as const;

function countingProvider(id = "counting"): ContractSourceProvider & { calls: number } {
  const provider = {
    id,
    calls: 0,
    supports: () => true,
    getVerification: () => {
      provider.calls += 1;
      return Promise.resolve({
        status: "VERIFIED" as const,
        provider: "counting",
        contractName: `call-${provider.calls}`
      });
    },
    getSource: () => Promise.resolve(null),
    getAbi: () => Promise.resolve(null)
  };
  return provider;
}

describe("createCachedContractSourceProvider", () => {
  it("caches getVerification results for the same chain/address/bytecodeHash", async () => {
    const inner = countingProvider();
    const cached = createCachedContractSourceProvider(inner);

    const first = await cached.getVerification({ chainId: 1, address, bytecodeHash: "0xabc" });
    const second = await cached.getVerification({ chainId: 1, address, bytecodeHash: "0xabc" });

    expect(inner.calls).toBe(1);
    expect(first).toEqual(second);
  });

  it("invalidates the cache when the bytecode hash changes (contract upgrade)", async () => {
    const inner = countingProvider();
    const cached = createCachedContractSourceProvider(inner);

    await cached.getVerification({ chainId: 1, address, bytecodeHash: "0xabc" });
    await cached.getVerification({ chainId: 1, address, bytecodeHash: "0xdef" });

    expect(inner.calls).toBe(2);
  });

  it("does not share cache entries across different providers", async () => {
    const innerA = countingProvider("provider-a");
    const innerB = countingProvider("provider-b");

    const cachedA = createCachedContractSourceProvider(innerA);
    const cachedB = createCachedContractSourceProvider(innerB);

    await cachedA.getVerification({ chainId: 1, address, bytecodeHash: "0xabc" });
    await cachedB.getVerification({ chainId: 1, address, bytecodeHash: "0xabc" });

    expect(innerA.calls).toBe(1);
    expect(innerB.calls).toBe(1);
  });
});
