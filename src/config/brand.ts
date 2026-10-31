/**
 * Identité du produit — modifier ici pour renommer la plateforme partout.
 */
export const brand = {
  name: "Fidely",
  legalName: "Fidely SAS (société fictive — prototype)",
  tagline: "Transformez chaque visite en une relation durable.",
  promise: "Des cartes de fidélité digitales, des clients qui reviennent et une croissance mesurable.",
  supportEmail: "support@fidely.example",
  city: "Rouen",
  domain: "fidely.example",
} as const;

export type Brand = typeof brand;
