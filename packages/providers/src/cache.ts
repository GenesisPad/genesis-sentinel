import type { ContractSourceProvider, ContractVerificationResult } from "./types.js";

/** Bump to invalidate every cached verification result across all providers/deployments. */
export const sourceVerificationCacheVersion = "1";

export interface ContractSourceVerificationCache {
  get(key: string): ContractVerificationResult | undefined;
  set(key: string, value: ContractVerificationResult): void;
}

export function createInMemoryVerificationCache(): ContractSourceVerificationCache {
  const store = new Map<string, ContractVerificationResult>();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    }
  };
}

/**
 * Wraps a ContractSourceProvider's getVerification with a cache keyed by chain id, address,
 * runtime bytecode hash, provider id, and a verification cache version — so a contract
 * upgrade (different bytecode hash) or a cache-version bump naturally invalidates stale
 * results instead of requiring manual cache clearing. Only getVerification is cached today;
 * getSource/getAbi/getImplementation are passed through uncached (known limitation — the
 * verification check is what gates whether source/ABI are fetched at all, so it captures
 * most of the practical benefit).
 */
export function createCachedContractSourceProvider(
  provider: ContractSourceProvider,
  cache: ContractSourceVerificationCache = createInMemoryVerificationCache()
): ContractSourceProvider {
  const base: ContractSourceProvider = {
    id: provider.id,
    supports: (chainId) => provider.supports(chainId),
    async getVerification(input) {
      const key = [
        input.chainId,
        input.address.toLowerCase(),
        input.bytecodeHash ?? "unknown-bytecode",
        provider.id,
        sourceVerificationCacheVersion
      ].join(":");

      const cached = cache.get(key);
      if (cached) {
        return cached;
      }

      const result = await provider.getVerification(input);
      cache.set(key, result);
      return result;
    },
    getSource: (input) => provider.getSource(input),
    getAbi: (input) => provider.getAbi(input)
  };

  if (!provider.getImplementation) {
    return base;
  }

  return {
    ...base,
    getImplementation: (input) => provider.getImplementation!(input)
  };
}
