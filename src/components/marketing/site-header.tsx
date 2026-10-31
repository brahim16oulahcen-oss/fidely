"use client";
import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/#fonctionnement", label: "Fonctionnement" },
  { href: "/#programmes", label: "Programmes" },
  { href: "/#metiers", label: "Métiers" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/demo", label: "Démo" },
];

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("sticky top-0 z-30 border-b transition-colors", scrolled || open ? "border-border bg-background/90 backdrop-blur" : "border-transparent bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <FidelyLogo />
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild><Link href="/connexion">Connexion</Link></Button>
          <Button asChild><Link href="/inscription">Essayer gratuitement</Link></Button>
        </div>
        <button className="ml-auto rounded-md p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border px-4 pb-4 md:hidden" aria-label="Navigation mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block border-b border-border py-3 text-sm">{l.label}</Link>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" asChild><Link href="/connexion">Connexion</Link></Button>
            <Button asChild><Link href="/inscription">Essayer</Link></Button>
          </div>
        </nav>
      )}
    </header>
  );
}
