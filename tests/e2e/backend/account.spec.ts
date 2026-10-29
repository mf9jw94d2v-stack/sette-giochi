import { expect, test, type Page } from "@playwright/test";
import { FakeSupabase } from "./fakeSupabase";
import {
  dailyRecord,
  GAMES,
  seedResults,
  startGame,
  todayUtc,
} from "../helpers";

/**
 * The account build against a stand-in Supabase API (see fakeSupabase.ts).
 * Test passwords below exist only inside this file and the fake.
 */

const PASSWORD = "prova-e2e-1234";
let fake: FakeSupabase;

test.beforeEach(async ({ page }) => {
  fake = new FakeSupabase();
  await fake.install(page);
});

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
}

async function signInOk(page: Page, email: string, password = PASSWORD) {
  await signIn(page, email, password);
  await expect(page).toHaveURL(/localhost:\d+\/$/);
}

/** The account entry in the shell: in the bar on desktop, in the menu on phones. */
async function accountEntry(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("button", { name: "Apri menu" }).click();
    return page.getByRole("navigation", { name: "Menu" });
  }
  return page.getByRole("banner");
}

test.describe("Accounts", () => {
  test("sign up, confirm the email, land signed in", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/signup");
    await page.getByLabel("Nome utente").fill("Nuova_Giocatrice");
    await expect(page.getByText("Disponibile.")).toBeVisible();
    await page.getByLabel("Email").fill("nuova@example.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Crea l'account" }).click();

    await expect(
      page.getByRole("heading", { name: "Controlla la posta" }),
    ).toBeVisible();
    const user = fake.userByEmail("nuova@example.test");
    expect(user?.confirmed).toBe(false);
    // The username was normalised to lowercase before it was sent.
    expect(fake.profiles.get(user!.id)?.username).toBe("nuova_giocatrice");

    await page.goto(fake.confirmationLink("nuova@example.test"));
    await expect(page).toHaveURL(/\/$/);
    const shell = await accountEntry(page, isMobile);
    await expect(
      shell.getByRole("link", { name: /nuova_giocatrice/ }),
    ).toBeVisible();
  });

  test("a taken username is caught before submitting", async ({ page }) => {
    fake.seedUser("mario@example.test", PASSWORD, "mario");
    await page.goto("/signup");
    await page.getByLabel("Nome utente").fill("mario");
    await expect(
      page.getByText("Questo nome utente è già in uso."),
    ).toBeVisible();
  });

  test("wrong password and unconfirmed email get clear messages", async ({
    page,
  }) => {
    fake.seedUser("anna@example.test", PASSWORD, "anna");
    fake.seedUser("bruno@example.test", PASSWORD, "bruno", false);

    await signIn(page, "anna@example.test", "sbagliata-123");
    await expect(page.getByRole("alert")).toContainText(
      "Email o password non corretti.",
    );

    await signIn(page, "bruno@example.test");
    await expect(page.getByRole("alert")).toContainText(
      "Devi prima confermare",
    );
    await page.getByRole("button", { name: "Invia di nuovo il link" }).click();
    await expect(
      page.getByText("Ti abbiamo inviato di nuovo il link di conferma."),
    ).toBeVisible();
  });

  test("the session survives a reload, and signing out ends it", async ({
    page,
    isMobile,
  }) => {
    fake.seedUser("carla@example.test", PASSWORD, "carla");
    await signIn(page, "carla@example.test");
    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    let shell = await accountEntry(page, isMobile);
    await expect(shell.getByRole("link", { name: /carla/ })).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "Esci" }).click();
    await expect(page).toHaveURL(/\/$/);
    shell = await accountEntry(page, isMobile);
    await expect(shell.getByRole("link", { name: /accedi/i })).toBeVisible();
    // Signing out on purpose is not reported as an expired session.
    await expect(page.getByText("La sessione è scaduta")).toHaveCount(0);
  });

  test("a private page sends guests to sign in, then back", async ({
    page,
  }) => {
    fake.seedUser("dario@example.test", PASSWORD, "dario");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
    await page.getByLabel("Email").fill("dario@example.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("heading", { name: "Account", exact: true }),
    ).toBeVisible();
  });

  test("never redirects to another site after signing in", async ({ page }) => {
    fake.seedUser("elsa@example.test", PASSWORD, "elsa");
    await page.goto("/login?next=//evil.example.test/x");
    await page.getByLabel("Email").fill("elsa@example.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("password recovery, from the request to the new password", async ({
    page,
  }) => {
    fake.seedUser("fabio@example.test", PASSWORD, "fabio");
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("fabio@example.test");
    await page.getByRole("button", { name: "Invia il link" }).click();
    await expect(page.getByText(/corrisponde a un account/)).toBeVisible();

    await page.goto(fake.recoveryLink("fabio@example.test"));
    await expect(page).toHaveURL(/\/reset-password$/);
    await page
      .getByLabel("Nuova password", { exact: true })
      .fill("nuova-password-99");
    await page.getByLabel("Ripeti la nuova password").fill("nuova-password-99");
    await page.getByRole("button", { name: "Salva la password" }).click();
    await expect(page.getByText("Password aggiornata.")).toBeVisible();
    expect(fake.userByEmail("fabio@example.test")?.password).toBe(
      "nuova-password-99",
    );
  });

  test("an expired or reused recovery link says so", async ({ page }) => {
    await page.goto("/auth/callback?token_hash=never-issued&type=recovery");
    await expect(
      page.getByRole("heading", { name: "Link non valido" }),
    ).toBeVisible();
  });
});

