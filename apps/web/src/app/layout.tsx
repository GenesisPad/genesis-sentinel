import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { AnalyticsVisitTracker } from "@/components/analytics-visit-tracker";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const socialImage = "/brand/social-preview.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Genesis Sentinel - Know what you're buying",
    template: "%s | Genesis Sentinel",
  },
  description:
    "Scan any token for dangerous contract permissions, honeypot behavior, liquidity risks, and suspicious wallets. Evidence-based token security.",
  applicationName: "Genesis Sentinel",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Genesis Sentinel",
    images: [{ url: socialImage, width: 1200, height: 630, alt: "Genesis Sentinel token scanner" }],
  },
  twitter: { card: "summary_large_image", images: [socialImage] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <Providers>
          <AnalyticsVisitTracker />
          <SiteHeader />
          <div id="main">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
