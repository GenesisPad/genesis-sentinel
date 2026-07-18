"use client";
import type { ScanStage, StageStatus } from "@/lib/types";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const NODES: Array<{ key: ScanStage["key"]; label: string; x: number; y: number; ly: number }> = [
  { key: "fetching_contract", label: "Contract", x: 70, y: 55, ly: 82 },
  { key: "analyzing_contract", label: "Controls", x: 270, y: 55, ly: 82 },
  { key: "simulating_trades", label: "Trading", x: 300, y: 155, ly: 182 },
  { key: "discovering_markets", label: "Liquidity", x: 230, y: 230, ly: 257 },
  { key: "analyzing_holders", label: "Holders", x: 55, y: 220, ly: 247 },
];

function colorFor(status: StageStatus | undefined): string {
  switch (status) {
    case "running":
      return "#f5a623";
    case "passed":
      return "#37d67a";
    case "warning":
    case "inconclusive":
      return "#f5a623";
    case "failed":
      return "#f0483e";
    default:
      return "#3a3f36";
  }
}

/**
 * Lightweight CSS/SVG security graph. Nodes light up per backend stage status.
 * Pulse ring is disabled under reduced motion.
 */
export function SecurityGraph({ stages }: { stages: ScanStage[] }) {
  const reduced = usePrefersReducedMotion();
  const statusOf = (key: ScanStage["key"]) => stages.find((s) => s.key === key)?.status;

  return (
    <div className="relative mx-auto aspect-[340/280] w-full max-w-[340px]">
      <svg viewBox="0 0 340 280" className="h-full w-full overflow-visible" role="img" aria-label="Security analysis graph">
        {NODES.map((n) => {
          const c = colorFor(statusOf(n.key));
          const lit = c !== "#3a3f36";
          return (
            <line key={`l-${n.key}`} x1="170" y1="140" x2={n.x} y2={n.y} stroke={lit ? c : "#23271f"} strokeWidth={lit ? 1.8 : 1} strokeOpacity={lit ? 0.8 : 0.5} />
          );
        })}
        {NODES.map((n) => {
          const c = colorFor(statusOf(n.key));
          return (
            <g key={n.key}>
              <circle cx={n.x} cy={n.y} r={16} fill="#0c0e0c" stroke={c} strokeWidth={2.5} />
              <circle cx={n.x} cy={n.y} r={5} fill={c} />
              <text x={n.x} y={n.ly} fill="#8b938a" fontSize={11} fontWeight={600} textAnchor="middle" fontFamily="var(--font-sans)">
                {n.label}
              </text>
            </g>
          );
        })}
        <circle cx={170} cy={140} r={26} fill="#0e1a06" stroke="#b4f11f" strokeWidth={2.5} />
        <path d="M170 128 L179 133 L170 156 L161 133 Z" fill="#b4f11f" />
      </svg>
      {!reduced ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[52px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
          style={{ animation: "gs-pulse 1.9s ease-out infinite" }}
        />
      ) : null}
    </div>
  );
}
