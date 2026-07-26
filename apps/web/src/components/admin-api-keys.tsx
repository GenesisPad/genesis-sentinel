"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  ListRestart,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SESSION_STORAGE_KEY = "genesis-sentinel-admin-session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredAdminSession {
  apiBaseUrl: string;
  adminSecret: string;
  savedAt: number;
}

function loadStoredAdminSession(): StoredAdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>;
    if (
      typeof parsed.adminSecret !== "string" ||
      typeof parsed.apiBaseUrl !== "string" ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed as StoredAdminSession;
  } catch {
    return null;
  }
}

function saveAdminSession(session: StoredAdminSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

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

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  rateLimitPerMinute: number;
  enabled: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface ApiKeyUsageSummary {
  apiKeyId: string;
  totalRequests: number;
  requestsLast24h: number;
  requestsLast7d: number;
  byKind: Record<string, number>;
  errorCount: number;
  lastRequestAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
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
  const [sessionRestored, setSessionRestored] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [name, setName] = useState(PRESETS[0].name);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(String(PRESETS[0].limit));
  const [scopes, setScopes] = useState<Scope[]>(PRESETS[0].scopes);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const [keys, setKeys] = useState<ApiKeyRecord[] | null>(null);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listMessage, setListMessage] = useState("");
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [usageByKeyId, setUsageByKeyId] = useState<
    Record<string, { status: "loading" | "error" | "loaded"; summary?: ApiKeyUsageSummary; message?: string }>
  >({});
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Remembers the API base URL + admin secret in this browser for 30 days, so the admin doesn't
  // have to re-enter the secret every visit. Never sent anywhere but the API itself; "Forget"
  // below clears it immediately.
  useEffect(() => {
    const stored = loadStoredAdminSession();
    if (stored) {
      setApiBaseUrl(stored.apiBaseUrl);
      setAdminSecret(stored.adminSecret);
    }
    setSessionRestored(true);
  }, []);

  useEffect(() => {
    if (!sessionRestored) return;
    if (adminSecret.trim().length === 0) {
      clearStoredAdminSession();
      return;
    }
    saveAdminSession({ apiBaseUrl, adminSecret, savedAt: Date.now() });
  }, [sessionRestored, apiBaseUrl, adminSecret]);

  function forgetSession() {
    clearStoredAdminSession();
    setAdminSecret("");
  }

  const canLoadKeys = useMemo(
    () => apiBaseUrl.trim().length > 0 && adminSecret.trim().length > 0,
    [adminSecret, apiBaseUrl]
  );

  async function loadKeys() {
    if (!canLoadKeys) {
      setListStatus("error");
      setListMessage("Enter the API base URL and admin secret first.");
      return;
    }

    setListStatus("loading");
    setListMessage("");
    try {
      const response = await fetch(joinEndpoint(apiBaseUrl.trim(), "/api-keys"), {
        headers: { "x-admin-secret": adminSecret }
      });
      const body = (await response.json().catch(() => [])) as ApiKeyRecord[] | { message?: string };
      if (!response.ok) {
        const errorBody = body as { message?: string };
        throw new Error(errorBody.message ?? `Request failed with status ${response.status}`);
      }
      setKeys(body as ApiKeyRecord[]);
      setListStatus("idle");
    } catch (error) {
      setListStatus("error");
      setListMessage(error instanceof Error ? error.message : "Could not load API keys.");
    }
  }

  async function toggleUsage(keyId: string) {
    if (expandedKeyId === keyId) {
      setExpandedKeyId(null);
      return;
    }
    setExpandedKeyId(keyId);
    if (usageByKeyId[keyId]?.status === "loaded") {
      return;
    }

    setUsageByKeyId((current) => ({ ...current, [keyId]: { status: "loading" } }));
    try {
      const response = await fetch(joinEndpoint(apiBaseUrl.trim(), `/api-keys/${keyId}/usage`), {
        headers: { "x-admin-secret": adminSecret }
      });
      const body = (await response.json().catch(() => ({}))) as Partial<ApiKeyUsageSummary> & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message ?? `Request failed with status ${response.status}`);
      }
      setUsageByKeyId((current) => ({
        ...current,
        [keyId]: { status: "loaded", summary: body as ApiKeyUsageSummary }
      }));
    } catch (error) {
      setUsageByKeyId((current) => ({
        ...current,
        [keyId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Could not load usage."
        }
      }));
    }
  }

  async function revokeKey(keyId: string) {
    if (revokeConfirmId !== keyId) {
      setRevokeConfirmId(keyId);
      return;
    }
    setRevokeConfirmId(null);
    setRevokingId(keyId);
    try {
      const response = await fetch(joinEndpoint(apiBaseUrl.trim(), `/api-keys/${keyId}`), {
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret }
      });
      const body = (await response.json().catch(() => ({}))) as Partial<ApiKeyRecord> & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message ?? `Request failed with status ${response.status}`);
      }
      setKeys((current) =>
        current
          ? current.map((item) =>
              item.id === keyId
                ? { ...item, enabled: false, revokedAt: body.revokedAt ?? new Date().toISOString() }
                : item
            )
          : current
      );
    } catch (error) {
      setListStatus("error");
      setListMessage(error instanceof Error ? error.message : "Could not revoke the key.");
    } finally {
      setRevokingId(null);
    }
  }

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
      void loadKeys();
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
              <span className="flex items-center justify-between text-sm font-bold text-secondary">
                Admin secret
                <span className="text-xs font-normal text-muted">Remembered on this device for 30 days</span>
              </span>
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
                {adminSecret ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={forgetSession}
                    aria-label="Forget saved admin secret"
                    title="Forget saved admin secret"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                ) : null}
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
            onClick={() => {
              void submit();
            }}
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
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void copyKey();
                  }}
                >
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

      <section className="rounded-lg border border-border-strong bg-surface p-4 shadow-2xl shadow-black/25 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3 text-primary">
            <span className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Issued keys</h2>
              <p className="mt-1 text-sm text-muted">
                Every key generated on this instance, with per-key request analytics.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!canLoadKeys || listStatus === "loading"}
            onClick={() => {
              void loadKeys();
            }}
          >
            {listStatus === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ListRestart className="size-4" aria-hidden="true" />
            )}
            {keys === null ? "Load keys" : "Refresh"}
          </Button>
        </div>

        {listMessage ? (
          <p className="mt-4 rounded-lg border border-danger/35 bg-danger/10 px-3 py-2 text-sm text-danger">
            {listMessage}
          </p>
        ) : null}

        {keys === null ? (
          <p className="mt-4 text-sm text-muted">
            Enter the admin secret above, then load keys to see names, scopes, and usage.
          </p>
        ) : keys.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No API keys have been issued yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {keys.map((item) => {
              const usage = usageByKeyId[item.id];
              const expanded = expandedKeyId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border-strong bg-surface-deep p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        {item.name}
                        {item.revokedAt ? (
                          <span className="rounded-full border border-danger/35 bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                            Revoked
                          </span>
                        ) : !item.enabled ? (
                          <span className="rounded-full border border-border-strong px-2 py-0.5 text-xs font-bold text-muted">
                            Disabled
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {item.prefix} · {item.scopes.join(", ")} · {item.rateLimitPerMinute} req/min
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Created {formatDate(item.createdAt)} · Last used {formatDate(item.lastUsedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void toggleUsage(item.id);
                        }}
                      >
                        {expanded ? "Hide usage" : "View usage"}
                      </Button>
                      {!item.revokedAt ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={revokeConfirmId === item.id ? "primary" : "ghost"}
                          className={
                            revokeConfirmId === item.id
                              ? "border-danger bg-danger text-white hover:bg-danger/90"
                              : "text-danger hover:bg-danger/10"
                          }
                          disabled={revokingId === item.id}
                          onClick={() => {
                            void revokeKey(item.id);
                          }}
                        >
                          {revokingId === item.id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="size-4" aria-hidden="true" />
                          )}
                          {revokeConfirmId === item.id ? "Confirm revoke?" : "Revoke"}
                        </Button>
                      ) : null}
                      {revokeConfirmId === item.id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setRevokeConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-3 border-t border-border pt-3">
                      {usage?.status === "loading" ? (
                        <p className="text-sm text-muted">Loading usage…</p>
                      ) : usage?.status === "error" ? (
                        <p className="text-sm text-danger">{usage.message}</p>
                      ) : usage?.summary ? (
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-muted">Total requests</p>
                            <p className="text-lg font-bold text-foreground">
                              {usage.summary.totalRequests.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Last 24h</p>
                            <p className="text-lg font-bold text-foreground">
                              {usage.summary.requestsLast24h.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Last 7d</p>
                            <p className="text-lg font-bold text-foreground">
                              {usage.summary.requestsLast7d.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Errors (4xx/5xx)</p>
                            <p className="text-lg font-bold text-foreground">
                              {usage.summary.errorCount.toLocaleString()}
                            </p>
                          </div>
                          <div className="sm:col-span-4">
                            <p className="text-xs text-muted">By usage kind</p>
                            <p className="mt-1 font-mono text-xs text-secondary">
                              {Object.entries(usage.summary.byKind)
                                .filter(([, count]) => count > 0)
                                .map(([kind, count]) => `${kind}: ${count}`)
                                .join(" · ") || "No requests recorded yet."}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
