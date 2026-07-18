import type { ContractControls as Controls } from "@/lib/types";

type Tone = "good" | "bad" | "warn";

function control(
  label: string,
  value: boolean | null,
  badWhenTrue: boolean,
): { label: string; text: string; tone: Tone } | null {
  if (value == null) return null;
  const bad = badWhenTrue ? value : !value;
  return { label, text: value ? "Yes" : "No", tone: bad ? "bad" : "good" };
}

const TONE_HEX: Record<Tone, string> = {
  good: "#37d67a",
  bad: "#f0483e",
  warn: "#f5a623",
};

export function ContractControlsGrid({ controls }: { controls: Controls }) {
  const rows = [
    control("Can mint", controls.canMint, true),
    control("Can blacklist", controls.canBlacklist, true),
    control("Can pause trading", controls.canPause, true),
    control("Can change taxes", controls.canChangeTaxes, true),
    controls.ownershipRenounced != null
      ? {
          label: "Ownership renounced",
          text: controls.ownershipRenounced ? "Yes" : "No",
          tone: controls.ownershipRenounced ? "good" : "warn",
        }
      : null,
    control("Is proxy / upgradeable", controls.isProxy, true),
    control("Can limit max tx / wallet", controls.canLimitTransactions, true),
    control("Can disable trading", controls.canDisableTrading, true),
    control("Has fee/limit whitelist", controls.hasFeeWhitelist, true),
  ].filter((row): row is { label: string; text: string; tone: Tone } => row !== null);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-deep px-4 py-3 text-sm text-muted">
        Contract-control evidence was not returned by the configured detectors for this scan.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-deep px-4 py-3.5"
        >
          <span className="text-sm font-semibold text-secondary">{r.label}</span>
          <span className="text-sm font-extrabold" style={{ color: TONE_HEX[r.tone] }}>
            {r.text}
          </span>
        </div>
      ))}
    </div>
  );
}
