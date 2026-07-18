import { EmptyState } from "@/components/empty-state";
export const metadata = { title: "API" };
export default function ApiPage() {
  return (
    <main className="mx-auto max-w-[1360px] px-5 py-12 sm:px-7">
      <h1 className="mb-6 font-display text-3xl font-bold">API overview</h1>
      <EmptyState title="Developer API" body="Document POST /v1/scans, GET /v1/scans/:id, GET /v1/tokens/:chainId/:address here." />
    </main>
  );
}
