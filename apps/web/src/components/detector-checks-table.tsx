import type { DetectorCheckSummary } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

const OUTCOME_STYLE: Record<DetectorCheckSummary["outcome"], { label: string; hex: string }> = {
  detected: { label: "Detected", hex: "#f0483e" },
  passed: { label: "Passed", hex: "#37d67a" },
  unsupported: { label: "Unsupported", hex: "#8b938a" },
  failed: { label: "Failed", hex: "#f0483e" },
  inconclusive: { label: "Inconclusive", hex: "#f5a623" },
  unavailable: { label: "Data unavailable", hex: "#8b938a" },
};

/** Raw per-detector outcomes — the evidence trail behind the summarized findings/controls. */
export function DetectorChecksTable({ checks }: { checks: DetectorCheckSummary[] }) {
  if (checks.length === 0) {
    return (
      <EmptyState
        title="No detector checks recorded yet"
        body="Raw check outcomes appear here once the backend exposes them for this scan."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-semibold">Detector</th>
            <th className="py-2 pr-4 font-semibold">Check</th>
            <th className="py-2 pr-4 font-semibold">Outcome</th>
            <th className="py-2 font-semibold">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check, index) => {
            const style = OUTCOME_STYLE[check.outcome];
            return (
              <tr key={`${check.detectorId}-${check.code}-${index}`} className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs text-secondary">{check.detectorId}</td>
                <td className="py-2 pr-4 text-secondary">{check.code}</td>
                <td className="py-2 pr-4 font-bold" style={{ color: style.hex }}>
                  {style.label}
                </td>
                <td className="py-2 text-muted">{check.confidence ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
