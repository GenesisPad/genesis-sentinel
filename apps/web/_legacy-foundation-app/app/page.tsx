import { ShieldCheck } from "lucide-react";
import { ScannerForm } from "../components/scanner-form";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-[#d0d5dd] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#006d5b] text-white">
              <ShieldCheck aria-hidden="true" size={20} />
            </div>
            <span className="text-sm font-semibold tracking-normal text-[#101828]">
              Genesis Sentinel
            </span>
          </div>
          <span className="text-xs font-medium text-[#667085]">Foundation build</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal text-[#101828] sm:text-5xl">
            EVM token risk scanner
          </h1>
          <p className="mt-4 text-base leading-7 text-[#475467]">
            Submit a Robinhood Chain contract address to run the current evidence-backed scan path
            and open a shareable result page.
          </p>
        </div>

        <div className="mt-8">
          <ScannerForm />
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-6 text-[#667085]">
          Results are risk indicators, not guarantees. Genesis Sentinel reports evidence,
          confidence, scan block number, scan time, scanner version, and known limitations when data
          is available.
        </p>
      </section>
    </main>
  );
}
