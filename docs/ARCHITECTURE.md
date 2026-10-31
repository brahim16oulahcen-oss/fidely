# Architecture

## Vue d'ensemble

```
src/
  app/                    Routes (App Router)
    (marketing)/          Landing, /tarifs, /demo, /legal/*
    (auth)/               connexion, inscription, vérification email, mot de passe, choix du commerce
    (onboarding)/         Assistant 5 étapes
    (merchant)/app/       Espace commerçant (11 sections)
    (customer)/           /rejoindre/[slug], /carte/[token], /retrouver-ma-carte, /espace-client
    (admin)/admin/        Back-office plateforme
    actions/              Server Actions (fines : validation + appel des services)
    api/                  Export CSV (commerçant) et export JSON (client)
  features/               Logique métier, indépendante de l'interface
    loyalty/              engine.ts (pur), operations.ts (scanner), programs.ts
    customers/ campaigns/ subscriptions/ merchants/ analytics/ admin/ auth/ legal/
  lib/
    db/                   Interface Repositories + implémentation démo (mémoire + JSON)
    auth/                 Session signée, contexte, permissions par rôle
    security/             scrypt, HMAC, limitation de débit
    demo/                 Données fictives déterministes, réinitialisation
    wallet/ billing/ messaging/   Adaptateurs de services externes
  components/             ui/ (shadcn), layout/, loyalty/, wallet/, scanner/, dashboard/, analytics/, …
  config/                 Marque, offres, environnement
  types/domain.ts         Modèle de données
```

## Couches

1. **Interface** (`app/`, `components/`) : aucune règle métier ; les pages serveur lisent via les services, les composants client appellent des Server Actions.
2. **Actions** (`app/actions/`) : authentification (`merchantAction(permission, fn)`), validation Zod, conversion des erreurs en `ActionResult` (jamais de faux succès), revalidation du cache.
3. **Services** (`features/`) : règles métier, isolation par `merchantId`, audit.
4. **Moteur de fidélité** (`features/loyalty/engine.ts`) : fonctions pures (`computeEarn`, `progressOf`, `computeTier`…), testées unitairement.
5. **Données** (`lib/db/`) : interface `Repositories` ; l'implémentation démo peut être remplacée par Supabase sans toucher aux services.
6. **Services externes** (`lib/wallet`, `lib/billing`, `lib/messaging`) : adaptateurs `Demo*` fonctionnels et adaptateurs de production qui renvoient « Intégration à configurer ».

## Règles métier importantes

- **Non-rétroactivité** : chaque programme a un `ruleVersion` ; chaque transaction enregistre la version et un résumé des règles appliquées. Modifier les règles incrémente la version sans recalculer l'historique ni les soldes acquis.
- **Opération en caisse** (`operations.earn`) : verrou par carte, clé d'idempotence (double clic, double onglet, réseau instable), délai minimal entre deux passages (forçable par un responsable seulement), montant maximal, programme actif, commerce non suspendu, journal d'audit.
- **Déblocage automatique** des récompenses à tampons, avec date d'expiration ; utilisation unique (refus d'une seconde utilisation).
- **Indicateurs** calculés à partir des transactions (`features/analytics/metrics.ts`, définitions dans `METRICS`). Trois chiffres d'affaires distincts : *enregistré* (montants saisis), *des clients fidèles*, *additionnel estimé* (hypothèse explicitement signalée).
- **Segments** : nouveau (≤ 30 j), inactif (> 45 j sans visite), fidèle (actif, ≥ 5 visites), VIP (≥ 12 visites ou niveau Gold).

## Sécurité

- Session : cookie `httpOnly`, `SameSite=Lax`, signé HMAC-SHA256 (Web Crypto) ; vérifiée dans le middleware et côté serveur à chaque page et action.
- Rôles : propriétaire, responsable, employé (`ROLE_PERMISSIONS`) ; administrateur plateforme séparé. L'employé n'a accès qu'au scanner et à la liste des clients.
- Multi-tenant : chaque lecture et écriture filtre sur le commerce actif ; testé (un commerce ne peut ni lire ni créditer la carte d'un autre).
- Client final : pas de mot de passe ; accès par jeton secret aléatoire (`/carte/<token>`, `noindex`, `no-referrer`). Le QR ne contient qu'un code de scan aléatoire, sans donnée personnelle. Le client ne peut jamais créditer sa carte.
- Mots de passe : scrypt avec sel. Limitation de débit (en mémoire) sur connexion, vérification email, réinitialisation, inscription client et récupération de carte.
- Export CSV protégé contre l'injection de formules ; exports audités.
- En-têtes de sécurité (`X-Frame-Options`, `Permissions-Policy` caméra limitée au site, etc.). Pas encore de CSP stricte.

## Données de démonstration

`lib/demo/seed.ts` génère un jeu déterministe (graine fixe) : 8 commerces (dont un suspendu, un résilié, un en essai), 928 clients, ~6 300 transactions sur 6 à 9 mois, récompenses utilisées et disponibles, campagnes, factures, tickets, journaux. Persistance dans `DEMO_DATA_DIR/db.json`. Le sélecteur de rôle et la réinitialisation sont refusés côté serveur si `DEMO_MODE` n'est pas `true`.

## Tests

- `tests/unit/core.test.ts` (Vitest) : 20 tests sur les services réels avec une base en mémoire — les 14 cas du cahier des charges + non-rétroactivité, consentement des campagnes, double soumission concurrente, anti-fraude, cashback, niveaux VIP, programme désactivé.
- `tests/e2e/` (Playwright) : parcours de démonstration en 20 étapes, contrôle d'accès (employé, anonyme, autre commerce), 404 carte, réinitialisation, affichage mobile.
