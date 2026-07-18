"use client";
import { AlertCircle, AlertTriangle, Check, MinusCircle } from "lucide-react";
import type { ScanJob, ScanStage, StageStatus } from "@/lib/types";
import { CHAINS } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { SecurityGraph } from "@/components/security-graph";
import { Card } from "@/components/ui/card";

const STATUS_META: Record<StageStatus, { label: string; hex: string }> = {
  pending: { label: "Pending", hex: "#6b736a" },
  running: { label: "Running", hex: "#f5a623" },
  passed: { label: "Passed", hex: "#37d67a" },
  warning: { label: "Finding", hex: "#f0483e" },
  inconclusive: { label: "Inconclusive", hex: "#f5a623" },
  failed: { label: "Failed", hex: "#f0483e" },
  skipped: { label: "Skipped", hex: "#6b736a" },
  unsupported: { label: "Unsupported", hex: "#6b736a" },
};

/** Progress is derived from resolved stages — no random percentage. */
export function ScanProgress({ job }: { job: ScanJob }) {
  const total = job.stages.length || 1;
  const done = job.stages.filter((s) => !["pending", "running"].includes(s.status)).length;
  const pct = Math.round((done / total) * 100);
  const token = job.token;
  const chain = token?.chainId ? CHAINS[token.chainId] : CHAINS.robinhood;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
      <Card className="flex flex-col items-center p-6">
        <div className="mb-2 flex w-full items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-[#0e1a06]">
            <svg viewBox="0 0 34 34" className="size-5">
              <path d="M17 6 L26 11 L17 28 L8 11 Z" fill="#b4f11f" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold">Scanning {token?.name ?? "token"}</span>
              {token?.symbol ? <span className="font-mono text-sm text-muted">${token.symbol}</span> : null}
            </div>
            <div className="text-[13px] text-muted">
              {chain.label} · <span className="font-mono">{token?.address ? shortAddress(token.address) : "…"}</span>
            </div>
          </div>
        </div>
        <SecurityGraph stages={job.stages} />
        <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded bg-border">
          <div className="h-full rounded bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex w-full justify-between text-xs text-muted">
          <span>{pct}% complete</span>
          <span className="capitalize">{job.status}</span>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-[17px] font-semibold">Analysis stages</h2>
        <p className="mb-4 text-sm text-muted">Stages resolve as the backend confirms each check.</p>
        <ol className="flex flex-col gap-0.5" aria-live="polite">
          {job.stages.map((stage, i) => (
            <StageRow key={stage.key} stage={stage} relevant={i <= done + 1} />
          ))}
        </ol>
      </Card>
    </div>
  );
}

function StageRow({ stage, relevant }: { stage: ScanStage; relevant: boolean }) {
  const meta = STATUS_META[stage.status];
  const running = stage.status === "running";
  return (
    <li
      className="flex items-center gap-3 py-2.5 transition-opacity duration-200 motion-reduce:transition-none"
      style={{ opacity: relevant ? 1 : 0.3 }}
    >
      <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
        <StageIcon status={stage.status} />
      </span>
      <span className={running ? "flex-1 font-bold text-foreground" : "flex-1 text-secondary"}>{stage.label}</span>
      <span className="shrink-0 text-xs font-bold" style={{ color: meta.hex }}>
        {meta.label}
      </span>
    </li>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "running")
    return <span className="size-3 rounded-full bg-warn motion-safe:animate-pulse" />;
  if (status === "passed") return <Check className="size-4 text-[#37d67a]" />;
  if (status === "warning" || status === "failed") return <AlertCircle className="size-4 text-danger" />;
  if (status === "inconclusive") return <AlertTriangle className="size-4 text-warn" />;
  if (status === "skipped" || status === "unsupported") return <MinusCircle className="size-4 text-faint" />;
  return <span className="size-3 rounded-full border-2 border-[#3a3f36]" />;
}
