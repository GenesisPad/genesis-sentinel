import { BarChart3, Send } from "lucide-react";

const SOCIAL_LINKS = [
  {
    label: "GenesisPad on X",
    href: "https://x.com/GenesisPad_",
    icon: XIcon
  },
  {
    label: "GenesisPad Telegram",
    href: "https://t.me/GenesisPad_RH",
    icon: Send
  },
  {
    label: "GEN chart on Dexscreener",
    href: "https://dexscreener.com/robinhood/0x7e25c2838428d162c704d0ac0d28be5263495fcc",
    icon: BarChart3
  },
  {
    label: "GenesisPad on GitHub",
    href: "https://github.com/GenesisPad",
    icon: GithubIcon
  }
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-deep/55">
      <div className="mx-auto grid max-w-[1360px] gap-7 px-5 py-9 sm:px-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/brand/logo.png"
              alt=""
              className="size-9 rounded-lg border border-primary/20 object-cover"
            />
            <p className="font-display text-sm font-bold tracking-[0.08em] text-foreground">
              GENESIS SENTINEL
            </p>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Evidence-backed EVM token analysis for the GenesisPad ecosystem. Findings describe
            detected risk, not a guarantee of safety.
          </p>
          <p className="mt-3 text-xs text-faint">
            Built for Robinhood Chain · © {new Date().getFullYear()} GenesisPad
          </p>
        </div>

        <nav className="flex items-center gap-2" aria-label="GenesisPad social links">
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="flex size-11 items-center justify-center rounded-xl border border-border-strong bg-surface text-muted transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <Icon className="size-[18px]" aria-hidden />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.58-.29-5.29-1.29-5.29-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18A10.98 10.98 0 0 1 12 6.12c.98 0 1.95.13 2.87.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.72 5.38-5.3 5.67.42.36.79 1.06.79 2.14v3.27c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}
