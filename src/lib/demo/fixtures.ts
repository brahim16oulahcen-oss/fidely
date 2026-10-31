import type { BrandColors, MerchantCategory, MerchantStatus, PlanId, ProgramRules } from "@/types/domain";

export const FIRST_NAMES = [
  "Léa", "Emma", "Chloé", "Manon", "Camille", "Inès", "Jade", "Louise", "Zoé", "Clara", "Alice", "Lina", "Sarah",
  "Juliette", "Lucie", "Anaïs", "Pauline", "Mathilde", "Margaux", "Élise", "Nina", "Rose", "Agathe", "Charlotte",
  "Hugo", "Lucas", "Louis", "Gabriel", "Arthur", "Jules", "Adam", "Raphaël", "Tom", "Nathan", "Théo", "Paul",
  "Maxime", "Antoine", "Mathis", "Clément", "Baptiste", "Victor", "Quentin", "Romain", "Yanis", "Karim", "Mehdi",
  "Thomas", "Nicolas", "Julien", "Sofiane", "Bastien", "Florian", "Aurélien", "Benoît", "Martin", "Simon", "Malik",
  "Amine", "Yasmine", "Nadia", "Fatou", "Aïcha", "Sonia", "Céline", "Sandrine", "Nathalie", "Isabelle", "Valérie",
  "Christophe", "Philippe", "Olivier", "Laurent", "Stéphane", "Marc", "Éric", "Bruno", "Patrick",
];

export const LAST_NAMES = [
  "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon",
  "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard",
  "André", "Lefèvre", "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand", "Garnier",
  "Faure", "Rousseau", "Blanc", "Guérin", "Muller", "Henry", "Roussel", "Nicolas", "Perrin", "Morin", "Mathieu",
  "Clément", "Gauthier", "Dumont", "Lopez", "Fontaine", "Chevalier", "Robin", "Masson", "Sanchez", "Gérard",
  "Nguyen", "Boyer", "Denis", "Lemaire", "Duval", "Joly", "Gautier", "Roger", "Roche", "Roy", "Noël", "Meyer",
  "Lucas", "Meunier", "Jean", "Perez", "Marchand", "Dufour", "Blanchard", "Marie", "Barbier", "Brun", "Dumas",
  "Brunet", "Schmitt", "Leroux", "Colin", "Fernandez", "Benali", "Haddad", "Diallo", "Lemoine", "Hébert", "Lecomte",
];

export interface MerchantFixture {
  key: string;
  name: string;
  slug: string;
  category: MerchantCategory;
  icon: string;
  description: string;
  address: string;
  postalCode: string;
  colors: BrandColors;
  planId: PlanId;
  status: MerchantStatus;
  customers: number;
  monthsActive: number;
  avgBasketCents: number;
  basketSdCents: number;
  meanIntervalDays: number;
  openHours: [number, number];
  programName: string;
  rules: ProgramRules;
  /** Règles précédentes (démontre la non-rétroactivité), appliquées avant `rulesChangedDaysAgo`. */
  previousRules?: ProgramRules;
  rulesChangedDaysAgo?: number;
  rewards: { name: string; description: string; cost: number; validityDays: number; quantity: number | null; autoUnlock: boolean; main?: boolean }[];
  stores: { name: string; address: string }[];
  owner: { name: string; email: string };
  staff?: { name: string; email: string; role: "manager" | "staff" }[];
  detailed: boolean;
  suspendedReason?: string;
}

