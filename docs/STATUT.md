# Statut du prototype

Vérifications effectuées : `tsc` strict sans erreur, ESLint sans avertissement, `next build` réussi, 20 tests Vitest verts, 8 tests Playwright verts (dont le parcours complet en 20 étapes), 45 pages parcourues sans erreur JavaScript en 1280 px et 390 px.

## Fonctionnalités réellement implémentées (et testées)

- Landing (13 sections), tarifs, hub de démonstration, pages légales (modèles).
- Inscription, connexion, déconnexion, mot de passe oublié (lien affiché en mode démo), vérification email (code affiché en mode démo), choix du commerce, multi-commerces par compte.
- Onboarding 5 étapes avec aperçu de carte en direct et QR d'inscription.
- Moteur de fidélité : tampons, points, cashback, niveaux Bronze/Silver/Gold ; versions de règles non rétroactives ; activation/désactivation ; programme principal.
- Récompenses : catalogue, stock, validité, déblocage automatique, cadeau manuel, utilisation unique.
- Éditeur de carte (couleurs, logo, textes, conditions) avec aperçus iPhone, Android et web.
- QR d'inscription : aperçu, affiche PDF A4, impression, copie du lien, partage (Web Share API), PNG.
- Carte client web : QR, solde, progression, récompenses, historique, préférences de consentement, export JSON, suppression (anonymisation), rafraîchissement automatique (~4 s), récupération par email (lien affiché en mode démo).
- Scanner : caméra (jsQR), recherche, simulation ; attribution, utilisation de récompense, échange de points, crédit cashback ; anti double soumission, anti-fraude, droits par rôle, audit.
- CRM : recherche, filtres par segment, tri, pagination, fiche client, historique, export CSV, gestion du consentement.
- Campagnes : assistant (canal, segment, message, envoi/programmation/brouillon), exclusion des non-consentants, automatisations (bienvenue, récompense disponible, inactif, anniversaire, offre).
- Analytics et tableau de bord : KPIs calculés, filtres 7/30/90 jours et période personnalisée, graphiques, définitions des indicateurs.
- Équipe (invitation, rôles, retrait), établissements, paramètres, support.
- Abonnements : offres et limites appliquées, changement d'offre avec contrôles, factures fictives PDF.
- Back-office : vue plateforme, commerçants (suspension/réactivation, changement d'offre), abonnements, revenus, utilisation, support, journaux d'audit.
- Mode démo : 8 commerces, 928 clients, sélecteur de rôle, réinitialisation.

## Fonctionnalités simulées (clairement signalées dans l'interface)

- Envoi des emails et SMS (campagnes, vérification, récupération) : journalisés, jamais envoyés. Ouvertures et clics des campagnes : valeurs simulées ; les visites attribuées sont, elles, calculées à partir des vraies transactions.
- Paiements et factures : aucune transaction bancaire ; factures marquées fictives.
- Apple Wallet et Google Wallet : « Intégration à configurer ».
- MRR et revenus du back-office : calculés à partir des abonnements fictifs.
- « CA additionnel estimé » : hypothèse paramétrable, signalée comme non mesurée.

## Non testé ou partiellement testé

- La caméra réelle (testée seulement via la simulation de scan ; dépend du navigateur et d'HTTPS).
- Le partage natif (Web Share) et l'impression de l'affiche sur différents navigateurs.
- Les performances au-delà de quelques milliers de clients : la persistance JSON réécrit le fichier entier (~4 Mo) à chaque opération, acceptable pour une démo, pas pour la production.
- Le schéma SQL Supabase n'a pas été exécuté.

## Nécessaire avant la production

1. Base de données Supabase (UE) + implémentation `Repositories`, transactions et verrous en base, RLS testées.
2. Authentification de production (Supabase Auth), vrais emails de vérification et de réinitialisation, 2FA pour les administrateurs.
3. Stripe (abonnements, webhooks, TVA, factures conformes), gestion des impayés.
4. Fournisseurs email/SMS, désinscription, gestion des rebonds.
5. Apple Wallet et Google Wallet (comptes, certificats, mises à jour poussées).
6. Conformité : relecture juridique des CGU, politique de confidentialité, DPA ; registre des traitements ; durée de conservation appliquée par une tâche planifiée ; information en caisse. Les outils fournis ne rendent pas l'usage conforme automatiquement.
7. Exploitation : hébergement, sauvegardes, supervision (Sentry…), journaux centralisés, limitation de débit distribuée (Redis), CSP stricte, tests de charge, audit de sécurité.
8. Tâches planifiées : campagnes programmées, automatisations, expiration des récompenses (aujourd'hui déclenchées à l'affichage ou manuellement).
