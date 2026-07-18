import { describe, expect, it } from "vitest";
import { createContractSourceChain } from "./contract-source-chain.js";
import type { ContractSourceProvider, ContractVerificationResult } from "./types.js";

const address = "0x0000000000000000000000000000000000000001" as const;

function stubProvider(
  id: string,
  chainId: number,
  behavior: {
    verification: ContractVerificationResult;
    source?: { sourceFiles: { filename: string; sourceCode: string }[] } | null;
  }
): ContractSourceProvider {
  return {
    id,
    supports: (candidate) => candidate === chainId,
    getVerification: () => Promise.resolve(behavior.verification),
    getSource: () => Promise.resolve(behavior.source ?? null),
    getAbi: () => Promise.resolve(null)
  };
}

describe("createContractSourceChain", () => {
  it("falls back to the next provider when the first is UNAVAILABLE", async () => {
    const first = stubProvider("first", 1, {
      verification: { status: "UNAVAILABLE", provider: "first" }
    });
    const second = stubProvider("second", 1, {
      verification: { status: "VERIFIED", provider: "second", contractName: "Token" },
      source: { sourceFiles: [{ filename: "Token.sol", sourceCode: "contract Token {}" }] }
    });

    const chain = createContractSourceChain([first, second]);
    const result = await chain.getContractSource({ chainId: 1, address });

    expect(result.status).toBe("VERIFIED");
    expect(result.contractName).toBe("Token");
  });

  it("prefers the first provider's VERIFIED result over a later provider", async () => {
    const first = stubProvider("first", 1, {
      verification: { status: "VERIFIED", provider: "first", contractName: "FirstToken" },
      source: { sourceFiles: [{ filename: "A.sol", sourceCode: "contract A {}" }] }
    });
    const second = stubProvider("second", 1, {
      verification: { status: "VERIFIED", provider: "second", contractName: "SecondToken" },
      source: { sourceFiles: [{ filename: "B.sol", sourceCode: "contract B {}" }] }
    });

    const chain = createContractSourceChain([first, second]);
    const result = await chain.getContractSource({ chainId: 1, address });

    expect(result.contractName).toBe("FirstToken");
  });

  it("returns an UNVERIFIED fallback when every provider is otherwise UNAVAILABLE", async () => {
    const first = stubProvider("first", 1, {
      verification: { status: "UNAVAILABLE", provider: "first" }
    });
    const second = stubProvider("second", 1, {
      verification: { status: "UNVERIFIED", provider: "second", contractName: "Token" }
    });

    const chain = createContractSourceChain([first, second]);
    const result = await chain.getContractSource({ chainId: 1, address });

    expect(result.status).toBe("UNAVAILABLE");
    expect(result.contractName).toBe("Token");
  });

  it("returns UNAVAILABLE with empty source files when no provider supports the chain", async () => {
    const provider = stubProvider("only", 1, {
      verification: { status: "VERIFIED", provider: "only" },
      source: { sourceFiles: [{ filename: "A.sol", sourceCode: "contract A {}" }] }
    });

    const chain = createContractSourceChain([provider]);
    const result = await chain.getContractSource({ chainId: 999, address });

    expect(result).toEqual({ status: "UNAVAILABLE", address, sourceFiles: [] });
  });
});
