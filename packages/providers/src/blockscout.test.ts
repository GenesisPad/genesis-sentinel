import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlockscoutContractSourceProvider } from "./blockscout.js";

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
