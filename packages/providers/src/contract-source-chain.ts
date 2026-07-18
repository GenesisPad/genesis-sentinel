import type {
  ContractSourceProvider,
  ContractSourceResult,
  ContractVerificationResult,
  SourceProvider,
  VerifiedContractSource
} from "./types.js";

/**
 * Composes an ordered list of ContractSourceProvider instances (e.g. [Sourcify, Blockscout])
 * into the single SourceProvider worker orchestration calls. Providers are tried in order;
 * the first one that returns a genuinely VERIFIED result with non-empty source wins. A
 * provider that returns UNAVAILABLE (timeout, malformed response, rate limit, unsupported
 * chain) is skipped and the next provider is tried — this is the "graceful fallback to
 * bytecode-only analysis" behavior required for Milestone 1. An UNVERIFIED result (the
 * provider successfully checked and found no verification) is kept as a fallback answer in
 * case every later provider is also UNAVAILABLE, but a later provider's VERIFIED result
 * always takes precedence over an earlier UNVERIFIED one.
 */
export function createContractSourceChain(providers: ContractSourceProvider[]): SourceProvider {
  return {
    id: "contract-source-chain",
    supportsChain: (chainId) => providers.some((provider) => provider.supports(chainId)),
    async getContractSource({ chainId, address }): Promise<ContractSourceResult> {
      let fallback: ContractSourceResult | null = null;

      for (const provider of providers) {
        if (!provider.supports(chainId)) {
          continue;
        }

        const verification = await provider
          .getVerification({ chainId, address })
          .catch(
            (): ContractVerificationResult => ({ status: "UNAVAILABLE", provider: provider.id })
          );

        if (verification.status === "UNAVAILABLE") {
          continue;
        }

        if (verification.status === "UNVERIFIED") {
          fallback ??= toContractSourceResult(address, verification, null, null);
          continue;
        }

        const [source, abi] = await Promise.all([
          provider.getSource({ chainId, address }).catch((): null => null),
          provider.getAbi({ chainId, address }).catch((): null => null)
        ]);
        if (!source || source.sourceFiles.length === 0) {
          fallback ??= toContractSourceResult(address, verification, null, abi);
          continue;
        }

        return toContractSourceResult(address, verification, source, abi);
      }

      return fallback ?? { status: "UNAVAILABLE", address, sourceFiles: [] };
    }
  };
}

function toContractSourceResult(
  address: `0x${string}`,
  verification: ContractVerificationResult,
  source: VerifiedContractSource | null,
  abi: unknown[] | null
): ContractSourceResult {
  if (!source) {
    return {
      status: "UNAVAILABLE",
      address,
      contractName: verification.contractName ?? null,
      compilerVersion: verification.compilerVersion ?? null,
      sourceFiles: []
    };
  }

  return {
    status: "VERIFIED",
    address,
    contractName: source.contractName ?? verification.contractName ?? null,
    compilerVersion: source.compilerVersion ?? verification.compilerVersion ?? null,
    language: source.language ?? null,
    abi: abi ?? undefined,
    sourceFiles: source.sourceFiles
  };
}
