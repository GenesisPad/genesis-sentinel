import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlockscoutSourceProvider } from "./blockscout.js";

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

describe("createBlockscoutSourceProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns UNAVAILABLE for a chain it does not support", async () => {
    const provider = createBlockscoutSourceProvider(config);
    const result = await provider.getContractSource({
      chainId: 1,
      address: "0x0000000000000000000000000000000000000001"
    });
    expect(result).toEqual({
      status: "UNAVAILABLE",
      address: "0x0000000000000000000000000000000000000001",
      sourceFiles: []
    });
  });

  it("parses a verified single-file source payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
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
    );

    const provider = createBlockscoutSourceProvider(config);
    const result = await provider.getContractSource({
      chainId: 4663,
      address: "0x0000000000000000000000000000000000000001"
    });

    expect(result.status).toBe("VERIFIED");
    expect(result.contractName).toBe("Token");
    expect(result.sourceFiles).toEqual([{ filename: "Token", sourceCode: "contract Token {}" }]);
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

    const provider = createBlockscoutSourceProvider(config);
    const result = await provider.getContractSource({
      chainId: 4663,
      address: "0x0000000000000000000000000000000000000001"
    });

    expect(result.status).toBe("VERIFIED");
    expect(result.sourceFiles).toHaveLength(2);
    expect(result.sourceFiles.map((file) => file.filename).sort()).toEqual([
      "Lib.sol",
      "Token.sol"
    ]);
  });

  it("returns UNAVAILABLE for a malformed source payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: [{}] }));

    const provider = createBlockscoutSourceProvider(config);
    const result = await provider.getContractSource({
      chainId: 4663,
      address: "0x0000000000000000000000000000000000000001"
    });

    expect(result.status).toBe("UNAVAILABLE");
    expect(result.sourceFiles).toEqual([]);
  });
});
