import { expect, test, type APIRequestContext } from "@playwright/test";

const PROVIDER = "igrant-io";
const SKILL = "igrantio-issuer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signIn(request: APIRequestContext, email: string, password: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  return { authorization: `Bearer ${body.token}` };
}

test("marketplace lists providers and links to provider pages", async ({ page }) => {
  await page.goto("/marketplace");
  await page
    .getByRole("link", { name: /iGrant\.io/ })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/marketplace/${PROVIDER}$`));
  await expect(page.getByRole("heading", { name: "iGrant.io", level: 1 })).toBeVisible();
});

test("provider page lists sources that list its skills", async ({ page }) => {
  await page.goto(`/marketplace/${PROVIDER}`);
  await expect(page.getByRole("heading", { name: "iGrant.io", level: 1 })).toBeVisible();

  // Sources group the provider's skills; the seeded fixtures sit in the
  // "bundles" pseudo-source since they were published without a repository.
  await page.getByRole("link", { name: /Marketplace bundles/ }).click();
  await expect(page).toHaveURL(`/marketplace/${PROVIDER}/bundles`);

  await page
    .getByRole("link", { name: new RegExp(SKILL) })
    .first()
    .click();
  await expect(page).toHaveURL(`/marketplace/${PROVIDER}/bundles/${SKILL}`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(SKILL);
});

test("skill slugs redirect to their owning provider's path", async ({ page }) => {
  await page.goto(`/skill/${SKILL}`);
  await expect(page).toHaveURL(`/marketplace/${PROVIDER}/bundles/${SKILL}`);

  await page.goto(`/skill/${SKILL}/review`);
  await expect(page).toHaveURL(`/marketplace/${PROVIDER}/bundles/${SKILL}/review`);
  await expect(page.getByRole("heading", { name: "Review trail" })).toBeVisible();
});

test("a skill addressed under the wrong provider moves to the canonical URL", async ({ page }) => {
  await page.goto(`/marketplace/not-the-owner/not-the-source/${SKILL}`);
  await expect(page).toHaveURL(`/marketplace/${PROVIDER}/bundles/${SKILL}`);
});

test("removed surfaces are unlinked and unreachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Showcase" })).toHaveCount(0);

  for (const path of ["/showcase", "/builder", "/developer", "/governance/applications"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

// The pages above were once switched off by a feature flag while their APIs
// stayed live. Both are gone now, so the API paths are asserted too.
test("removed surfaces leave no reachable API behind", async ({ request }) => {
  const paths = [
    "/api/applications",
    "/api/applications/mine",
    "/api/admin/applications",
    "/api/assistant/models",
    "/api/chats",
    "/api/auth/settings",
    "/a/any-share-id",
    "/api/bundles/unzip",
    "/api/bundles/unzip-multi",
  ];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

test("the Developer role cannot be claimed or assigned", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);

  // Self-registration lands on the only role still on offer.
  const email = `e2e-role-${Date.now()}@example.test`;
  const registered = await request.post("/api/auth/register", {
    data: { email, password: "register123", name: "Role Fixture", role: "builder" },
  });
  expect(registered.status()).toBe(200);
  expect((await registered.json()).user.role).toBe("provider");

  // Nor can an operator hand the role out.
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");
  const users = await request.get("/api/admin/users?page=1&pageSize=100", { headers: admin });
  const created = (await users.json()).users.find((u: { email: string }) => u.email === email);
  const assigned = await request.post(`/api/admin/users/${created.id}/role`, {
    headers: admin,
    data: { role: "builder" },
  });
  expect(assigned.status()).toBe(400);
});

test("the signed-in dashboard drops the removed surfaces", async ({ page, request }) => {
  // Sign in over the API and hand the session to the browser the way the app
  // does, so no credentials are typed into the page.
  const response = await request.post("/api/auth/login", {
    data: { email: "superadmin@govbuild.test", password: "super123" },
  });
  expect(response.status()).toBe(200);
  const { token, user } = await response.json();
  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem("token", t as string);
      localStorage.setItem("user", u as string);
    },
    [token, JSON.stringify(user)],
  );

  // /governance opens on the review queue; the Overview page is merged in.
  await page.goto("/governance");
  await expect(page).toHaveURL("/governance/review");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Applications" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Developer Console" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Integration Assistant" })).toHaveCount(0);
  await expect(page.getByText("Showcase apps")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review queue" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Integration Assistant" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Manage User" })).toBeVisible();
});

test("moved bundle route and skill API siblings do not conflict", async ({ request }) => {
  const getChecks: [string, number][] = [
    [`/api/bundles/${SKILL}`, 404], // bundle hosting removed - GitHub serves skills
    ["/api/marketplace/not-a-real-skill", 404],
    ["/api/skills/mine", 401],
  ];
  for (const [path, status] of getChecks) {
    expect((await request.get(path)).status(), path).toBe(status);
  }
  for (const path of ["/api/skills/1/delist"]) {
    expect((await request.post(path)).status(), path).toBe(401);
  }
});

test("ids are UUIDs and providers resolve by slug or UUID", async ({ request }) => {
  const bySlug = await request.get(`/api/providers/${PROVIDER}`);
  expect(bySlug.status()).toBe(200);
  const provider = await bySlug.json();
  expect(provider.id).toMatch(UUID_RE);
  expect(provider.slug).toBe(PROVIDER);

  const byUuid = await request.get(`/api/providers/${provider.id}`);
  expect(byUuid.status()).toBe(200);
  expect((await byUuid.json()).slug).toBe(PROVIDER);

  expect((await request.get("/api/providers/no-such-provider")).status()).toBe(404);

  // The catalog filter accepts either form and carries the owning provider.
  for (const key of [PROVIDER, provider.id]) {
    const listed = await request.get(`/api/marketplace?provider=${key}`);
    expect(listed.status(), key).toBe(200);
    const body = await listed.json();
    expect(body.total, key).toBeGreaterThan(0);
    expect(body.skills[0].id).toMatch(UUID_RE);
    expect(body.skills[0].org.slug).toBe(PROVIDER);
  }

  const detail = await request.get(`/api/marketplace/${SKILL}`);
  expect(detail.status()).toBe(200);
  const detailBody = await detail.json();
  expect(detailBody.skill.id).toMatch(UUID_RE);
  expect(detailBody.version.id).toMatch(UUID_RE);
  expect(detailBody.org.slug).toBe(PROVIDER);
});

test("every knowledgebase page renders", async ({ request }) => {
  const pages = [
    "",
    "/how-it-works",
    "/providers",
    "/skills",
    "/sources",
    "/onboarding",
    "/authoring",
    "/repository",
    "/publishing",
    "/review",
    "/installing",
    "/checks",
    "/roles",
  ];
  for (const page of pages) {
    const response = await request.get(`/knowledgebase${page}`);
    expect(response.status(), `/knowledgebase${page}`).toBe(200);
  }
});

test("organisations without published skills stay out of the public directory", async ({
  request,
}) => {
  // EduChain Labs is seeded and registered but has published nothing.
  const list = await request.get("/api/providers?page=1&pageSize=48");
  expect(list.status()).toBe(200);
  const slugs = (await list.json()).providers.map((p: { slug: string }) => p.slug);
  expect(slugs).toContain(PROVIDER);
  expect(slugs).not.toContain("educhain-labs");
  expect((await request.get("/api/providers/educhain-labs")).status()).toBe(404);
});

test("malformed ids are rejected as not-found rather than erroring", async ({ request }) => {
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");
  const checks: [path: string, body: object][] = [
    ["/api/skills/not-a-uuid/delist", {}],
    ["/api/review/versions/not-a-uuid/claim", {}],
    ["/api/review/versions/not-a-uuid/decision", { decision: "approve" }],
  ];
  for (const [path, data] of checks) {
    const response = await request.post(path, { headers: admin, data });
    expect(response.status(), path).toBe(404);
  }
  expect((await request.get("/api/chats/not-a-uuid", { headers: admin })).status()).toBe(404);
  expect((await request.get("/api/versions/not-a-uuid", { headers: admin })).status()).toBe(404);
});

test("public, provider, reviewer, and admin API smoke matrix", async ({ request }) => {
  const list = await request.get("/api/marketplace?page=1&pageSize=1");
  expect(list.status()).toBe(200);
  expect(list.headers()["cache-control"]).toContain("s-maxage=300");
  expect((await list.json()).skills).toHaveLength(1);

  const detail = await request.get(`/api/marketplace/${SKILL}`);
  expect(detail.status()).toBe(200);
  expect((await detail.json()).skill.slug).toBe(SKILL);

  const provider = await signIn(request, "provider@igrant.io", "provider123");
  expect((await request.get("/api/orgs/mine", { headers: provider })).status()).toBe(200);
  expect((await request.get("/api/skills/mine", { headers: provider })).status()).toBe(200);
  expect((await request.get("/api/admin/users", { headers: provider })).status()).toBe(403);

  const reviewer = await signIn(request, "reviewer@govbuild.test", "review123");
  expect((await request.get("/api/review/queue", { headers: reviewer })).status()).toBe(200);
  expect((await request.get("/api/admin/events", { headers: reviewer })).status()).toBe(200);

  const admin = await signIn(request, "superadmin@govbuild.test", "super123");
  const users = await request.get("/api/admin/users?page=1&pageSize=2", { headers: admin });
  expect(users.status()).toBe(200);
  const usersBody = await users.json();
  expect(usersBody.users).toHaveLength(2);
  expect(usersBody.users[0].id).toMatch(UUID_RE);
  expect(usersBody.total).toBeGreaterThanOrEqual(4);
  expect((await request.get("/api/admin/stats", { headers: admin })).status()).toBe(200);
  expect((await request.get("/api/admin/orgs", { headers: admin })).status()).toBe(200);
});

// A self-contained submit -> claim -> approve -> delist cycle, so the suite can
// be re-run against the same database without depending on the seeded queue.
const E2E_SKILL = "e2e-regression-skill";
const E2E_BUNDLE = [
  {
    path: "SKILL.md",
    content: `---
name: ${E2E_SKILL}
version: 1.0.0
description: Fixture bundle submitted by the regression suite.
license: Apache-2.0
metadata:
  provider: iGrant.io
  protocols: OpenID4VCI, OpenID4VP
---

# Regression fixture

This bundle exists only so the end-to-end suite can drive a submission through
the review pipeline. It declares no OpenAPI surface, schemas or rulebooks, which
the automated checks report as warnings rather than failures.
`,
  },
];

test("a submission moves through review to a provider-scoped published page", async ({
  request,
}) => {
  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const orgs = await request.get("/api/orgs/mine", { headers: provider });
  expect(orgs.status()).toBe(200);
  const org = (await orgs.json()).orgs.find((o: { status: string }) => o.status === "approved");
  expect(org.id).toMatch(UUID_RE);

  const submitted = await request.post("/api/skills", {
    headers: provider,
    data: { orgId: org.id, files: E2E_BUNDLE },
  });
  expect(submitted.status()).toBe(200);
  const { skill, version } = await submitted.json();
  expect(skill.id).toMatch(UUID_RE);
  expect(version.id).toMatch(UUID_RE);
  expect(version.status, JSON.stringify(version.checks)).toBe("submitted");

  const reviewer = await signIn(request, "reviewer@govbuild.test", "review123");
  const queue = await request.get("/api/review/queue", { headers: reviewer });
  expect(queue.status()).toBe(200);
  expect((await queue.json()).queue.map((v: { id: string }) => v.id)).toContain(version.id);

  expect((await request.get(`/api/versions/${version.id}`, { headers: reviewer })).status()).toBe(
    200,
  );
  expect(
    (
      await request.post(`/api/review/versions/${version.id}/claim`, { headers: reviewer })
    ).status(),
  ).toBe(200);

  const decision = await request.post(`/api/review/versions/${version.id}/decision`, {
    headers: reviewer,
    data: { decision: "approve", notes: "Approved by the regression suite." },
  });
  expect(decision.status()).toBe(200);
  const decided = await decision.json();
  expect(decided.skill.status).toBe("published");
  expect(decided.skill.publishedVersionId).toBe(version.id);

  const published = await request.get(`/api/marketplace/${E2E_SKILL}`);
  expect(published.status()).toBe(200);
  expect((await published.json()).org.slug).toBe(PROVIDER);

  // The audit trail keys off the skill UUID, so it must resolve after publication.
  const trail = await request.get(`/api/marketplace/${E2E_SKILL}/review`);
  expect(trail.status()).toBe(200);
  expect((await trail.json()).trail.map((t: { type: string }) => t.type)).toContain(
    "review.approve",
  );

  const delisted = await request.post(`/api/skills/${skill.id}/delist`, { headers: provider });
  expect(delisted.status()).toBe(200);
});
