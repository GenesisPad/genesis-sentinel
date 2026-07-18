import { isRecord, stringValue } from "./http.js";
import type {
  ContractSourceProvider,
  ContractVerificationResult,
  VerifiedContractSource
} from "./types.js";

export interface SourcifyConfig {
  /** Sourcify v2 server base, e.g. https://sourcify.dev/server */
  apiBaseUrl: string;
  /** Chains Sourcify is configured to be queried for; not every chain is indexed by Sourcify. */
  supportedChainIds: number[];
  timeoutMs?: number;
}

type SourcifyFetchResult =
  | { kind: "not-found" }
  | { kind: "rate-limited" }
  | { kind: "http-error"; status: number }
  | { kind: "network-error" }
  | { kind: "malformed" }
  | { kind: "ok"; body: Record<string, unknown> };

/**
 * Sourcify-backed ContractSourceProvider using the v2 contract lookup endpoint. Sourcify only
 * indexes chains it has been configured for, so `supports()` is scoped to `supportedChainIds`
 * rather than assumed globally available — most custom/appchains (including Robinhood Chain
 * today) are not indexed, so this provider commonly returns UNAVAILABLE and callers fall back
 * to the next provider in the chain. See docs/architecture/provider-strategy.md.
 */
export function createSourcifyContractSourceProvider(
  config: SourcifyConfig
): ContractSourceProvider {
  const supportedChainIds = new Set(config.supportedChainIds);
  const timeoutMs = config.timeoutMs ?? 8_000;

  async function fetchContract(
    chainId: number,
    address: `0x${string}`
  ): Promise<SourcifyFetchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/v2/contract/${chainId}/${address}?fields=all`,
        { headers: { accept: "application/json" }, signal: controller.signal }
      );
      if (response.status === 404) return { kind: "not-found" };
      if (response.status === 429) return { kind: "rate-limited" };
      if (!response.ok) return { kind: "http-error", status: response.status };

      const body: unknown = await response.json().catch(() => null);
      return isRecord(body) ? { kind: "ok", body } : { kind: "malformed" };
    } catch {
      return { kind: "network-error" };
    } finally {
      clearTimeout(timeout);
    }
  }

  function matchStatus(body: Record<string, unknown>): {
    verified: boolean;
    bytecodeMatches: boolean | null;
  } {
    const runtimeMatch = stringValue(body.runtimeMatch);
    if (runtimeMatch === "exact_match" || runtimeMatch === "match") {
      return { verified: true, bytecodeMatches: runtimeMatch === "exact_match" };
    }
    if (runtimeMatch === null && (body.compilation || body.sources)) {
      // Sourcify has metadata for this address but explicitly reports no runtime bytecode
      // match — treat as an unverified/mismatched result, never as VERIFIED.
      return { verified: false, bytecodeMatches: false };
    }
    return { verified: false, bytecodeMatches: null };
  }

  return {
    id: "sourcify",
    supports: (chainId) => supportedChainIds.has(chainId),

    async getVerification({ chainId, address }): Promise<ContractVerificationResult> {
      if (!supportedChainIds.has(chainId)) {
        return { status: "UNAVAILABLE", provider: "sourcify" };
      }

      const result = await fetchContract(chainId, address);
      if (result.kind !== "ok") {
        return { status: "UNAVAILABLE", provider: "sourcify" };
      }

      const { verified, bytecodeMatches } = matchStatus(result.body);
      const compilation = isRecord(result.body.compilation) ? result.body.compilation : {};

      return {
        status: verified ? "VERIFIED" : "UNVERIFIED",
        provider: "sourcify",
        contractName: stringValue(compilation.name),
        compilerVersion: stringValue(compilation.compilerVersion),
        language: stringValue(compilation.language),
        bytecodeMatches
      };
    },

    async getSource({ chainId, address }): Promise<VerifiedContractSource | null> {
      if (!supportedChainIds.has(chainId)) {
        return null;
      }

      const result = await fetchContract(chainId, address);
      if (result.kind !== "ok") {
        return null;
      }

      const { verified } = matchStatus(result.body);
      if (!verified || !isRecord(result.body.sources)) {
        return null;
      }

      const compilation = isRecord(result.body.compilation) ? result.body.compilation : {};
      const sourceFiles = Object.entries(result.body.sources)
        .map(([filename, value]) => ({
          filename,
          sourceCode: isRecord(value) ? stringValue(value.content) : null
        }))
        .filter(
          (file): file is { filename: string; sourceCode: string } => file.sourceCode !== null
        );

      if (sourceFiles.length === 0) {
        return null;
      }

      return {
        contractName: stringValue(compilation.name),
        compilerVersion: stringValue(compilation.compilerVersion),
        language: stringValue(compilation.language),
        sourceFiles
      };
    },

    async getAbi({ chainId, address }): Promise<unknown[] | null> {
      if (!supportedChainIds.has(chainId)) {
        return null;
      }

      const result = await fetchContract(chainId, address);
      if (result.kind !== "ok") {
        return null;
      }

      return Array.isArray(result.body.abi) ? result.body.abi : null;
    }

    // Sourcify's v2 API does not report proxy/implementation metadata, so this provider
    // intentionally omits getImplementation rather than guessing.
  };
}
