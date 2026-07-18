"use client";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, { title: string; body: string }> = {
  not_found: { title: "Contract not found", body: "We couldn't find a contract at this address on the selected chain." },
  rpc_unavailable: { title: "RPC temporarily unavailable", body: "The chain's RPC provider is not responding. Please try again shortly." },
  network_error: { title: "Network error", body: "The request failed to reach Genesis Sentinel. Check your connection and retry." },
  no_base_url: { title: "Scanner not configured", body: "The API base URL is missing. Set NEXT_PUBLIC_API_BASE_URL." },
  request_failed: { title: "Scan could not complete", body: "Something went wrong while scanning this token." },
};

/** Explicit, specific error UI — never a bare "Something went wrong". */
export function ScanError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const code = error instanceof ApiError ? error.code : "request_failed";
  const info = MESSAGES[code] ?? MESSAGES.request_failed;
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center"
    >
      <AlertTriangle className="size-8 text-danger" aria-hidden />
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{info.title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{info.body}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      ) : null}
    </div>
  );
}