test.describe("Results in the account", () => {
  test("a finished daily is replayed by the server and stored once", async ({
    page,
  }) => {
    fake.seedUser("gaia@example.test", PASSWORD, "gaia");
    await signInOk(page, "gaia@example.test");

    await page.goto("/games/estimania");
    await startGame(page);
    let shown = -1;
    for (let i = 0; i < 5; i++) {
      await page.getByLabel(/La tua stima/).fill("1000");
      await page.getByRole("button", { name: "Conferma la stima" }).click();
      if (i === 4) {
        // The running total in the header, after the last answer.
        const label = await page
          .getByText(/^Punteggio \d+ su 500$/)
          .textContent();
        shown = Number(label?.match(/Punteggio (\d+)/)?.[1]);
      }
      await page
        .getByRole("button", { name: /prossima domanda|chiudi il quaderno/i })
        .click();
    }
    await expect(
      page.getByText("risultato salvato nel tuo account"),
    ).toBeVisible();

    // The score the board showed is the score the server recomputed.
    expect(fake.daily).toHaveLength(1);
    expect(fake.daily[0]).toMatchObject({
      game_id: "estimania",
      challenge_date: todayUtc(),
      verification: "server_replay",
      score: shown,
    });
    expect(fake.daily[0].answers).toEqual([1000, 1000, 1000, 1000, 1000]);

    // A reload shows the stored result instead of a second attempt.
    await page.reload();
    await expect(page.getByRole("main")).toContainText(/hai già giocato/i);
    expect(fake.daily).toHaveLength(1);

    // The page never tried to write an official result directly.
    expect(
      fake.log.filter(
        (r) => r.path === "/rest/v1/daily_results" && r.method !== "GET",
      ),
    ).toEqual([]);

    // And it shows up in the leaderboard, marked as mine.
    await page.goto("/leaderboard?game=estimania");
    await expect(page.getByRole("cell", { name: /gaia/ })).toContainText("Tu");
    await expect(page.getByText(/Sei 1° su 1 partecipante/)).toBeVisible();
  });

  test("offline: the result waits on the device, then reaches the account", async ({
    page,
    context,
  }) => {
    fake.seedUser("ivo@example.test", PASSWORD, "ivo");
    await signInOk(page, "ivo@example.test");
    await page.goto("/games/gazillion");
    await startGame(page);
    await context.setOffline(true);
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Salta" }).click();
      await page
        .getByRole("button", { name: /prossimo evento|vedi risultato/i })
        .click();
    }
    await expect(page.getByText(/sei offline/i)).toBeVisible();
    expect(fake.daily).toHaveLength(0);

    await context.setOffline(false);
    await expect(
      page.getByText(/in attesa è stato salvato nel tuo account/),
    ).toBeVisible();
    expect(fake.daily).toHaveLength(1);
    expect(fake.daily[0]).toMatchObject({ game_id: "gazillion", score: 0 });
  });

  test("guest results can be added to the account, never to rankings", async ({
    page,
  }) => {
    await seedResults(page, [dailyRecord("plain", "2026-10-01", 5100)]);
    fake.seedUser("lia@example.test", PASSWORD, "lia");
    await signInOk(page, "lia@example.test");

    const banner = page.getByRole("region", {
      name: "Risultati giocati come ospite",
    });
    await expect(banner).toContainText("1 sfide ufficiali");
    await banner
      .getByRole("button", { name: "Aggiungi al mio account" })
      .click();
    await expect(
      page.getByText(/Aggiunti 1 risultati al tuo account/),
    ).toBeVisible();
    expect(fake.daily[0]).toMatchObject({
      game_id: "plain",
      verification: "guest_import",
    });

    await page.goto("/history");
    await expect(page.getByText(/importata da ospite/)).toBeVisible();
    // The device copy is still there.
    const local = await page.evaluate(() =>
      localStorage.getItem("sgp:daily-results"),
    );
    expect(local).toContain("2026-10-01");
  });

  test("the profile can be renamed and hidden from rankings", async ({
    page,
  }) => {
    fake.seedUser("max@example.test", PASSWORD, "max");
    fake.seedUser("nina@example.test", PASSWORD, "nina");
    await signInOk(page, "max@example.test");
    await page.goto("/account");
    await page.getByLabel("Nome utente").fill("nina");
    await page.getByRole("button", { name: "Salva il profilo" }).click();
    await expect(page.getByRole("alert")).toContainText("già in uso");

    await page.getByLabel("Nome utente").fill("massimo");
    await page.getByLabel("Mostrami nelle classifiche").uncheck();
    await page.getByRole("button", { name: "Salva il profilo" }).click();
    await expect(page.getByText("Profilo salvato.")).toBeVisible();
    const p = fake.profiles.get(fake.userByEmail("max@example.test")!.id)!;
    expect(p).toMatchObject({
      username: "massimo",
      show_in_leaderboards: false,
    });
  });

  test("deleting the account needs the word, then removes everything", async ({
    page,
  }) => {
    const user = fake.seedUser("olga@example.test", PASSWORD, "olga");
    await signInOk(page, "olga@example.test");
    await page.goto("/account");
    const del = page.getByRole("button", {
      name: "Elimina definitivamente l'account",
    });
    await expect(del).toBeDisabled();
    await page.getByLabel("Per confermare scrivi ELIMINA").fill("ELIMINA");
    await del.click();
    await expect(page).toHaveURL(/\/$/);
    expect(fake.users.has(user.id)).toBe(false);
    expect(fake.profiles.has(user.id)).toBe(false);

    await signIn(page, "olga@example.test");
    await expect(page.getByRole("alert")).toContainText(
      "Email o password non corretti.",
    );
  });
});

