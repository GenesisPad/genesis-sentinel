/**
 * Provider-neutral LP-locker adapter (Milestone 3). Distinguishes "burned" (verified by
 * checking known burn-address balances directly on-chain — see robinhood-liquidity.ts) from
 * "locked" (requires a specific third-party locker contract's own lock records) and "unknown"
 * (neither burned nor verified locked). A website or explorer label claiming LP is "locked" is
 * not sufficient evidence on its own; only a real locker contract read counts.
 *
 * No concrete locker is wired yet — Genesis Locker's contract addresses and lock-record ABI
 * are not yet available/verified in this codebase, so createUnsupportedLockerProvider is the
 * only implementation today. When Genesis Locker's contracts are available, implement this
 * interface against them and register it per-chain the same way source/explorer/liquidity
 * providers are registered in registry.ts.
 */
export interface LockStatusResult {
  status: "LOCKED" | "UNKNOWN" | "UNSUPPORTED";
  lockerId?: string;
  lockerAddress?: `0x${string}` | null;
  lockedAmountRaw?: string | null;
  lockExpiry?: Date | null;
  reason: string;
}

export interface LockerProvider {
  readonly id: string;
  supportsChain(chainId: number): boolean;
  getLockStatus(input: {
    chainId: number;
    lpTokenAddress: `0x${string}`;
  }): Promise<LockStatusResult>;
}

export function createUnsupportedLockerProvider(): LockerProvider {
  return {
    id: "unsupported-locker",
    supportsChain: () => false,
    async getLockStatus() {
      await Promise.resolve();
      return {
        status: "UNSUPPORTED",
        reason:
          "No LP-locker contract integration is configured for this chain. LP not sent to a known burn address is reported as unknown ownership, never as verified-locked."
      };
    }
  };
}
