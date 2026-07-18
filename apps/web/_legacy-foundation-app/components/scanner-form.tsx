"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ScanProgress {
  scanId: string;
  chainId: number;
  address: string;
  state: string;
  scannerVersion: string;
  submittedAt: string;
  message: string;
  scanBlockNumber?: string;
}

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

export function ScannerForm() {
  const [address, setAddress] = useState("");
  const [scan, setScan] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setScan(null);

    if (!addressPattern.test(address)) {
      setError("Enter a valid EVM contract address.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/v1/scans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `web:${address.toLowerCase()}`
        },
        body: JSON.stringify({
          chainId: 4663,
          address
        })
      });

      const body = (await response.json()) as ScanProgress | { message?: string };
      if (!response.ok) {
        setError(body.message ?? "Unable to submit scan.");
        return;
      }

      setScan(body as ScanProgress);
    } catch {
      setError("Unable to reach the Genesis Sentinel API.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={(event) => {
          void submitScan(event);
        }}
        className="rounded-lg border border-[#d0d5dd] bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#344054]" htmlFor="chain">
              Chain
            </label>
            <select
              id="chain"
              className="h-11 w-full rounded-md border border-[#d0d5dd] bg-white px-3 text-sm text-[#101828]"
              value="4663"
              disabled
            >
              <option value="4663">Robinhood Chain (4663)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#344054]" htmlFor="address">
              Contract address
            </label>
            <Input
              id="address"
              inputMode="text"
              placeholder="0x..."
              value={address}
              onChange={(event) => setAddress(event.target.value.trim())}
            />
          </div>

          <Button type="submit" disabled={pending}>
            <Search aria-hidden="true" size={18} />
            {pending ? "Submitting" : "Submit scan"}
          </Button>
        </div>
      </form>

      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#101828]">Scan status</h2>
        <div className="mt-4 min-h-40 text-sm text-[#475467]">
          {error ? <p className="text-[#b54708]">{error}</p> : null}
          {!error && !scan ? (
            <p>
              Submit a contract address to create a foundation scan request. Security findings are
              intentionally unavailable until real detectors are implemented.
            </p>
          ) : null}
          {scan ? (
            <dl className="grid gap-3">
              <div>
                <dt className="font-medium text-[#344054]">State</dt>
                <dd>{scan.state}</dd>
              </div>
              <div>
                <dt className="font-medium text-[#344054]">Scanner version</dt>
                <dd>{scan.scannerVersion}</dd>
              </div>
              <div>
                <dt className="font-medium text-[#344054]">Submitted</dt>
                <dd>{scan.submittedAt}</dd>
              </div>
              <div>
                <dt className="font-medium text-[#344054]">Message</dt>
                <dd>{scan.message}</dd>
              </div>
              {scan.scanBlockNumber ? (
                <div>
                  <dt className="font-medium text-[#344054]">Scan block</dt>
                  <dd>{scan.scanBlockNumber}</dd>
                </div>
              ) : null}
              <div>
                <a className="font-medium text-[#006d5b]" href={`/results/${encodeURIComponent(scan.scanId)}`}>
                  Open result
                </a>
              </div>
            </dl>
          ) : null}
        </div>
      </section>
    </div>
  );
}
