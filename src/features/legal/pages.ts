import { brand } from "@/config/brand";

/**
 * Modèles de pages légales du prototype. Ce sont des TRAMES à faire relire par un juriste :
 * elles ne rendent pas l'usage de Fidely conforme au RGPD automatiquement.
 */
export interface LegalPage {
  title: string;
  sections: { h: string; p: string[] }[];
}

const DRAFT = "Document modèle du prototype — à compléter et faire valider par un professionnel du droit avant toute mise en production.";

export const LEGAL_PAGES: Record<string, LegalPage> = {
  mentions: {
    title: "Mentions légales",
    sections: [
      { h: "Éditeur", p: [`${brand.legalName}. Siège : ${brand.city} (adresse à compléter). RCS, capital social et numéro de TVA : à compléter.`, `Contact : ${brand.supportEmail}.`] },
      { h: "Hébergement", p: ["Hébergeur à désigner lors de la mise en production (nom, adresse, téléphone). Les données de production doivent être hébergées dans l'Union européenne."] },
      { h: "Statut du site", p: ["Ce site est un prototype de démonstration. Les commerces, clients, transactions et factures affichés sont fictifs."] },
    ],
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    sections: [
      { h: "Objet", p: [`Les présentes conditions encadrent l'utilisation de la plateforme ${brand.name} par les commerçants (« Clients professionnels ») pour gérer un programme de fidélité digital.`] },
      { h: "Compte et accès", p: ["Le commerçant est responsable de la confidentialité de ses identifiants et des accès qu'il accorde à son équipe (rôles propriétaire, manager, employé)."] },
      { h: "Abonnement", p: ["Abonnement mensuel sans engagement, essai gratuit de 14 jours. Les limites de chaque offre (clients, employés, établissements) sont décrites sur la page Tarifs."] },
      { h: "Responsabilités", p: ["Le commerçant définit librement les règles et récompenses de son programme et en assume l'exécution auprès de ses clients. Fidely fournit l'outil technique."] },
      { h: "Résiliation", p: ["Le commerçant peut résilier à tout moment. Ses données lui sont restituables sur demande (export CSV) puis supprimées dans un délai à définir."] },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    sections: [
      { h: "Qui est responsable ?", p: ["Pour les données des clients finaux (porteurs de carte), le responsable de traitement est le commerce auprès duquel la carte a été créée. Fidely agit en tant que sous-traitant (article 28 du RGPD).", `Pour les données des commerçants utilisateurs de la plateforme, ${brand.name} est responsable de traitement.`] },
      { h: "Données collectées", p: ["Client final : prénom, nom (facultatif), email, téléphone (facultatif), date d'anniversaire (facultative), historique des passages et récompenses, choix de consentement.", "Le QR code de la carte ne contient qu'un identifiant aléatoire, sans donnée personnelle."] },
      { h: "Finalités et bases légales", p: ["Gestion de la carte de fidélité : exécution du contrat d'adhésion au programme.", "Envoi d'offres par email ou SMS : consentement, distinct de l'adhésion, recueilli et horodaté. Il peut être retiré à tout moment depuis la carte ou via le lien de désinscription."] },
      { h: "Durée de conservation", p: ["Jusqu'à 3 ans après le dernier passage, puis suppression ou anonymisation. Durée à valider par chaque commerçant."] },
      { h: "Vos droits", p: ["Accès, rectification, effacement, portabilité, opposition et limitation. Depuis votre carte, onglet « Mes données », vous pouvez télécharger vos données et supprimer votre carte. Vous pouvez aussi contacter le commerce ou saisir la CNIL."] },
      { h: "Sous-traitants", p: ["En production : hébergement, envoi d'emails et de SMS, paiement, Apple et Google pour les cartes Wallet si vous les utilisez. Liste à compléter."] },
    ],
  },
  traitement: {
    title: "Accord de traitement des données (DPA)",
    sections: [
      { h: "Rôles", p: ["Le commerçant est responsable de traitement des données de ses clients finaux ; Fidely est sous-traitant et ne traite ces données que sur instruction du commerçant, pour faire fonctionner le programme de fidélité."] },
      { h: "Mesures techniques", p: ["Isolation stricte des données par commerce, contrôle d'accès par rôle, journal d'audit des opérations sensibles, identifiants de carte aléatoires, export et suppression à la demande.", "Prévu pour la production : chiffrement au repos, sauvegardes, politiques RLS en base, registre des traitements, procédure de notification des violations sous 72 h."] },
      { h: "Obligations du commerçant", p: ["Informer ses clients (affichage en caisse, conditions du programme), ne pas importer de contacts sans consentement pour la prospection, répondre aux demandes d'exercice des droits."] },
    ],
  },
  "conditions-programme": {
    title: "Conditions du programme de fidélité",
    sections: [
      { h: "Adhésion", p: ["L'adhésion est gratuite et sans obligation d'achat. Elle donne accès à une carte de fidélité digitale propre au commerce choisi."] },
      { h: "Fonctionnement", p: ["Les tampons, points ou crédits sont attribués uniquement par le personnel du commerce lors d'un passage en caisse. Les règles en vigueur sont affichées sur la carte.", "En cas de modification des règles par le commerce, les avantages déjà acquis sont conservés."] },
      { h: "Récompenses", p: ["Les récompenses ont une durée de validité affichée sur la carte. Elles ne sont ni échangeables ni remboursables en espèces, sauf mention contraire du commerce."] },
      { h: "Fin de l'adhésion", p: ["Vous pouvez supprimer votre carte à tout moment depuis l'onglet « Mes données ». Le solde et les récompenses non utilisés sont alors perdus."] },
    ],
  },
};

export const LEGAL_DRAFT_NOTICE = DRAFT;
