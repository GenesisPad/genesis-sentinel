import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlockscoutContractSourceProvider, createBlockscoutHolderProvider } from "./blockscout.js";

const config = {
  chainId: 4663,
  apiBaseUrl: "https://example.blockscout.com/api/v2",
  legacyApiBaseUrl: "https://example.blockscout.com/api"
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("createBlockscoutContractSourceProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not support a chain it is not configured for", () => {
    const provider = createBlockscoutContractSourceProvider(config);
    expect(provider.supports(1)).toBe(false);
    expect(provider.supports(4663)).toBe(true);
  });

  it("returns UNAVAILABLE verification for a chain it does not support", async () => {
    const provider = createBlockscoutContractSourceProvider(config);
    const result = await provider.getVerification({
      chainId: 1,
      address: "0x0000000000000000000000000000000000000001"
    });
    expect(result).toEqual({ status: "UNAVAILABLE", provider: "blockscout" });
  });

  it("parses a verified single-file source payload", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          result: [
            {
              ContractName: "Token",
              CompilerVersion: "v0.8.20",
              Language: "Solidity",
              ABI: "[]",
              SourceCode: "contract Token {}"
            }
          ]
        })
      )
    );

    const provider = createBlockscoutContractSourceProvider(config);
    const address = "0x0000000000000000000000000000000000000001" as const;
    const verification = await provider.getVerification({ chainId: 4663, address });
    const source = await provider.getSource({ chainId: 4663, address });

    expect(verification.status).toBe("VERIFIED");
    expect(verification.contractName).toBe("Token");
    expect(source?.sourceFiles).toEqual([{ filename: "Token", sourceCode: "contract Token {}" }]);
  });

  it("parses a verified multi-file standard-json-input payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        result: [
          {
            ContractName: "Token",
            SourceCode: `{{"sources":{"Token.sol":{"content":"contract Token {}"},"Lib.sol":{"content":"library Lib {}"}}}}`
          }
        ]
      })
    );

    const provider = createBlockscoutContractSourceProvider(config);
    const address = "0x0000000000000000000000000000000000000001" as const;
    const source = await provider.getSource({ chainId: 4663, address });

    expect(source?.sourceFiles).toHaveLength(2);
    expect(source?.sourceFiles.map((file) => file.filename).sort()).toEqual([
      "Lib.sol",
      "Token.sol"
    ]);
  });

  it("returns UNVERIFIED for a malformed/empty source payload", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(jsonResponse({ result: [{}] }))
    );

    const provider = createBlockscoutContractSourceProvider(config);
    const address = "0x0000000000000000000000000000000000000001" as const;
    const verification = await provider.getVerification({ chainId: 4663, address });
    const source = await provider.getSource({ chainId: 4663, address });

    expect(verification.status).toBe("UNVERIFIED");
    expect(source).toBeNull();
  });

  it("returns UNAVAILABLE verification when the request rejects (timeout/network error)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network timeout"));

    const provider = createBlockscoutContractSourceProvider(config);
    const result = await provider.getVerification({
      chainId: 4663,
      address: "0x0000000000000000000000000000000000000001"
    });

    expect(result).toEqual({ status: "UNAVAILABLE", provider: "blockscout" });
  });

  it("detects a proxy implementation address", async () => {
    const implementationAddress = `0x${"0".repeat(37)}abc` as const;
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ implementations: [{ address: implementationAddress, name: "TokenImpl" }] })
      )
    );

    const provider = createBlockscoutContractSourceProvider(config);
    const result = await provider.getImplementation?.({
      chainId: 4663,
      address: "0x0000000000000000000000000000000000000001"
    });

    expect(result).toEqual({ implementationAddress, proxyPattern: "UNKNOWN" });
  });

  it("returns null implementation for a non-proxy contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ implementations: [] }));

    const provider = createBlockscoutContractSourceProvider(config);
    const result = await provider.getImplementation?.({
      chainId: 4663,
      address: "0x0000000000000000000000000000000000000001"
    });

    expect(result).toBeNull();
  });
});

describe("createBlockscoutHolderProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const holderAddress = "0x0000000000000000000000000000000000000001" as const;
  const lockerAddress = `0x${"0".repeat(38)}ad` as const;
  const otherHolderAddress = `0x${"0".repeat(38)}02` as const;

  it("labels a known locker address and excludes it from adjusted concentration but includes it in raw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        items: [
          {
            address: { hash: lockerAddress, is_contract: true },
            value: "600"
          },
          {
            address: { hash: otherHolderAddress, is_contract: false },
            value: "400"
          }
        ]
      })
    );

    const provider = createBlockscoutHolderProvider(config, {
      knownLockerAddresses: [lockerAddress]
    });
    const result = await provider.getHolderSnapshot({
      chainId: 4663,
      address: holderAddress,
      totalSupply: "1000"
    });

    const lockerRow = result?.topHolders.find(
      (holder) => holder.address.toLowerCase() === lockerAddress.toLowerCase()
    );
    expect(lockerRow?.labels).toContain("LOCKER");
    // Adjusted top1 excludes the locker (a contract), leaving only the 400 EOA balance = 40%.
    expect(result?.concentration.top1Pct).toBe(40);
    // Raw top1 includes the locker's larger 600 balance = 60%.
    expect(result?.concentration.rawConcentration.top1Pct).toBe(60);
    expect(result?.concentration.lockerPct).toBe(60);
  });

  it("computes top20Pct alongside the existing top1/5/10 figures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        items: Array.from({ length: 25 }, (_, index) => ({
          address: {
            hash: `0x${"0".repeat(37)}${(index + 1).toString().padStart(3, "0")}`,
            is_contract: false
          },
          value: "40"
        }))
      })
    );

    const provider = createBlockscoutHolderProvider(config);
    const result = await provider.getHolderSnapshot({
      chainId: 4663,
      address: holderAddress,
      totalSupply: "1000"
    });

    expect(result?.concentration.top20Pct).toBeCloseTo(80, 5);
    expect(result?.concentration.rawConcentration.top20Pct).toBeCloseTo(80, 5);
  });
});
