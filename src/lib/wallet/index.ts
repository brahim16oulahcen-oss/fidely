/**
 * Fournisseurs Wallet. Seul DemoWalletProvider (carte web) est réellement fonctionnel.
 * Apple et Google exigent des certificats / un compte émetteur : sans configuration,
 * ils renvoient explicitement l'état « not_configured ». Voir docs/WALLET.md.
 */
export type WalletProviderId = "apple" | "google" | "web";

export interface WalletPassRequest {
  cardToken: string;
  scanCode: string;
  programName: string;
  merchantName: string;
  colors: { background: string; text: string; accent: string };
  balanceLabel: string;
}

export type WalletPassResult =
  | { status: "ready"; url: string }
  | { status: "not_configured"; missing: string[]; docs: string };

export interface WalletProvider {
  id: WalletProviderId;
  label: string;
  isConfigured(): boolean;
  missingConfiguration(): string[];
  createPass(req: WalletPassRequest): Promise<WalletPassResult>;
}

const missing = (keys: string[]) => keys.filter((k) => !process.env[k]);

export const DemoWalletProvider: WalletProvider = {
  id: "web",
  label: "Carte web",
  isConfigured: () => true,
  missingConfiguration: () => [],
  async createPass(req) {
    return { status: "ready", url: `/carte/${req.cardToken}` };
  },
};

const APPLE_KEYS = ["APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_PASS_CERT_P12_BASE64", "APPLE_PASS_CERT_PASSWORD", "APPLE_WWDR_CERT_BASE64"];
export const AppleWalletProvider: WalletProvider = {
  id: "apple",
  label: "Apple Wallet",
  // Tant que la signature .pkpass n'est pas implémentée, l'intégration reste « à configurer »
  // même si les variables d'environnement sont présentes : aucun faux bouton fonctionnel.
  isConfigured: () => false,
  missingConfiguration: () => [...missing(APPLE_KEYS), "Implémentation de la signature .pkpass"],
  async createPass() {
    const m = missing(APPLE_KEYS);
    if (m.length) return { status: "not_configured", missing: m, docs: "/docs/wallet" };
    // Génération .pkpass (pass.json + manifest SHA-1 + signature PKCS#7) à implémenter, ex. via passkit-generator.
    return { status: "not_configured", missing: ["Implémentation de la signature .pkpass"], docs: "/docs/wallet" };
  },
};

const GOOGLE_KEYS = ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64"];
export const GoogleWalletProvider: WalletProvider = {
  id: "google",
  label: "Google Wallet",
  isConfigured: () => false,
  missingConfiguration: () => [...missing(GOOGLE_KEYS), "Implémentation de l'API Google Wallet (LoyaltyObject + JWT)"],
  async createPass() {
    const m = missing(GOOGLE_KEYS);
    if (m.length) return { status: "not_configured", missing: m, docs: "/docs/wallet" };
    // Création LoyaltyClass/LoyaltyObject + JWT « Save to Google Wallet » à implémenter.
    return { status: "not_configured", missing: ["Implémentation de l'API Google Wallet (LoyaltyObject + JWT)"], docs: "/docs/wallet" };
  },
};

export const walletProviders = { apple: AppleWalletProvider, google: GoogleWalletProvider, web: DemoWalletProvider };
