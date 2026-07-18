import { EmptyState } from "@/components/empty-state";
export const metadata = { title: "Docs" };
export default function DocsPage() {
  return (
    <main className="mx-auto max-w-[1360px] px-5 py-12 sm:px-7">
      <h1 className="mb-6 font-display text-3xl font-bold">Developer documentation</h1>
      <EmptyState title="Docs entry point" body="Add your MDX or docs provider here." />
    </main>
  );
}
