import { ResultSkeleton } from "@/components/result-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 sm:px-7">
      <ResultSkeleton />
    </main>
  );
}
