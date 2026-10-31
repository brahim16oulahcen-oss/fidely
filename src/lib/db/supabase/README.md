# Implémentation Supabase (à écrire)

Le prototype utilise `demoRepositories` (mémoire + `.data/db.json`). Pour passer à Supabase :

1. Appliquer `supabase/migrations/0001_init.sql` sur un projet Supabase **hébergé dans l'UE** (non exécuté à ce jour : à tester).
2. Créer ici `supabase-repositories.ts` qui implémente l'interface `Repositories` de `../repository.ts` :
   - `findMany(filter)` → `supabase.from(table).select().match(snakeCase(filter))`
   - mapper camelCase ⇄ snake_case (`merchantId` ⇄ `merchant_id`) ;
   - `tx(fn)` → fonction Postgres (RPC) ou transaction via une connexion directe (`postgres.js`) ;
   - `withLock(key, fn)` → `pg_advisory_xact_lock(hashtext(key))` dans la même transaction.
3. Les opérations de fidélité (`earn`, `redeem…`) doivent s'exécuter côté serveur avec la clé service, dans une transaction : la contrainte `unique (merchant_id, idempotency_key)` remplace la détection applicative des doublons.
4. Remplacer l'authentification maison (`src/lib/auth/session.ts`, mots de passe scrypt) par Supabase Auth ; `getCurrentUser()` lit alors `auth.getUser()` et la table `profiles`.
5. Stocker l'empreinte (SHA-256) du jeton de carte plutôt que le jeton lui-même.
6. Sélectionner l'implémentation dans `../index.ts` selon `DEMO_MODE`.

Les services métier (`src/features/**`) n'ont pas à changer : ils ne dépendent que de l'interface.
