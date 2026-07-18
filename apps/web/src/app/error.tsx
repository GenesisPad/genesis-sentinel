"use client";
import { ScanError } from "@/components/error-boundary";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <ScanError error={error} onRetry={reset} />
    </main>
  );
}
