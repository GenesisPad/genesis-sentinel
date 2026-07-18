import { describe, expect, it } from "vitest";
import {
  createRobinhoodChainAdapter,
  createViemChainAdapter,
  getRobinhoodChainConfig,
  parseRpcUrlList,
  resolveRpcUrls,
  robinhoodChainBlockscoutUrl,
  robinhoodChainPublicRpcUrl,
  type ChainConfig
} from "./index.js";

const mockChainConfig: ChainConfig = {
  chainId: 999,
  name: "Mock Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    primary: "http://localhost:8545",
    fallbacks: []
  },
  blockExplorers: [],
  productionNotes: []
};

describe("chain configuration", () => {
  it("parses comma-separated fallback RPC URLs", () => {
    expect(parseRpcUrlList(" https://one.example,https://two.example ,, ")).toEqual([
      "https://one.example",
      "https://two.example"
    ]);
  });

  it("encodes Robinhood Chain mainnet details from official docs", () => {
    const config = getRobinhoodChainConfig({
      ROBINHOOD_RPC_URL: undefined,
      ROBINHOOD_FALLBACK_RPC_URLS: ""
    });

    expect(config.chainId).toBe(4663);
    expect(config.nativeCurrency.symbol).toBe("ETH");
    expect(config.rpcUrls.publicDefault).toBe(robinhoodChainPublicRpcUrl);
    expect(config.blockExplorers[0]?.url).toBe(robinhoodChainBlockscoutUrl);
  });

  it("does not use public defaults unless explicitly allowed", () => {
    const config = getRobinhoodChainConfig({
      ROBINHOOD_RPC_URL: undefined,
      ROBINHOOD_FALLBACK_RPC_URLS: ""
    });

    expect(resolveRpcUrls(config)).toEqual([]);
    expect(resolveRpcUrls(config, { allowPublicDefault: true })).toEqual([
      robinhoodChainPublicRpcUrl
    ]);
  });

  it("requires configured RPC URLs by default", () => {
    expect(() =>
      createRobinhoodChainAdapter({
        ROBINHOOD_RPC_URL: undefined,
        ROBINHOOD_FALLBACK_RPC_URLS: ""
      })
    ).toThrow("No RPC URL configured");
  });
});

describe("viem adapter", () => {
  it("normalizes bytecode addresses and returns empty bytecode when absent", async () => {
    const calls: string[] = [];
    const adapter = createViemChainAdapter(mockChainConfig, {
      client: {
        async getBytecode(input: { address: `0x${string}` }) {
          await Promise.resolve();
          calls.push(input.address);
          return undefined;
        }
      } as never
    });

    await expect(
      adapter.getBytecode({ address: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD" })
    ).resolves.toBe("0x");
    expect(calls).toEqual(["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"]);
  });

  it("retrieves ERC-20 metadata without throwing when one field fails", async () => {
    const adapter = createViemChainAdapter(mockChainConfig, {
      client: {
        async readContract(input: { functionName: string }) {
          await Promise.resolve();
          if (input.functionName === "name") {
            return "Token";
          }
          if (input.functionName === "symbol") {
            return "TOK";
          }
          throw new Error("decimals unavailable");
        }
      } as never
    });

    await expect(
      adapter.getTokenMetadata("0x0000000000000000000000000000000000000001")
    ).resolves.toEqual({
      address: "0x0000000000000000000000000000000000000001",
      name: "Token",
      symbol: "TOK",
      decimals: null
    });
  });

  it("reads storage slots and normalizes an empty result to a zero-filled slot", async () => {
    const calls: unknown[] = [];
    const adapter = createViemChainAdapter(mockChainConfig, {
      client: {
        async getStorageAt(input: unknown) {
          await Promise.resolve();
          calls.push(input);
          return undefined;
        }
      } as never
    });

    await expect(
      adapter.getStorageAt({
        address: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD",
        slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bb"
      })
    ).resolves.toBe(`0x${"0".repeat(64)}`);
    expect(calls).toMatchObject([{ address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" }]);
  });

  it("runs raw eth_call through traceCall", async () => {
    const calls: unknown[] = [];
    const adapter = createViemChainAdapter(mockChainConfig, {
      client: {
        async call(input: unknown) {
          await Promise.resolve();
          calls.push(input);
          return { data: "0x1234" };
        }
      } as never
    });

    await expect(
      adapter.traceCall?.({
        from: "0x0000000000000000000000000000000000000002",
        to: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD",
        data: "0xabcdef",
        value: 1n,
        blockNumber: 123n
      })
    ).resolves.toEqual({ raw: "0x1234" });
    expect(calls).toMatchObject([
      {
        account: "0x0000000000000000000000000000000000000002",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        data: "0xabcdef",
        value: 1n,
        blockNumber: 123n
      }
    ]);
  });
});
