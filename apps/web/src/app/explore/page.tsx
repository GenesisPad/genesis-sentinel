import { EmptyState } from "@/components/empty-state";
export const metadata = { title: "Explore" };
export default function ExplorePage() {
  return (
    <main className="mx-auto max-w-[1360px] px-5 py-12 sm:px-7">
      <h1 className="mb-6 font-display text-3xl font-bold">Explore</h1>
      <EmptyState title="Public scan activity" body="Wire this to GET /v1/scans/recent and the public detections feed." />
    </main>
  );
}
