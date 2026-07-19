import { ExploreView } from "@/components/explore-view";

export const metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <main className="mx-auto max-w-[1360px] px-5 py-12 sm:px-7">
      <h1 className="mb-2 font-display text-3xl font-bold">Explore</h1>
      <p className="mb-6 text-sm text-muted">
        The most recently scanned tokens with a persisted risk score, newest first.
      </p>
      <ExploreView />
    </main>
  );
}
