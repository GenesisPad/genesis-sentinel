import type { LiquidityInfo } from "@/lib/types";
import { formatUsd, shortAddress } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export function LiquidityCard({ liquidity, technical }: { liquidity: LiquidityInfo; technical?: boolean }) {
  if (liquidity.locked == null && liquidity.totalUsd == null) {
    return (
      <EmptyState
        title="No liquidity pool discovered"
        body="Trading simulation may be unavailable for this token."
      />
    );
  }

  // Only render segments we have real data for — a 0% fallback for deployer-controlled/lock
  // percentages the backend hasn't measured yet would read as a measured fact, not a guess.
  const seg = [
    liquidity.burnedPct != null ? { label: "Burned / locked", pct: liquidity.burnedPct, hex: "#f5a623" } : null,
  ].filter((s): s is { label: string; pct: number; hex: string } => s !== null);

  return (
    <div className="flex flex-col gap-2.5">
      {seg.length > 0 ? (
        <>
          {seg.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm text-secondary">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.hex }} aria-hidden />
                {s.label}
              </span>
              <span className="text-sm font-bold text-foreground">{s.pct.toFixed(1)}%</span>
            </div>
          ))}
          <div className="mt-1 flex h-2.5 overflow-hidden rounded-md bg-border" aria-hidden>
            {seg.map((s) => (
              <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.hex }} />
            ))}
          </div>
        </>
      ) : null}
      {liquidity.totalUsd != null ? (
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>Total liquidity</span>
          <span className="text-foreground">{formatUsd(liquidity.totalUsd)}</span>
        </div>
      ) : null}
      {liquidity.locked != null ? (
        <div className="flex justify-between text-sm text-muted">
          <span>Locked / burned</span>
          <span className="font-bold" style={{ color: liquidity.locked ? "#37d67a" : "#f0483e" }}>
            {liquidity.locked ? "Yes" : "No"}
          </span>
        </div>
      ) : null}
      {liquidity.lpOwner ? (
        <div className="flex justify-between text-sm text-muted">
          <span>LP owner</span>
          <span className="font-mono text-secondary">{shortAddress(liquidity.lpOwner)}</span>
        </div>
      ) : null}
      {technical && liquidity.dex ? (
        <div className="flex justify-between text-sm text-muted">
          <span>DEX</span>
          <span className="text-secondary">{liquidity.dex}</span>
        </div>
      ) : null}
      {technical && liquidity.poolAddress ? (
        <div className="flex justify-between text-sm text-muted">
          <span>Pool address</span>
          <span className="font-mono text-secondary">{shortAddress(liquidity.poolAddress)}</span>
        </div>
      ) : null}
    </div>
  );
}
