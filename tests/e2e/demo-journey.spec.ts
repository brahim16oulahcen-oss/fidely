import { test, expect, type Page } from "@playwright/test";

/**
 * Parcours de démonstration de la section 24 du cahier des charges, de bout en bout,
 * sans aucune modification de code ni de données à la main.
 */
const stamp = Date.now().toString(36);
const OWNER = { name: "Alice Testeur", email: `alice.${stamp}@exemple.fr`, password: "motdepasse-solide-1" };
const SHOP = `Café Test ${stamp}`;
const CLIENT = { first: "Paul", last: "Durand", email: `paul.${stamp}@exemple.fr` };

async function addStamp(page: Page, expected: string) {
  await page.getByTestId("earn-button").click();
  // Anti-fraude : deux passages rapprochés exigent la confirmation d'un responsable.
  const override = page.getByRole("button", { name: "Confirmer quand même" });
  const count = page.getByTestId("stamps-count");
  await expect(override.or(count.filter({ hasText: expected }))).toBeVisible();
  if (await override.isVisible()) await override.click();
  await expect(count).toContainText(expected);
}

test("parcours de démonstration complet (20 étapes)", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. Landing page
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vos clients reviennent.");

  // 2. Essayer gratuitement
  await page.getByTestId("cta-signup").click();
  await expect(page).toHaveURL(/\/inscription/);
  await page.getByTestId("signup-name").fill(OWNER.name);
  await page.getByTestId("signup-email").fill(OWNER.email);
  await page.getByTestId("signup-password").fill(OWNER.password);
  await page.getByTestId("signup-terms").click();
  await page.getByTestId("signup-submit").click();

  // Vérification email simulée (boîte de réception de démonstration)
  await expect(page).toHaveURL(/\/verification-email/);
  const code = (await page.getByTestId("demo-code").innerText()).trim();
  await page.getByTestId("verify-code").fill(code);
  await page.getByTestId("verify-submit").click();

  // 3. Créer un commerce fictif
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByTestId("ob-name").fill(SHOP);
  await page.getByTestId("ob-address").fill("3 place du Vieux-Marché");
  await page.getByTestId("ob-next").click();

  // 5. Personnaliser la carte (palette)
  await page.getByRole("button", { name: /^Palette / }).nth(1).click();
  await page.getByTestId("ob-next").click();

  // 4. Programme « 10 cafés = 1 gratuit »
  await page.getByTestId("rule-stamps-required").fill("10");
  await page.getByTestId("rule-reward-name").fill("1 café offert");
  await expect(page.getByText("10 passages = 1 café offert").first()).toBeVisible();
  await page.getByTestId("ob-next").click();
  await page.getByTestId("ob-next").click(); // récompenses → création

  // 6. QR code d'inscription généré
  const signupUrl = (await page.getByTestId("ob-signup-url").innerText()).trim();
  expect(signupUrl).toMatch(/\/rejoindre\/[a-z0-9-]+\?src=qr$/);
  await expect(page.getByRole("img", { name: "QR code d'inscription" })).toBeVisible();

  // 7-9. Page client : inscription et carte web (contexte séparé = téléphone du client)
  const customer = await context.browser()!.newContext();
  const phone = await customer.newPage();
  await phone.goto(signupUrl);
  await expect(phone.getByRole("heading", { level: 1 })).toContainText(SHOP);
  await phone.getByTestId("join-firstname").fill(CLIENT.first);
  await phone.getByTestId("join-lastname").fill(CLIENT.last);
  await phone.getByTestId("join-email").fill(CLIENT.email);
  await phone.getByTestId("join-terms").click();
  await phone.getByLabel("Recevoir les offres par email").click();
  await phone.getByTestId("join-submit").click();
  await expect(phone).toHaveURL(/\/carte\/[^/]+\?bienvenue=1/);
  await expect(phone.getByTestId("customer-balance")).toHaveText("0 / 10");
  const scanCode = (await phone.getByText(/^FDL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/).first().innerText()).trim();

  // 10-11. Espace employé : scanner la carte (simulation de scan avec le code du QR)
  await page.getByTestId("ob-dashboard").click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/scanner");
  await page.getByRole("tab", { name: /Simulation/ }).click();
  await page.getByTestId("scan-code-input").fill(scanCode);
  await page.getByRole("button", { name: "Lire" }).click();
  await expect(page.getByTestId("card-customer-name")).toContainText(CLIENT.first);

  // 12-13. Ajouter des tampons jusqu'au seuil
  for (let i = 1; i <= 10; i++) await addStamp(page, `${i % 10}/10`);

  // 14. Récompense débloquée
  await expect(page.getByTestId("available-rewards")).toContainText(/café offert/i);
  await expect(page.getByTestId("stamps-count")).toContainText("0/10");
  // La carte client se met à jour (rafraîchissement automatique)
  await expect(phone.getByTestId("customer-reward-available")).toBeVisible({ timeout: 20_000 });

  // 15. Utiliser la récompense
  await page.getByTestId("redeem-button").first().click();
  await page.getByRole("button", { name: "Valider l'utilisation" }).click();
  await expect(page.getByTestId("available-rewards")).not.toContainText(/café offert/i);

  // 16. Historique
  await expect(page.getByTestId("card-history")).toContainText(/Récompense utilisée|utilisée/i);
  await phone.getByRole("tab", { name: "Mon historique" }).click();
  await expect(phone.getByTestId("customer-history").locator("li")).toHaveCount(11, { timeout: 20_000 }); // 10 tampons + 1 récompense utilisée;

  // 17. Dashboard mis à jour
  await page.goto("/app");
  await expect(page.getByTestId("kpi-total-value")).toHaveText("1");
  await expect(page.getByTestId("kpi-visits-value")).toHaveText("10");
  await expect(page.getByTestId("kpi-redeemed-value")).toHaveText("1");

  // 18. Campagne simulée (le client a consenti à l'email)
  await page.goto("/app/campagnes/nouvelle");
  await page.getByTestId("campaign-name").fill("Offre de test");
  await page.getByTestId("campaign-subject").fill("Une surprise vous attend");
  await page.getByTestId("campaign-message").fill("Bonjour {prenom}, passez nous voir cette semaine !");
  await expect(page.getByTestId("audience-consenting")).toHaveText("1");
  await page.getByTestId("campaign-submit").click();
  await expect(page).toHaveURL(/\/app\/campagnes$/);
  await expect(page.getByText("Offre de test")).toBeVisible();

  // 19. Statistiques
  await page.goto("/app/analytics");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Analytics");

  // 20. Back-office administrateur (compte admin de démonstration)
  await context.clearCookies();
  await page.goto("/connexion");
  await page.locator("#l-email").fill("admin@demo.fidely.example");
  await page.locator("#l-pwd").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/commercants");
  await expect(page.getByText(SHOP)).toBeVisible();

  expect(errors, "aucune erreur JavaScript côté client").toEqual([]);
  await customer.close();
});