export const MERCHANT_FIXTURES: MerchantFixture[] = [
  {
    key: "cafe",
    name: "Café Rouen Centre",
    slug: "cafe-rouen-centre",
    category: "cafe",
    icon: "Coffee",
    description: "Coffee shop de spécialité au cœur du centre historique.",
    address: "12 rue du Gros-Horloge",
    postalCode: "76000",
    colors: { primary: "#3B2416", text: "#FFF7ED", accent: "#F59E0B" },
    planId: "pro",
    status: "active",
    customers: 230,
    monthsActive: 9,
    avgBasketCents: 520,
    basketSdCents: 180,
    meanIntervalDays: 8,
    openHours: [8, 18],
    programName: "Carte Café",
    rules: { type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 },
    previousRules: { type: "stamps", stampsRequired: 12, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 },
    rulesChangedDaysAgo: 120,
    rewards: [
      { name: "Café offert", description: "Une boisson chaude au choix, format standard.", cost: 10, validityDays: 60, quantity: null, autoUnlock: true, main: true },
      { name: "Cadeau anniversaire", description: "Une pâtisserie offerte pour votre anniversaire.", cost: 0, validityDays: 30, quantity: null, autoUnlock: false },
    ],
    stores: [{ name: "Café Rouen Centre", address: "12 rue du Gros-Horloge, 76000 Rouen" }],
    owner: { name: "Julien Moreau", email: "julien@demo.fidely.example" },
    staff: [{ name: "Lucas Petit", email: "lucas@demo.fidely.example", role: "staff" }],
    detailed: true,
  },
  {
    key: "barber",
    name: "Barber Studio",
    slug: "barber-studio",
    category: "barber",
    icon: "Scissors",
    description: "Barbier et coiffure homme, quartier Saint-Marc.",
    address: "48 rue Saint-Hilaire",
    postalCode: "76000",
    colors: { primary: "#0F172A", text: "#F8FAFC", accent: "#22D3EE" },
    planId: "pro",
    status: "active",
    customers: 130,
    monthsActive: 8,
    avgBasketCents: 2600,
    basketSdCents: 700,
    meanIntervalDays: 30,
    openHours: [9, 19],
    programName: "Club Barber",
    rules: { type: "points", pointsPerEuro: 1, welcomePoints: 10 },
    rewards: [
      { name: "Soin barbe offert", description: "Taille et soin de la barbe.", cost: 80, validityDays: 90, quantity: null, autoUnlock: false },
      { name: "Coupe offerte", description: "Une coupe homme classique offerte.", cost: 150, validityDays: 90, quantity: null, autoUnlock: false },
      { name: "Produit coiffant", description: "Cire ou pommade de la marque maison.", cost: 200, validityDays: 90, quantity: 40, autoUnlock: false },
    ],
    stores: [{ name: "Barber Studio", address: "48 rue Saint-Hilaire, 76000 Rouen" }],
    owner: { name: "Karim Haddad", email: "karim@demo.fidely.example" },
    detailed: true,
  },
  {
    key: "bakery",
    name: "Maison du Pain",
    slug: "maison-du-pain",
    category: "bakery",
    icon: "Croissant",
    description: "Boulangerie artisanale au levain, depuis 1987.",
    address: "3 place du Vieux-Marché",
    postalCode: "76000",
    colors: { primary: "#7C2D12", text: "#FFFBEB", accent: "#FBBF24" },
    planId: "starter",
    status: "active",
    customers: 185,
    monthsActive: 7,
    avgBasketCents: 410,
    basketSdCents: 160,
    meanIntervalDays: 7,
    openHours: [7, 19],
    programName: "Carte Gourmande",
    rules: { type: "stamps", stampsRequired: 12, stampsPerVisit: 1, rewardName: "1 viennoiserie offerte", rewardValidityDays: 30 },
    rewards: [
      { name: "Viennoiserie offerte", description: "Croissant, pain au chocolat ou chausson.", cost: 12, validityDays: 30, quantity: null, autoUnlock: true, main: true },
    ],
    stores: [{ name: "Maison du Pain", address: "3 place du Vieux-Marché, 76000 Rouen" }],
    owner: { name: "Julien Moreau", email: "julien@demo.fidely.example" },
    detailed: true,
  },
  {
    key: "beauty",
    name: "Beauty Atelier",
    slug: "beauty-atelier",
    category: "beauty",
    icon: "Sparkles",
    description: "Institut de beauté, soins visage et onglerie.",
    address: "21 rue Jeanne-d'Arc",
    postalCode: "76000",
    colors: { primary: "#831843", text: "#FDF2F8", accent: "#F9A8D4" },
    planId: "business",
    status: "active",
    customers: 140,
    monthsActive: 10,
    avgBasketCents: 5400,
    basketSdCents: 1800,
    meanIntervalDays: 34,
    openHours: [10, 19],
    programName: "Cercle Beauty",
    rules: {
      type: "tiers",
      pointsPerEuro: 1,
      silverThreshold: 300,
      goldThreshold: 800,
      multipliers: { bronze: 1, silver: 1.25, gold: 1.5 },
      benefits: { bronze: "Accès au programme", silver: "Points ×1,25", gold: "Points ×1,5 et soin offert annuel" },
    },
    rewards: [
      { name: "Réduction de 10 €", description: "Valable sur toute prestation.", cost: 200, validityDays: 90, quantity: null, autoUnlock: false },
      { name: "Soin visage offert", description: "Soin éclat 45 minutes.", cost: 450, validityDays: 90, quantity: null, autoUnlock: false },
      { name: "Cadeau anniversaire", description: "Pose de vernis offerte le mois de votre anniversaire.", cost: 0, validityDays: 30, quantity: null, autoUnlock: false },
    ],
    stores: [
      { name: "Beauty Atelier — Jeanne-d'Arc", address: "21 rue Jeanne-d'Arc, 76000 Rouen" },
      { name: "Beauty Atelier — Rive Gauche", address: "8 avenue de Bretagne, 76100 Rouen" },
    ],
    owner: { name: "Sophie Lambert", email: "sophie@demo.fidely.example" },
    staff: [{ name: "Inès Garcia", email: "ines@demo.fidely.example", role: "manager" }],
    detailed: true,
  },
  {
    key: "restaurant",
    name: "Restaurant Le Comptoir",
    slug: "le-comptoir",
    category: "restaurant",
    icon: "UtensilsCrossed",
    description: "Bistrot de saison, cuisine normande revisitée.",
    address: "5 quai de la Bourse",
    postalCode: "76000",
    colors: { primary: "#14532D", text: "#F0FDF4", accent: "#86EFAC" },
    planId: "pro",
    status: "active",
    customers: 160,
    monthsActive: 8,
    avgBasketCents: 3400,
    basketSdCents: 1300,
    meanIntervalDays: 22,
    openHours: [12, 22],
    programName: "Le Comptoir Fidèle",
    rules: { type: "cashback", percent: 5, minPurchaseCents: 1500, maxCreditPerTxCents: 1000 },
    rewards: [
      { name: "Dessert offert", description: "Dessert du jour offert pour votre anniversaire.", cost: 0, validityDays: 30, quantity: null, autoUnlock: false },
    ],
    stores: [{ name: "Le Comptoir", address: "5 quai de la Bourse, 76000 Rouen" }],
    owner: { name: "Thomas Leroy", email: "thomas@demo.fidely.example" },
    staff: [{ name: "Manon Faure", email: "manon@demo.fidely.example", role: "staff" }],
    detailed: true,
  },
  {
    key: "pizzeria",
    name: "Pizzeria Saint-Marc",
    slug: "pizzeria-saint-marc",
    category: "restaurant",
    icon: "Pizza",
    description: "Pizzas au feu de bois.",
    address: "2 place Saint-Marc",
    postalCode: "76000",
    colors: { primary: "#991B1B", text: "#FEF2F2", accent: "#FCA5A5" },
    planId: "pro",
    status: "suspended",
    suspendedReason: "Impayé simulé — 2 échéances en retard",
    customers: 40,
    monthsActive: 6,
    avgBasketCents: 1800,
    basketSdCents: 600,
    meanIntervalDays: 20,
    openHours: [11, 22],
    programName: "Carte Pizza",
    rules: { type: "stamps", stampsRequired: 8, stampsPerVisit: 1, rewardName: "1 pizza offerte", rewardValidityDays: 60 },
    rewards: [{ name: "Pizza offerte", description: "Pizza au choix.", cost: 8, validityDays: 60, quantity: null, autoUnlock: true, main: true }],
    stores: [{ name: "Pizzeria Saint-Marc", address: "2 place Saint-Marc, 76000 Rouen" }],
    owner: { name: "Marco Rossi", email: "marco@demo.fidely.example" },
    detailed: false,
  },
  {
    key: "fleurs",
    name: "Fleurs & Co",
    slug: "fleurs-et-co",
    category: "florist",
    icon: "Flower2",
    description: "Fleuriste créateur.",
    address: "17 rue Beauvoisine",
    postalCode: "76000",
    colors: { primary: "#365314", text: "#F7FEE7", accent: "#BEF264" },
    planId: "starter",
    status: "cancelled",
    customers: 25,
    monthsActive: 5,
    avgBasketCents: 2900,
    basketSdCents: 900,
    meanIntervalDays: 40,
    openHours: [9, 19],
    programName: "Carte Fleurie",
    rules: { type: "stamps", stampsRequired: 6, stampsPerVisit: 1, rewardName: "1 bouquet offert", rewardValidityDays: 60 },
    rewards: [{ name: "Bouquet offert", description: "Petit bouquet de saison.", cost: 6, validityDays: 60, quantity: null, autoUnlock: true, main: true }],
    stores: [{ name: "Fleurs & Co", address: "17 rue Beauvoisine, 76000 Rouen" }],
    owner: { name: "Claire Dumont", email: "claire@demo.fidely.example" },
    detailed: false,
  },
  {
    key: "librairie",
    name: "Librairie du Vieux-Marché",
    slug: "librairie-vieux-marche",
    category: "bookshop",
    icon: "BookOpen",
    description: "Librairie indépendante.",
    address: "9 rue de la Pie",
    postalCode: "76000",
    colors: { primary: "#1E3A8A", text: "#EFF6FF", accent: "#93C5FD" },
    planId: "starter",
    status: "trial",
    customers: 18,
    monthsActive: 1,
    avgBasketCents: 2200,
    basketSdCents: 900,
    meanIntervalDays: 18,
    openHours: [10, 19],
    programName: "Carte Lecteur",
    rules: { type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "5 € de réduction", rewardValidityDays: 90 },
    rewards: [{ name: "Réduction de 5 €", description: "Sur l'achat d'un livre.", cost: 10, validityDays: 90, quantity: null, autoUnlock: true, main: true }],
    stores: [{ name: "Librairie du Vieux-Marché", address: "9 rue de la Pie, 76000 Rouen" }],
    owner: { name: "Hélène Marchand", email: "helene@demo.fidely.example" },
    detailed: false,
  },
];

export const DEMO_PASSWORD = "demo1234";
export const DEMO_ADMIN = { name: "Nora Benali", email: "admin@demo.fidely.example" };
export const DEMO_CUSTOMER_EMAIL = "lea.martin@example.com";
