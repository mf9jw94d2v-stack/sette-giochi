import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FakeSupabase } from "./fakeSupabase";

/** The account pages, through the same automated checks as the rest. */
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const violations = async (page: import("@playwright/test").Page) =>
  (await new AxeBuilder({ page }).withTags(tags).analyze()).violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 4)
        .join(" | ")}`,
  );

for (const theme of ["light", "dark"] as const) {
  test(`account pages pass automated checks, ${theme} theme`, async ({
    page,
  }) => {
    const fake = new FakeSupabase();
    await fake.install(page);
    fake.seedUser("ada@example.test", "prova-e2e-1234", "ada");
    await page.addInitScript(
      (t) => localStorage.setItem("sgp-theme", t),
      theme,
    );
    for (const path of [
      "/login",
      "/signup",
      "/forgot-password",
      "/leaderboard",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await violations(page), path).toEqual([]);
    }
    // A form showing an error, and the private pages once signed in.
    await page.goto("/login");
    await page.getByLabel("Email").fill("ada@example.test");
    await page.getByLabel("Password", { exact: true }).fill("sbagliata-0000");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(await violations(page), "login error").toEqual([]);
    await page.getByLabel("Password", { exact: true }).fill("prova-e2e-1234");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    for (const path of ["/account", "/profile", "/leaderboard"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await violations(page), path).toEqual([]);
    }
  });
}
