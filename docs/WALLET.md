# Intégrations Apple Wallet et Google Wallet

**État actuel : non branchées.** Les boutons « Ajouter à Apple Wallet / Google Wallet » affichent « Intégration à configurer » et la liste des prérequis manquants. La **carte web** (`/carte/<token>`) fonctionne réellement : QR scannable, solde à jour, rafraîchissement automatique, ajout à l'écran d'accueil.

Code : `src/lib/wallet/index.ts` (`AppleWalletProvider`, `GoogleWalletProvider`, `DemoWalletProvider`). Les deux premiers renvoient `not_configured` tant que la génération n'est pas implémentée, même si les variables d'environnement sont renseignées.

## Apple Wallet (.pkpass)

Prérequis :
1. Compte **Apple Developer Program** (99 $/an) au nom de l'éditeur.
2. Un **Pass Type ID** (`pass.fr.votre-domaine.fidelite`) et son certificat de signature (.p12).
3. Le certificat intermédiaire **Apple WWDR**.
4. Un service web HTTPS pour les mises à jour (`webServiceURL`, `authenticationToken`) et les **notifications APNs** pour pousser le nouveau solde après chaque passage.

Variables : `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT_P12_BASE64`, `APPLE_PASS_CERT_PASSWORD`, `APPLE_WWDR_CERT_BASE64`.

Implémentation à faire : générer `pass.json` (type `storeCard`, couleurs et logo du commerce, `barcodes` = `scanCode` au format QR), `manifest.json` (SHA-1), signature PKCS#7 détachée — par exemple avec la bibliothèque `passkit-generator` — puis les routes du service web Apple (enregistrement d'appareil, liste des passes modifiés, envoi du pass à jour) et l'envoi APNs dans `operations.earn` / `redeem`.

## Google Wallet

Prérequis :
1. Compte **Google Pay & Wallet Console** et un **Issuer ID** approuvé.
2. Un projet Google Cloud avec l'API Google Wallet activée et un **compte de service** autorisé sur l'émetteur.

Variables : `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64`.

Implémentation à faire : une `LoyaltyClass` par programme, un `LoyaltyObject` par carte (`barcode` = `scanCode`, `loyaltyPoints` = solde), un lien « Save to Google Wallet » (JWT signé par le compte de service), et un `PATCH` de l'objet après chaque opération.

## Points communs

- Le contenu du code-barres reste le `scanCode` : le scanner Fidely fonctionne déjà avec.
- Ne jamais mettre de donnée personnelle dans le code-barres.
- Prévoir la révocation (suppression de carte par le client) : invalider le pass / l'objet.
