import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { DemoSwitcher } from "@/components/layout/demo-switcher";

export const metadata: Metadata = {
  title: { default: `${brand.name} — Cartes de fidélité digitales`, template: `%s · ${brand.name}` },
  description: brand.promise,
  applicationName: brand.name,
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F8FAFC" }, { media: "(prefers-color-scheme: dark)", color: "#0B0F19" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        <Providers>
          {children}
          {env.demoMode && <DemoSwitcher />}
        </Providers>
      </body>
    </html>
  );
}
