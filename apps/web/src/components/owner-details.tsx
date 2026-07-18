import type { TokenMeta } from "@/lib/types";
import { shortAddress } from "@/lib/utils";

const STATUS_LABEL: Record<NonNullable<TokenMeta["ownershipStatus"]>, string> = {
  renounced: "Renounced",
  active: "Active",
  unknown: "Not proven",
};

const STATUS_HEX: Record<NonNullable<TokenMeta["ownershipStatus"]>, string> = {
  renounced: "#37d67a",
  active: "#f5a623",
  unknown: "#8b938a",
};

export function OwnerDetails({ token }: { token: TokenMeta }) {
  const status = token.ownershipStatus ?? "unknown";
  type Row = { label: string; value: string; hex?: string; mono?: boolean };
  const rows = ([
    status !== "unknown" ? { label: "Ownership status", value: STATUS_LABEL[status], hex: STATUS_HEX[status] } : null,
    token.ownerAddress ? { label: "Owner address", value: shortAddress(token.ownerAddress), mono: true } : null,
    token.deployer ? { label: "Deployer address", value: shortAddress(token.deployer), mono: true } : null,
    token.verified != null ? {
      label: "Source verified",
      value: token.verified ? "Yes" : "No",
      hex: token.verified ? "#37d67a" : "#f5a623",
    } : null,
  ] as Array<Row | null>).filter((row): row is Row => row !== null);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-deep px-4 py-3 text-sm text-muted">
        Ownership and verification evidence was not returned by the configured chain sources for this scan.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-deep px-4 py-3.5"
        >
          <span className="text-sm font-semibold text-secondary">{r.label}</span>
          <span
            className={r.mono ? "font-mono text-sm font-bold" : "text-sm font-extrabold"}
            style={{ color: r.hex ?? "#f4f6f4" }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
