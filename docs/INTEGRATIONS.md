# Intégrations externes

| Service | Prototype | Production |
| --- | --- | --- |
| Base de données | `demoRepositories` : mémoire + `.data/db.json` | Supabase / PostgreSQL — `supabase/migrations/0001_init.sql`, `src/lib/db/supabase/README.md` |
| Authentification | Comptes maison (scrypt + cookie signé), vérification email par code affiché à l'écran | Supabase Auth, emails transactionnels réels |
| Paiement | `DemoBillingProvider` : changement d'offre immédiat, factures fictives (PDF « sans valeur ») | Stripe : Checkout (abonnement), portail client, webhooks `customer.subscription.*` et `invoice.*` |
| Email / SMS | `DemoMessagingProvider` : écrit dans `messageLogs`, n'envoie rien | Fournisseur UE (Brevo, Mailjet…), SMS (OVH, Brevo…), lien de désinscription, horaires d'envoi |
| Wallet | Carte web fonctionnelle | voir [WALLET.md](WALLET.md) |
| Caméra | `getUserMedia` + jsQR (navigateur) | identique ; HTTPS obligatoire |

## Stripe (à brancher)

`src/lib/billing/index.ts` contient `StripeBillingProvider` qui lève « Intégration à configurer » tant que `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` ne sont pas fournis et que le code n'est pas écrit. Étapes :
1. Créer trois prix mensuels (Starter 19 €, Pro 39 €, Business 79 € HT) → `STRIPE_PRICE_*`.
2. `createCheckout(merchant, plan)` → session Checkout `mode: "subscription"`, `trial_period_days: 14`.
3. Route `/api/webhooks/stripe` : vérifier la signature, mettre à jour `subscriptions`, `invoices`, et le statut du commerce (impayé → `past_due`, puis suspension).
4. Les blocages d'offre (`planChangeBlockers`) restent appliqués avant toute rétrogradation.

## Emails et SMS (à brancher)

`src/lib/messaging/index.ts` : implémenter `send()` pour le fournisseur choisi. Conserver le filtrage par consentement (`audienceFor`) et la journalisation. Ajouter : lien de désinscription signé, gestion des rebonds, mentions STOP pour les SMS, respect des plages horaires (prospection SMS).
