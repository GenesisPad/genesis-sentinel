import { Clock } from "lucide-react";
import type { ScanReport } from "@/lib/types";
import { formatNumber, timeAgo } from "@/lib/utils";

export function ScanMetadata({ report, compact }: { report: ScanReport; compact?: boolean }) {
  const scanned = timeAgo(report.cachedAt ?? report.scannedAt);
  const items = [
    { label: "Scan time", value: report.cachedAt ? `Cached · ${scanned}` : scanned },
    { label: "Block", value: formatNumber(report.block), mono: true },
    { label: "Scanner version", value: report.scannerVersion },
    { label: "Data source", value: report.dataSource },
  ];
  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden /> Scanned {scanned} · Block {formatNumber(report.block)}
        </span>
        <span>Scan Engine {report.scannerVersion}</span>
        <span>Data Source: {report.dataSource}</span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label}>
          <div className="text-muted">{i.label}</div>
          <div className={i.mono ? "mt-0.5 font-mono text-secondary" : "mt-0.5 text-secondary"}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}
