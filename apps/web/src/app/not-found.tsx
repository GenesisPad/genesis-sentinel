import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-20 text-center">
      <EmptyState
        title="Contract not found"
        body="We couldn't find a token report at this address on the selected chain. It may not exist, or the chain isn't supported yet."
      />
      <div className="mt-5">
        <Button asChild>
          <Link href="/">Back to scanner</Link>
        </Button>
      </div>
    </main>
  );
}
