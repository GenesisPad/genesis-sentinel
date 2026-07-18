export async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
}

export function numberValue(value: unknown): number | null {
  const numeric =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

export function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function addressValue(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

export function hexStringValue(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]+$/.test(value)
    ? (value as `0x${string}`)
    : null;
}

export function dateValue(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function timestampMsDateValue(value: unknown): Date | null {
  const numeric = numberValue(value);
  if (numeric === null) {
    return null;
  }

  const date = new Date(numeric);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function decimalStringValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === "string" && value.length > 0 && Number.isFinite(Number(value))) {
    return value;
  }

  return null;
}

export function bigintFromRecord(record: Record<string, unknown>, key: string): bigint | null {
  const value = record[key];
  if (typeof value !== "string" || !/^\d+$/u.test(value)) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function numberFromRecord(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
