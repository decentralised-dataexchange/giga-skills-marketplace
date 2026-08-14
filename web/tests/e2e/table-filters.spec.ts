// Dashboard table filters: every table shows its active records by default,
// and the status filter widens the view. Runs against the seeded stack, after
// the other specs (workers: 1); every test restores the state it changes.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function signIn(request: APIRequestContext, email: string, password: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  return { authorization: `Bearer ${body.token}` };
}

async function injectSession(page: Page, request: APIRequestContext, email: string, pw: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: pw } });
  expect(response.status()).toBe(200);
  const { token, user } = await response.json();
  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem("token", t as string);
      localStorage.setItem("user", u as string);
    },
    [token, JSON.stringify(user)],
  );
}

async function pickFilter(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

test("the users table shows active accounts by default and filters server-side", async ({
  page,
  request,
}) => {
  const EMAIL = "e2e-suspended@govbuild.test";
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");

  // A fixture account that this test suspends (created once; reused on re-runs).
  const created = await request.post("/api/admin/users", {
    headers: admin,
    data: { email: EMAIL, password: "suspend123", name: "Suspended Fixture", role: "provider" },
  });
  expect([200, 409]).toContain(created.status());
  const all = await (
    await request.get("/api/admin/users?page=1&pageSize=100", { headers: admin })
  ).json();
  const fixture = all.users.find((u: { email: string }) => u.email === EMAIL);
  expect(fixture).toBeTruthy();
  expect(
    (
      await request.post(`/api/admin/users/${fixture.id}/status`, {
        headers: admin,
        data: { status: "suspended" },
      })
    ).status(),
  ).toBe(200);

  // API: the filter shapes both the rows and the total, and rejects junk.
  const suspended = await (
    await request.get("/api/admin/users?page=1&pageSize=100&status=suspended", { headers: admin })
  ).json();
  expect(suspended.users.length).toBeGreaterThan(0);
  expect(suspended.users.every((u: { status: string }) => u.status === "suspended")).toBe(true);
  expect(suspended.users.map((u: { email: string }) => u.email)).toContain(EMAIL);
  expect(suspended.total).toBeGreaterThanOrEqual(suspended.users.length);
  const active = await (
    await request.get("/api/admin/users?page=1&pageSize=100&status=active", { headers: admin })
  ).json();
  expect(active.users.map((u: { email: string }) => u.email)).not.toContain(EMAIL);
  expect((await request.get("/api/admin/users?status=nonsense", { headers: admin })).status()).toBe(
    400,
  );

  try {
    // UI: the default Active view hides the suspended account; the filter
    // reveals it. Rows are asserted inside the table - the signed-in account
    // also appears in the page chrome.
    await injectSession(page, request, "superadmin@govbuild.test", "super123");
    await page.goto("/governance/users");
    await expect(page.getByRole("row").filter({ hasText: "superadmin@govbuild.test" })).toHaveCount(
      1,
    );
    await expect(page.getByRole("row").filter({ hasText: EMAIL })).toHaveCount(0);
    await pickFilter(page, "Filter users by status", "Suspended");
    await expect(page.getByRole("row").filter({ hasText: EMAIL })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "superadmin@govbuild.test" })).toHaveCount(
      0,
    );
  } finally {
    // Reactivate even on failure, so later tests never meet dirty state.
    expect(
      (
        await request.post(`/api/admin/users/${fixture.id}/status`, {
          headers: admin,
          data: { status: "active" },
        })
      ).status(),
    ).toBe(200);
  }
});

test("the organisations table shows approved organisations by default", async ({
  page,
  request,
}) => {
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");
  const orgs = await (await request.get("/api/admin/orgs", { headers: admin })).json();
  const educhain = orgs.orgs.find((o: { name: string }) => o.name === "EduChain Labs");
  expect(educhain).toBeTruthy();
  expect(
    (
      await request.patch(`/api/admin/orgs/${educhain.id}`, {
        headers: admin,
        data: { status: "suspended" },
      })
    ).status(),
  ).toBe(200);

  try {
    await injectSession(page, request, "superadmin@govbuild.test", "super123");
    await page.goto("/governance/organisations");
    await expect(page.getByRole("row").filter({ hasText: "iGrant.io" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "EduChain Labs" })).toHaveCount(0);
    await pickFilter(page, "Filter organisations by status", "Suspended");
    await expect(page.getByRole("row").filter({ hasText: "EduChain Labs" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "iGrant.io" })).toHaveCount(0);
  } finally {
    // Reinstate even on failure, so later tests never meet a suspended org.
    expect(
      (
        await request.patch(`/api/admin/orgs/${educhain.id}`, {
          headers: admin,
          data: { status: "approved" },
        })
      ).status(),
    ).toBe(200);
  }
});

test("the audit trail filters by event category", async ({ page, request }) => {
  await injectSession(page, request, "reviewer@govbuild.test", "review123");
  await page.goto("/governance/audit");
  // The seeded database plus the earlier specs guarantee review and account
  // events among the newest 200.
  await expect(page.getByRole("row").nth(1)).toBeVisible();

  await pickFilter(page, "Filter events by category", "Reviews");
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByText("Skill submitted")).toHaveCount(0);
  await expect(page.getByText("Account created")).toHaveCount(0);

  await pickFilter(page, "Filter events by category", "Accounts");
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByText("Skill approved")).toHaveCount(0);

  await pickFilter(page, "Filter events by category", "All events");
  await expect(page.getByRole("row").nth(1)).toBeVisible();
});
