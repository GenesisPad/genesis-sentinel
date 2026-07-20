"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Scope = "scan:read" | "scan:write";

interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  rateLimitPerMinute: number;
  createdAt: string;
  key: string;
}

const DEFAULT_ENDPOINT = "/v1";
const PRESETS = [
  {
    id: "partner-read",
    label: "Partner read",
    name: "partner-production-read",
    limit: 5000,
    scopes: ["scan:read"] as Scope[]
  },
  {
    id: "partner-scan",
    label: "Partner scan",
    name: "partner-scan-write",
    limit: 1000,
    scopes: ["scan:read", "scan:write"] as Scope[]
  },
  {
    id: "internal",
    label: "Internal admin",
    name: "internal-operator",
    limit: 10000,
    scopes: ["scan:read", "scan:write"] as Scope[]
  }
];

function joinEndpoint(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}${path}`;
}

export function AdminApiKeys() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_ENDPOINT);
  const [adminSecret, setAdminSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [name, setName] = useState(PRESETS[0].name);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(String(PRESETS[0].limit));
  const [scopes, setScopes] = useState<Scope[]>(PRESETS[0].scopes);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(
    () =>
      apiBaseUrl.trim().length > 0 &&
      adminSecret.trim().length > 0 &&
      name.trim().length > 0 &&
      Number(rateLimitPerMinute) > 0 &&
      scopes.length > 0,
    [adminSecret, apiBaseUrl, name, rateLimitPerMinute, scopes.length]
  );

  function toggleScope(scope: Scope) {
    setScopes((current) => {
      if (scope === "scan:read") {
        const next: Scope[] = current.includes("scan:read")
          ? current.filter((item): item is Scope => item !== "scan:read")
          : Array.from(new Set<Scope>([...current, "scan:read"]));
        return next.length > 0 ? next : current;
      }
      const next = current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope];
      return next.length > 0 ? next : current;
    });
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setName(preset.name);
    setRateLimitPerMinute(String(preset.limit));
    setScopes(preset.scopes);
    setCreatedKey(null);
    setCopied(false);
    setStatus("idle");
    setMessage("");
  }

  async function submit() {
    if (!canSubmit) {
      setStatus("error");
      setMessage("Enter the admin secret, key name, and a positive rate limit.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    setCreatedKey(null);
    setCopied(false);

    try {
      const response = await fetch(joinEndpoint(apiBaseUrl.trim(), "/api-keys"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": adminSecret
        },
        body: JSON.stringify({
          name: name.trim(),
          scopes,
          rateLimitPerMinute: Number(rateLimitPerMinute)
        })
      });
      const body = (await response.json().catch(() => ({}))) as Partial<CreatedApiKey> & {
        message?: string;
        error?: string;
      };

      if (!response.ok || !body.key) {
        throw new Error(
          body.message ?? body.error ?? `Request failed with status ${response.status}`
        );
      }

      setCreatedKey(body as CreatedApiKey);
      setStatus("success");
      setMessage("API key created. Store it now; Genesis Sentinel cannot show this key again.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not create the API key.");
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1180px] flex-col gap-8 px-5 py-8 sm:px-7 lg:py-12">
      <section className="grid gap-7 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 text-primary">
            <span className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">
              Genesis Sentinel Admin
            </span>
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
              Generate partner API keys.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-secondary">
              Use this private admin surface for partner keys with custom scopes and higher request
              limits. Keep it on Sentinel for now: the API, audit record, and production environment
              live here, while the launch admin can link to this page later.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  "rounded-lg border border-border-strong bg-surface px-4 py-3 text-left transition-colors hover:border-primary/50",
                  name === preset.name ? "border-primary/60 bg-primary/10" : ""
                )}
              >
                <span className="block text-sm font-bold text-foreground">{preset.label}</span>
                <span className="mt-1 block text-xs text-muted">
                  {preset.limit.toLocaleString()} req/min
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border-strong bg-surface p-4 shadow-2xl shadow-black/25 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="font-display text-xl font-bold">New API Key</h2>
              <p className="mt-1 text-sm text-muted">Plaintext keys are shown only once.</p>
            </div>
            <KeyRound className="size-5 text-primary" aria-hidden="true" />
          </div>

          <div className="grid gap-5 py-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-secondary">API base URL</span>
              <span className="rounded-lg border border-border-strong bg-surface-deep px-3 py-2">
                <Input
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  aria-label="API base URL"
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-secondary">Admin secret</span>
              <span className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-deep px-3 py-2">
                <Input
                  value={adminSecret}
                  onChange={(event) => setAdminSecret(event.target.value)}
                  type={showSecret ? "text" : "password"}
                  autoComplete="off"
                  aria-label="Admin secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSecret((value) => !value)}
                  aria-label={showSecret ? "Hide admin secret" : "Show admin secret"}
                >
                  {showSecret ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-secondary">Key name</span>
              <span className="rounded-lg border border-border-strong bg-surface-deep px-3 py-2">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-label="Key name"
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-secondary">Rate limit per minute</span>
              <span className="rounded-lg border border-border-strong bg-surface-deep px-3 py-2">
                <Input
                  value={rateLimitPerMinute}
                  onChange={(event) => setRateLimitPerMinute(event.target.value)}
                  inputMode="numeric"
                  aria-label="Rate limit per minute"
                />
              </span>
            </label>

            <fieldset className="grid gap-3">
              <legend className="flex items-center gap-2 text-sm font-bold text-secondary">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Scopes
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["scan:read", "scan:write"] as Scope[]).map((scope) => (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-strong bg-surface-deep px-3 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="size-4 accent-primary"
                    />
                    <span>
                      <span className="block font-mono text-sm font-bold">{scope}</span>
                      <span className="block text-xs text-muted">
                        {scope === "scan:read"
                          ? "Read summaries and scan results"
                          : "Create token scans"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit || status === "submitting"}
            onClick={submit}
          >
            {status === "submitting" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="size-4" aria-hidden="true" />
            )}
            Generate API Key
          </Button>

          {message ? (
            <p
              className={cn(
                "mt-4 rounded-lg border px-3 py-2 text-sm",
                status === "error"
                  ? "border-danger/35 bg-danger/10 text-danger"
                  : "border-primary/35 bg-primary/10 text-secondary"
              )}
            >
              {message}
            </p>
          ) : null}

          {createdKey ? (
            <div className="mt-5 rounded-lg border border-primary/35 bg-surface-deep p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{createdKey.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted">Prefix: {createdKey.prefix}</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={copyKey}>
                  {copied ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Clipboard className="size-4" aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <code className="mt-4 block overflow-x-auto rounded-lg border border-border bg-background px-3 py-3 font-mono text-xs text-primary">
                {createdKey.key}
              </code>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
