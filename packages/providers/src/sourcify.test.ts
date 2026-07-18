import { afterEach, describe, expect, it, vi } from "vitest";
import { createSourcifyContractSourceProvider } from "./sourcify.js";

const config = { apiBaseUrl: "https://example-sourcify.dev/server", supportedChainIds: [1] };
const address = "0x0000000000000000000000000000000000000001" as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("createSourcifyContractSourceProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not support a chain it is not configured for", () => {
    const provider = createSourcifyContractSourceProvider(config);
    expect(provider.supports(4663)).toBe(false);
    expect(provider.supports(1)).toBe(true);
  });

  it("returns UNAVAILABLE for an unsupported chain without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const provider = createSourcifyContractSourceProvider(config);
    const result = await provider.getVerification({ chainId: 4663, address });
    expect(result).toEqual({ status: "UNAVAILABLE", provider: "sourcify" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns UNAVAILABLE when the contract is not found (404)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 404));
    const provider = createSourcifyContractSourceProvider(config);
    const result = await provider.getVerification({ chainId: 1, address });
    expect(result).toEqual({ status: "UNAVAILABLE", provider: "sourcify" });
  });

  it("returns UNAVAILABLE when rate-limited (429)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 429));
    const provider = createSourcifyContractSourceProvider(config);
    const result = await provider.getVerification({ chainId: 1, address });
    expect(result).toEqual({ status: "UNAVAILABLE", provider: "sourcify" });
  });

  it("returns UNAVAILABLE on a network/timeout error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("aborted"));
    const provider = createSourcifyContractSourceProvider(config);
    const result = await provider.getVerification({ chainId: 1, address });
    expect(result).toEqual({ status: "UNAVAILABLE", provider: "sourcify" });
  });

  it("returns UNAVAILABLE for a malformed (non-JSON-object) response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 200, headers: { "content-type": "text/plain" } })
    );
    const provider = createSourcifyContractSourceProvider(config);
    const result = await provider.getVerification({ chainId: 1, address });
    expect(result).toEqual({ status: "UNAVAILABLE", provider: "sourcify" });
  });

  it("parses a verified exact-match contract with source and ABI", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          runtimeMatch: "exact_match",
          compilation: { name: "Token", compilerVersion: "0.8.20", language: "Solidity" },
          sources: { "Token.sol": { content: "contract Token {}" } },
          abi: [{ type: "function", name: "totalSupply" }]
        })
      )
    );

    const provider = createSourcifyContractSourceProvider(config);
    const verification = await provider.getVerification({ chainId: 1, address });
    const source = await provider.getSource({ chainId: 1, address });
    const abi = await provider.getAbi({ chainId: 1, address });

    expect(verification).toMatchObject({
      status: "VERIFIED",
      provider: "sourcify",
      contractName: "Token",
      bytecodeMatches: true
    });
    expect(source?.sourceFiles).toEqual([{ filename: "Token.sol", sourceCode: "contract Token {}" }]);
    expect(abi).toHaveLength(1);
  });

  it("reports a mismatched-bytecode result as unverified, not VERIFIED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        runtimeMatch: null,
        compilation: { name: "Token" },
        sources: { "Token.sol": { content: "contract Token {}" } }
      })
    );

    const provider = createSourcifyContractSourceProvider(config);
    const verification = await provider.getVerification({ chainId: 1, address });

    expect(verification.status).toBe("UNVERIFIED");
    expect(verification.bytecodeMatches).toBe(false);
  });

  it("does not implement getImplementation", () => {
    const provider = createSourcifyContractSourceProvider(config);
    expect("getImplementation" in provider).toBe(false);
  });
});
