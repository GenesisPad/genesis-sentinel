import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genesis Sentinel",
  description: "Token-security intelligence foundation for EVM contracts."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