/**
 * The other five games, through the same account path as Estimania and
 * Gazillion above: each plays its own way to the end, and the server keeps
 * the score it recomputes from the answers the board sent.
 */
const PLAYTHROUGHS: Record<
  string,
  { rounds: number; play: (page: Page) => Promise<void> }
> = {
  krillion: {
    rounds: 7,
    play: async (page) => {
      for (let i = 0; i < 7; i++) {
        await page.getByRole("button", { name: "[ PASSA ]" }).click();
        await page
          .getByRole("button", { name: /\[ (PROSSIMA|RISALI) \]/ })
          .click();
      }
    },
  },
  plain: {
    rounds: 7,
    play: async (page) => {
      for (let i = 0; i < 7; i++) {
        await page.getByRole("button", { name: "Salta" }).click();
        await page.getByRole("button", { name: /^(Avanti|Atterra)$/ }).click();
      }
    },
  },
  "fact-map": {
    rounds: 5,
    play: async (page) => {
      for (let i = 0; i < 5; i++) {
        await page.getByRole("button", { name: "Passa", exact: true }).click();
        await page
          .getByRole("button", { name: /prossima tappa|apri il diario/i })
          .click();
      }
    },
  },
  "size-it-up": {
    rounds: 5,
    // Real answers this time: lock each comparison at the starting scale.
    play: async (page) => {
      for (let i = 0; i < 5; i++) {
        await page.getByRole("button", { name: /^Blocca la scala/ }).click();
        await page
          .getByRole("button", {
            name: /prossimo confronto|vedi il risultato/i,
          })
          .click();
      }
    },
  },
  geoslice: {
    rounds: 3,
    // Real answers: cut every region with the line where it starts.
    play: async (page) => {
      for (let i = 0; i < 3; i++) {
        await page.getByRole("button", { name: "Taglia", exact: true }).click();
        await page
          .getByRole("button", { name: /prossima regione|rapporto finale/i })
          .click();
      }
    },
  },
};

test.describe("Every game saves to the account", () => {
  for (const [gameId, { rounds, play }] of Object.entries(PLAYTHROUGHS)) {
    test(`${gameId}: played to the end, stored once with the server's score`, async ({
      page,
    }) => {
      fake.seedUser(
        `${gameId}@example.test`,
        PASSWORD,
        gameId.replace("-", "_"),
      );
      await signInOk(page, `${gameId}@example.test`);
      await page.goto(`/games/${gameId}`);
      const game = GAMES.find((g) => g.id === gameId)!;
      await startGame(page, game.start);
      await play(page);
      await expect(
        page.getByText("risultato salvato nel tuo account"),
      ).toBeVisible();

      expect(fake.daily).toHaveLength(1);
      const row = fake.daily[0];
      expect(row).toMatchObject({
        game_id: gameId,
        challenge_date: todayUtc(),
        verification: "server_replay",
      });
      expect(row.answers).toHaveLength(rounds);
      if (gameId === "size-it-up" || gameId === "geoslice") {
        expect((row.answers as unknown[]).every((a) => a !== null)).toBe(true);
      }

      await page.reload();
      await expect(page.getByRole("main")).toContainText(
        /hai già giocato|già giocat/i,
      );
      expect(fake.daily).toHaveLength(1);
    });
  }
});
