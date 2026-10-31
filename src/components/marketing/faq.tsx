import { ChevronDown } from "lucide-react";

export const FAQ_ITEMS = [
  { q: "Mes clients doivent-ils télécharger une application ?", a: "Non. Le client scanne le QR code en caisse, remplit un formulaire de quelques secondes et obtient immédiatement une carte web sur son téléphone. L'ajout à Apple Wallet ou Google Wallet sera proposé une fois ces intégrations configurées pour votre compte." },
  { q: "Combien de temps faut-il pour démarrer ?", a: "Une dizaine de minutes : informations du commerce, logo et couleurs, choix du programme, récompense, puis impression de l'affiche QR. Vous pouvez scanner votre premier client dans la foulée." },
  { q: "Comment mes employés ajoutent-ils un tampon ?", a: "Depuis l'écran Scanner, sur tablette ou téléphone : scan du QR du client avec la caméra, ou recherche par nom, email ou téléphone. Un employé accède au scanner et à la liste des clients, jamais aux statistiques, aux campagnes ni aux réglages." },
  { q: "Puis-je modifier mes règles plus tard ?", a: "Oui. Une nouvelle version des règles s'applique aux passages suivants. L'historique et les récompenses déjà gagnées ne sont jamais recalculés." },
  { q: "Et le RGPD ?", a: "Fidely fournit les outils : consentement marketing séparé et horodaté, désinscription, export et suppression des données par le client, journal d'audit. Vous restez responsable du traitement de vos données clients ; ces outils ne rendent pas votre usage conforme automatiquement." },
  { q: "Y a-t-il un engagement ?", a: "Non. L'abonnement est mensuel et résiliable à tout moment. L'essai de 14 jours ne demande pas de carte bancaire." },
  { q: "Est-ce adapté si j'ai plusieurs boutiques ?", a: "L'offre Business gère jusqu'à 10 établissements avec une base clients commune et des statistiques par établissement." },
];

export function Faq() {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
      {FAQ_ITEMS.map((f) => (
        <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {f.q}
            <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
