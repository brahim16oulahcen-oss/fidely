# Fidely — cartes de fidélité digitales pour les commerces de proximité

Prototype SaaS complet et démontrable : landing, inscription commerçant, onboarding, moteur de fidélité (tampons, points, cashback, niveaux VIP), cartes web avec QR, scanner employé, CRM, récompenses, campagnes simulées, analytics, abonnements, espace client et back-office administrateur.

> **Prototype.** Les données sont fictives, les envois email/SMS et les paiements sont simulés, Apple Wallet et Google Wallet ne sont pas branchés. Voir [docs/STATUT.md](docs/STATUT.md).

## Démarrage rapide

Prérequis : Node.js 20+ et npm.

```bash
npm install
cp .env.example .env.local      # DEMO_MODE=true par défaut ; changez SESSION_SECRET
npm run dev                     # http://localhost:3000
```

Au premier lancement, le jeu de démonstration est généré dans `.data/db.json` (8 commerces de Rouen, 928 clients, ~6 300 passages sur 9 mois). Aucune base de données ni service externe n'est requis.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build && npm start` | Build et serveur de production |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires et d'intégration (Vitest, 20 tests) |
| `npm run test:e2e` | Tests Playwright (nécessite `npm run build` ; `npx playwright install chromium` la première fois) |
| `npm run demo:reset` | Supprime les données locales (régénérées au prochain démarrage) |

## Démonstration

Ouvrez **/demo** ou le bouton **« Mode démo »** (en bas à gauche, présent sur toutes les pages en mode démo) pour changer de profil :

| Profil | Compte | Ce qu'on voit |
| --- | --- | --- |
| Commerçant | `julien@demo.fidely.example` | Café Rouen Centre et Maison du Pain : tableau de bord complet |
| Employé | `lucas@demo.fidely.example` | Scanner uniquement |
| Client final | Léa Martin (sans mot de passe) | Carte web : 7 tampons, 1 récompense disponible |
| Administrateur SaaS | `admin@demo.fidely.example` | Back-office plateforme |

Mot de passe de tous les comptes de démo : `demo1234`. Autres commerçants : `karim@` (Barber Studio, points), `sophie@` (Beauty Atelier, niveaux VIP), `thomas@` (Restaurant Le Comptoir, cashback), `manon@`, `marco@`, `claire@`, `helene@demo.fidely.example`.

**Parcours complet (section 24 du cahier des charges)** — testé automatiquement par `tests/e2e/demo-journey.spec.ts` :
landing → « Essayer gratuitement » → inscription → code de vérification (affiché dans la boîte simulée) → onboarding 5 étapes (« 10 passages = 1 café offert ») → QR d'inscription → page client (`/rejoindre/<slug>`) → carte web → Scanner → onglet Simulation (coller le code `FDL-…` de la carte) → 10 tampons → récompense débloquée (visible sur la carte du client en quelques secondes) → « Utiliser » → historique → tableau de bord mis à jour → nouvelle campagne simulée → Analytics → back-office admin.

Astuce : l'anti-fraude refuse deux passages sur la même carte à moins de 60 s ; en tant que propriétaire, cliquez « Confirmer quand même » (un employé ne peut pas).

**Réinitialiser la démo** : bouton sur /demo ou dans le menu « Mode démo ».

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, couches, sécurité, données
- [docs/STATUT.md](docs/STATUT.md) — implémenté / simulé / à faire pour la production
- [docs/WALLET.md](docs/WALLET.md) — prérequis Apple Wallet et Google Wallet
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — Supabase, Stripe, email, SMS
- [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — schéma cible avec RLS (non exécuté)

## Stack

Next.js 15 (App Router, Server Actions), React 19, TypeScript strict, Tailwind CSS 4, composants shadcn/ui (Radix), Lucide, Recharts, Zod, React Hook Form, jsQR (caméra), qrcode, jsPDF, Vitest, Playwright.
