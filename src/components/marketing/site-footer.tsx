import Link from "next/link";
import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { brand } from "@/config/brand";

const COLS = [
  { title: "Produit", links: [["Fonctionnement", "/#fonctionnement"], ["Programmes", "/#programmes"], ["Wallet", "/#wallet"], ["Tarifs", "/tarifs"], ["Démonstration", "/demo"]] },
  { title: "Commerçants", links: [["Créer mon programme", "/inscription"], ["Connexion", "/connexion"], ["Retrouver ma carte (clients)", "/retrouver-ma-carte"], ["Support", "mailto:" + brand.supportEmail]] },
  { title: "Légal", links: [["Mentions légales", "/legal/mentions"], ["CGU", "/legal/cgu"], ["Confidentialité", "/legal/confidentialite"], ["Accord de traitement (DPA)", "/legal/traitement"], ["Conditions du programme", "/legal/conditions-programme"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <FidelyLogo />
          <p className="max-w-xs text-sm text-muted">{brand.tagline} Conçu à {brand.city} pour les commerces de proximité.</p>
          <p className="text-xs text-muted">Prototype de démonstration. {brand.legalName}.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {c.links.map(([label, href]) => <li key={href}><Link className="hover:text-foreground" href={href}>{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">© {new Date().getFullYear()} {brand.name}. Apple Wallet est une marque d&apos;Apple Inc., Google Wallet une marque de Google LLC. Fidely n&apos;est affilié à aucune de ces sociétés.</p>
      </div>
    </footer>
  );
}
