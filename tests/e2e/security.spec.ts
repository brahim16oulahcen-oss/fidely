import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/connexion");
  await page.locator("#l-email").fill(email);
  await page.locator("#l-pwd").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
}

test("un employé n'accède ni aux statistiques ni aux réglages", async ({ page }) => {
  await login(page, "lucas@demo.fidely.example");
  await expect(page).toHaveURL(/\/app\/scanner/);
  for (const p of ["/app", "/app/analytics", "/app/parametres", "/app/campagnes", "/app/abonnement"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/app\/scanner/);
  }
});

test("pages protégées sans session → connexion", async ({ page }) => {
  for (const p of ["/app", "/admin", "/onboarding"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/connexion/);
  }
});

test("un commerçant n'accède pas au back-office ni à l'export d'un autre commerce", async ({ page, request }) => {
  await login(page, "karim@demo.fidely.example");
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
  const res = await page.request.get("/api/export/clients");
  expect(res.status()).toBe(200);
  const csv = await res.text();
  expect(csv).not.toContain("lea.martin@example.com"); // cliente du Café, pas du Barber
  const anon = await request.get("/api/export/clients");
  expect([401, 403, 307, 302]).toContain(anon.status());
});

test("un lien de carte inconnu renvoie 404", async ({ page }) => {
  const r = await page.goto("/carte/jeton-invalide");
  expect(r?.status()).toBe(404);
});

test("réinitialiser la démo", async ({ page }) => {
  await page.goto("/demo");
  await page.getByTestId("demo-reset").click();
  await page.getByRole("button", { name: "Réinitialiser" }).last().click();
  await expect(page).toHaveURL(/reinitialise=1/);
  await expect(page.getByText("Démo réinitialisée")).toBeVisible();
});
