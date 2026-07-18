import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Explore", href: "/explore" },
  { label: "API", href: "/api" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-5 py-5 sm:px-7">
      <Link href="/" className="flex items-center gap-3" aria-label="Genesis Sentinel home">
        <img src="/brand/logo.png" alt="" className="size-10 rounded-xl border border-primary/25 bg-surface-deep object-cover" />
        <span className="font-display text-[15px] font-bold leading-none tracking-[0.06em]">
          <span className="block">GENESIS</span>
          <span className="block text-primary">SENTINEL</span>
        </span>
      </Link>

      <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="text-[15px] font-semibold text-secondary transition-colors hover:text-foreground">
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2.5">
        <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
          Sign In
        </Button>
        <Button size="sm">Sign Up</Button>
      </div>
    </header>
  );
}
