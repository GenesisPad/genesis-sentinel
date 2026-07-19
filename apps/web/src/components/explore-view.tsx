"use client";
import Link from "next/link";
import { useRecentScans } from "@/hooks/use-recent-scans";
import { CHAINS } from "@/lib/chains";
import { riskFromScore } from "@/lib/risk";
import { shortAddress, timeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export function ExploreView() {
  const { data, isLoading } = useRecentScans();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No public security detections yet."
        body="Scan a token to begin building the Sentinel network."
      />
    );
  }

  return (
    <ul className="flex flex-col rounded-2xl border border-border bg-surface-deep">
      {data.map((d) => {
        const risk = riskFromScore(d.riskScore);
        const chain = CHAINS[d.chainId];
        return (
          <li key={`${d.chainId}-${d.address}`}>
            <Link
              href={`/token/${d.chainId}/${d.address}`}
              className="flex items-center gap-3.5 border-b border-border/40 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span
                className="w-[84px] shrink-0 rounded-md py-1 text-center text-[11px] font-extrabold uppercase"
                style={{ color: risk.hex, background: `${risk.hex}1f`, border: `1px solid ${risk.hex}4d` }}
              >
                {risk.label.replace(" Risk", "")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {d.name}
                {d.symbol ? <span className="ml-1.5 text-muted">${d.symbol}</span> : null}
              </span>
              <span className="hidden font-mono text-[13px] text-muted sm:inline">{shortAddress(d.address)}</span>
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: chain.color }} aria-label={chain.label} />
              <span className="w-16 shrink-0 text-right text-[13px] text-faint">{timeAgo(d.scannedAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
