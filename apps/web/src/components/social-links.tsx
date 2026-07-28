import { Globe, MessageCircle, Send } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface SocialLink {
  type: string;
  url: string;
}

interface WebsiteLink {
  label: string | null;
  url: string;
}

/**
 * Sourced from DexScreener's own per-project token profile (`info.socials`/`info.websites`) —
 * whatever a project has chosen to add there, refreshed live on every cached read (see
 * apps/api/src/market-refresh.ts) since projects can add or update these after Sentinel's last
 * scan. Never fabricated: absent when DexScreener has nothing on file.
 */
export function SocialLinks({
  socials,
  websites,
  className
}: {
  socials?: SocialLink[];
  websites?: WebsiteLink[];
  className?: string;
}) {
  const links = [
    ...(websites ?? []).map((site) => ({
      key: `website:${site.url}`,
      href: site.url,
      label: site.label?.trim() || "Website",
      Icon: Globe
    })),
    ...(socials ?? []).map((social) => {
      const meta = socialMeta(social.type);
      return { key: `social:${social.type}:${social.url}`, href: social.url, label: meta.label, Icon: meta.Icon };
    })
  ];

  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Social links">
      {links.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="flex size-7 items-center justify-center rounded-full border border-border-strong bg-surface text-muted transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <Icon className="size-[14px]" aria-hidden />
        </a>
      ))}
    </div>
  );
}

function socialMeta(type: string): { label: string; Icon: ComponentType<{ className?: string }> } {
  switch (type.toLowerCase()) {
    case "twitter":
    case "x":
      return { label: "X (Twitter)", Icon: XIcon };
    case "telegram":
      return { label: "Telegram", Icon: Send };
    case "discord":
      return { label: "Discord", Icon: DiscordIcon };
    default:
      // DexScreener adds new social types over time (medium, reddit, github, tiktok, ...) — an
      // unrecognized one still renders as a generic, clearly-labeled link rather than being
      // silently dropped.
      return { label: capitalize(type), Icon: MessageCircle };
  }
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.073.035c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.249.07.07 0 0 0-.074-.035 19.74 19.74 0 0 0-4.884 1.515.06.06 0 0 0-.03.026C.533 9.045-.32 13.579.099 18.057a.08.08 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.07.07 0 0 0 .077-.027 14.2 14.2 0 0 0 1.226-1.994.07.07 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.892.07.07 0 0 1-.008-.117c.126-.094.252-.192.372-.291a.07.07 0 0 1 .073-.01c3.928 1.793 8.18 1.793 12.061 0a.07.07 0 0 1 .075.009c.12.099.246.198.373.292a.07.07 0 0 1-.006.117 12.3 12.3 0 0 1-1.873.891.07.07 0 0 0-.041.105c.36.698.772 1.363 1.225 1.993a.07.07 0 0 0 .077.028 19.84 19.84 0 0 0 6.001-3.03.07.07 0 0 0 .03-.055c.5-5.177-.838-9.674-3.549-13.662a.06.06 0 0 0-.031-.027ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.946 2.419-2.157 2.419Z" />
    </svg>
  );
}
