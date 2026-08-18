import { expect, test, type Page } from "@playwright/test";

/**
 * The education showcase, walletless paths: chrome branching, the fake
 * localStorage sessions, the client-side registry, and delete-account
 * semantics. The wallet flows themselves (PID sign-in, issuance, payment,
 * verification) need a phone Wallet and OWS webhooks, so they stay manual.
 */

const NS = "giga.showcase.";

/**
 * Seed showcase state exactly once, from a lightweight same-origin page.
 * Not addInitScript: that re-runs on every navigation and would resurrect
 * keys the app deliberately deleted.
 */
async function seedState(page: Page, entries: Record<string, unknown>) {
  await page.goto("/showcase");
  await page.evaluate(
    ([ns, seeded]) => {
      localStorage.setItem(`${ns}version`, "1");
      for (const [key, value] of Object.entries(seeded as Record<string, unknown>)) {
        localStorage.setItem(`${ns}${key}`, JSON.stringify(value));
      }
    },
    [NS, entries] as const,
  );
}

function readKey(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), `${NS}${key}`);
}

const NOW = new Date().toISOString();

const LEARNER = {
  pseudonym: "e2e-pseudonym",
  displayName: "Test Learner",
  prefill: null,
  ulid: null,
  individualId: null,
  createdAt: NOW,
};

const APPLICATION = {
  id: "app_E2E00000000000000001",
  learnerPseudonym: "e2e-pseudonym",
  learnerName: "Test Learner",
  institutionId: "ins-riverside",
  institutionName: "Riverside Secondary School",
  esrRef: "ESR-SCH-0042",
  status: "submitted",
  form: {
    firstName: "Test",
    familyName: "Learner",
    dateOfBirth: "2008-01-01",
    email: "test@example.invalid",
    address: "1 Demo Street",
    priorEducation: "",
    specialSupport: "",
    consentAnalytics: false,
    consentEmployerSharing: false,
  },
  documents: ["DOC-BC-2026-00417"],
  programme: null,
  qualificationCode: null,
  result: null,
  graduationDocHash: null,
  paymentExchangeId: null,
  paymentLedgerRef: null,
  createdAt: NOW,
  updatedAt: NOW,
};

test("showcase landing shares the marketplace chrome", async ({ page }) => {
  await page.goto("/showcase");
  // The site masthead is present, with the Showcases entry highlighted.
  await expect(page.getByRole("link", { name: "Giga home" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /National Learner Registry & Education Wallet/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start the walkthrough" })).toBeVisible();
});

test("portals render their own chrome without the masthead", async ({ page }) => {
  await page.goto("/showcase/education");
  await expect(page.getByRole("link", { name: "Giga home" })).toHaveCount(0);
  await expect(page.locator(".edu-header")).toBeVisible();

  await page.goto("/showcase/civicworks");
  await expect(page.getByRole("link", { name: "Giga home" })).toHaveCount(0);
  await expect(page.locator(".cw-header")).toBeVisible();
});

test("a signed-out learner is sent to the wallet sign-in", async ({ page }) => {
  await page.goto("/showcase/education/home");
  await expect(page).toHaveURL(/\/showcase\/education\/login$/);
});

test("school sign-in is fake: prefilled credentials, session in localStorage", async ({ page }) => {
  await page.goto("/showcase/school/login");

  // Wrong password fails locally, without any server call.
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Open workbench" }).click();
  await expect(page.getByText("Sign-in failed. Please try again.")).toBeVisible();
  expect(await readKey(page, "session.school")).toBeNull();

  // The prefilled demo credentials sign in.
  await page.getByLabel("Password").fill("officer123");
  await page.getByRole("button", { name: "Open workbench" }).click();
  await expect(page).toHaveURL(/\/showcase\/school\/queue$/);
  const session = JSON.parse((await readKey(page, "session.school")) ?? "null");
  expect(session?.email).toBe("officer@riverside.school");

  // Sign-out clears only this portal's session key.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/showcase\/school\/login$/);
  expect(await readKey(page, "session.school")).toBeNull();
});

test("the queue shows the learner's application from the shared store", async ({ page }) => {
  await seedState(page, {
    "session.school": { email: "officer@riverside.school", name: "Amina Osei", signedInAt: NOW },
    learner: LEARNER,
    applications: [APPLICATION],
  });
  await page.goto("/showcase/school/queue");
  await expect(page.getByRole("link", { name: /Test Learner/ })).toBeVisible();
  await expect(page.getByText("Awaiting review")).toBeVisible();
});

test("validation approves the application even when the wallet broker is absent", async ({
  page,
}) => {
  await seedState(page, {
    "session.school": { email: "officer@riverside.school", name: "Amina Osei", signedInAt: NOW },
    learner: LEARNER,
    applications: [APPLICATION],
  });
  await page.goto(`/showcase/school/queue?app=${APPLICATION.id}`);
  await page.getByRole("button", { name: /Validate documents/ }).click();

  // The registry transition is client-side: approved + audited, whether or
  // not the OWS env is configured on this server.
  await expect
    .poll(async () => JSON.parse((await readKey(page, "applications")) ?? "[]")[0]?.status)
    .toBe("approved");
  const audit = JSON.parse((await readKey(page, "audit")) ?? "[]");
  const actions = audit.map((event: { action: string }) => event.action);
  expect(actions).toContain("application.documents_validated");
  expect(actions).toContain("application.approved");

  // The audit trail page shows the chain, intact.
  await page.goto("/showcase/audit");
  await expect(page.getByText("application.approved")).toBeVisible();
  await expect(page.locator(".adt-intro")).toContainText("intact");
});

test("delete account clears the browser's demo state but keeps the audit trail", async ({
  page,
}) => {
  await seedState(page, {
    "session.learner": { pseudonym: "e2e-pseudonym", displayName: "Test Learner", signedInAt: NOW },
    learner: LEARNER,
    applications: [APPLICATION],
    exchanges: {},
  });
  await page.goto("/showcase/education/consents");
  await page.getByRole("button", { name: "Delete my account" }).click();

  await expect(page).toHaveURL(/\/showcase\/education$/);
  expect(await readKey(page, "learner")).toBeNull();
  expect(await readKey(page, "session.learner")).toBeNull();
  expect(await readKey(page, "applications")).toBeNull();
  expect(await readKey(page, "exchanges")).toBeNull();
  const audit = JSON.parse((await readKey(page, "audit")) ?? "[]");
  expect(audit.map((event: { action: string }) => event.action)).toContain(
    "learner.account_deleted",
  );
});
