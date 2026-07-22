"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ExternalLink, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Analytics", href: "/analytics" },
  { label: "Explore", href: "/explore" },
  { label: "Docs", href: "/docs" }
];

const PRODUCT_NAV = [
  { label: "Main Site", href: "https://genesispad.app" },
  { label: "Launchpad", href: "https://launch.genesispad.app" },
  { label: "Locker", href: "https://locker.genesispad.app" },
  { label: "Buybot", href: "https://t.me/genesis_buybot" }
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/88">
      <div className="mx-auto flex min-h-20 max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-7">
        <Link
          href="/"
          aria-label="Genesis Sentinel home"
          aria-current={pathname === "/" ? "page" : undefined}
          className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <img
            src="/brand/logo.png"
            alt=""
            className="size-10 rounded-xl border border-primary/25 bg-surface-deep object-cover"
          />
          <span className="hidden font-display text-[15px] font-bold leading-none tracking-[0.06em] min-[390px]:block">
            <span className="block">GENESIS</span>
            <span className="block text-primary">SENTINEL</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {NAV.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-secondary hover:bg-surface hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <ProductsMenu />
        </nav>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
            Sign In
          </Button>
          <Button size="sm" className="hidden sm:inline-flex">
            Sign Up
          </Button>
          <MobileNav pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function ProductsMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group inline-flex min-h-10 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition-colors duration-200 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 data-[state=open]:bg-surface data-[state=open]:text-foreground"
        >
          Products
          <ChevronDown
            className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[60] w-52 rounded-xl border border-border-strong bg-surface-deep p-1.5 shadow-xl"
        >
          {PRODUCT_NAV.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-secondary outline-none data-[highlighted]:bg-[#161a12] data-[highlighted]:text-foreground"
              >
                {item.label}
                <ExternalLink className="size-3.5 text-faint" aria-hidden />
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="group flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
        >
          <Menu className="size-5 group-data-[state=open]:hidden" aria-hidden />
          <X className="hidden size-5 group-data-[state=open]:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[60] max-h-[calc(100vh-6rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border-strong bg-surface-deep p-1.5 shadow-xl"
        >
          {NAV.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <DropdownMenu.Item key={item.href} asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm font-semibold outline-none data-[highlighted]:bg-[#161a12] ${active ? "bg-primary/10 text-primary" : "text-foreground"}`}
                >
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
          <DropdownMenu.Label className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-faint">
            Products
          </DropdownMenu.Label>
          {PRODUCT_NAV.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-secondary outline-none data-[highlighted]:bg-[#161a12] data-[highlighted]:text-foreground"
              >
                {item.label}
                <ExternalLink className="size-3.5 text-faint" aria-hidden />
              </a>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
          <div className="grid grid-cols-2 gap-1.5 p-1">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
            <Button size="sm">Sign Up</Button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
