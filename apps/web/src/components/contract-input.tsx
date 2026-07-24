"use client";
import { AlertCircle, Check, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHAINS, type ChainId } from "@/lib/chains";
import { parseInput, type ParsedInput } from "@/lib/validate";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChainSelector } from "@/components/chain-selector";
import { cn } from "@/lib/utils";

export type ValidationState =
  | "empty"
  | "typing"
  | "validating"
  | "valid"
  | "invalid_address"
  | "unsupported_url"
  | "unsupported_chain";

export interface SubmitPayload {
  address: string;
  chainId?: ChainId;
}

/**
 * Accessible contract input. Debounced validation (never aggressive while typing),
 * chain suggestion, submit via button and Enter.
 */
export function ContractInput({
  onSubmit,
  busy,
}: {
  onSubmit: (payload: SubmitPayload) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<ValidationState>("empty");
  const [parsed, setParsed] = useState<ParsedInput | null>(null);
  const selectedChain = useUiStore((s) => s.selectedChain);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const raw = value.trim();
    if (!raw) {
      setState("empty");
      setParsed(null);
      return;
    }
    const quick = parseInput(raw);
    // Validate a clearly-complete address almost immediately; otherwise wait longer.
    const delay = quick.kind === "address" ? 350 : 650;
    setState(quick.kind === "address" ? "validating" : "typing");
    debounce.current = setTimeout(() => resolve(raw), delay);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [value, selectedChain]);

  function resolve(raw: string) {
    const p = parseInput(raw);
    setParsed(p);
    switch (p.kind) {
      case "address":
      case "explorer-url":
      case "dex-url":
        setState("valid");
        break;
      case "unsupported-url":
        setState("unsupported_url");
        break;
      default:
        setState("invalid_address");
    }
  }

  const detectedChain: ChainId | undefined = useMemo(() => {
    if (selectedChain !== "auto") return selectedChain;
    return parsed?.chainId;
  }, [selectedChain, parsed, state]);

  function submit() {
    const p = parsed ?? parseInput(value);
    if (p.address && (p.kind === "address" || p.kind === "explorer-url" || p.kind === "dex-url")) {
      onSubmit({ address: p.address, chainId: detectedChain });
    } else {
      resolve(value.trim());
    }
  }

  const border =
    state === "valid"
      ? "border-primary/55 shadow-[0_0_0_4px_rgba(180,241,31,0.12)]"
      : state === "invalid_address"
        ? "border-danger/50"
        : state === "unsupported_url"
          ? "border-warn/50"
          : "border-border-strong";

  return (
    <div className="w-full">
      <label htmlFor="contract-input" className="sr-only">
        Contract address or token URL
      </label>
      <div
        className={cn(
          "flex flex-col items-stretch gap-2.5 rounded-2xl border bg-surface-deep p-2 transition-[border-color,box-shadow] duration-150 sm:flex-row",
          border,
        )}
      >
        <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3">
          <LeadingIcon state={state} />
          <Input
            id="contract-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Paste contract address or token URL"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={state === "invalid_address"}
            aria-describedby="contract-input-status"
            className="py-3.5"
          />
          {value ? (
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="Clear input"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-border text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div className="hidden shrink-0 sm:block">
          <ChainSelector />
        </div>
        <Button onClick={submit} disabled={busy} className="w-full shrink-0 px-6 sm:w-auto" size="lg">
          <Search className="size-[18px]" aria-hidden />
          {busy ? "Scanning…" : "Scan Token"}
        </Button>
      </div>
      {/* chain selector drops below the field on mobile */}
      <div className="mt-2.5 sm:hidden">
        <ChainSelector />
      </div>
      <StatusMessage state={state} chain={detectedChain} />
    </div>
  );
}

function LeadingIcon({ state }: { state: ValidationState }) {
  const cls = "size-[18px] shrink-0";
  if (state === "validating") return <Loader2 className={cn(cls, "animate-spin text-muted motion-reduce:animate-none")} aria-hidden />;
  if (state === "valid") return <Check className={cn(cls, "text-primary")} aria-hidden />;
  if (state === "invalid_address") return <AlertCircle className={cn(cls, "text-danger")} aria-hidden />;
  if (state === "unsupported_url" || state === "unsupported_chain") return <AlertCircle className={cn(cls, "text-warn")} aria-hidden />;
  return <Search className={cn(cls, "text-faint")} aria-hidden />;
}

function StatusMessage({ state, chain }: { state: ValidationState; chain?: ChainId }) {
  const map: Record<ValidationState, { text: string; cls: string } | null> = {
    empty: null,
    typing: null,
    validating: { text: "Validating address…", cls: "text-muted" },
    valid: {
      text: `Valid contract address${chain ? ` · Network detected: ${CHAINS[chain].label}` : " · Chain will be auto-detected on scan"}`,
      cls: "text-primary",
    },
    invalid_address: { text: "This does not appear to be a valid EVM contract address.", cls: "text-danger" },
    unsupported_url: { text: "This URL format is not supported yet. Paste a contract address or explorer link.", cls: "text-warn" },
    unsupported_chain: { text: "This chain is not supported yet.", cls: "text-warn" },
  };
  const msg = map[state];
  return (
    <p id="contract-input-status" role="status" aria-live="polite" className={cn("mt-3 min-h-5 px-1.5 text-sm font-semibold", msg?.cls)}>
      {msg?.text ?? ""}
    </p>
  );
}
