// Source-level review, source-level delisting, and per-organisation isolation.
//
// Run against a freshly seeded stack (see README):
//   make db-reset && make marketplace && make web
//   cd web && npm run test:e2e
//
// Every test is self-cleaning (sources end delisted or rejected), so the suite
// can re-run against the same database. Each scenario uses its own named
// source via the dev-only sourceUrl field of POST /api/skills - never the
// iGrant pseudo-source, which carries the seeded catalog.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER = "igrant-io";
const SECOND_PROVIDER = "educhain-labs";

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

function bundle(slug: string, version = "1.0.0") {
  return {
    files: [
      {
        path: "SKILL.md",
        content: `---
name: ${slug}
version: ${version}
description: Fixture bundle for the source-review suite (${slug}).
license: Apache-2.0
metadata:
  provider: e2e
  protocols: OpenID4VCI
---

# ${slug}

Fixture skill driven through source-level review by the e2e suite.
`,
      },
    ],
  };
}

async function approvedOrg(request: APIRequestContext, headers: Record<string, string>) {
  const orgs = await request.get("/api/orgs/mine", { headers });
  expect(orgs.status()).toBe(200);
  const org = (await orgs.json()).orgs.find((o: { status: string }) => o.status === "approved");
  expect(org, "the account needs an approved organisation").toBeTruthy();
  return org;
}

/** One publish action: one source submission carrying every named skill. */
async function submitSource(
  request: APIRequestContext,
  headers: Record<string, string>,
  orgId: string,
  sourceUrl: string,
  slugs: string[],
  version = "1.0.0",
) {
  const response = await request.post("/api/skills", {
    headers,
    data: { orgId, sourceUrl, skills: slugs.map((slug) => bundle(slug, version)) },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.submission.id).toMatch(UUID_RE);
  expect(body.source.id).toMatch(UUID_RE);
  expect(body.skills).toHaveLength(slugs.length);
  return body as {
    submission: { id: string; status: string };
    source: { id: string; url: string; status: string };
    skills: { skill: { id: string; slug: string }; version: { id: string; status: string } }[];
  };
}

async function decide(
  request: APIRequestContext,
  headers: Record<string, string>,
  submissionId: string,
  decision: string,
  notes = "",
) {
  const response = await request.post(`/api/review/submissions/${submissionId}/decision`, {
    headers,
    data: { decision, notes },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

test("a multi-skill source submission is one queue row, reviewed in a nested drawer, approved and delisted as a whole", async ({
  page,
  request,
}) => {
  const SOURCE_URL = "https://github.com/e2e/source-alpha";
  const SLUGS = ["e2e-alpha-issuer", "e2e-alpha-verifier"];

  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const org = await approvedOrg(request, provider);
  const { submission, source } = await submitSource(request, provider, org.id, SOURCE_URL, SLUGS);
  expect(submission.status).toBe("submitted");

  // The queue carries ONE row for the whole source, not one per skill.
  const reviewer = await signIn(request, "reviewer@govbuild.test", "review123");
  const queue = (await (await request.get("/api/review/queue", { headers: reviewer })).json())
    .queue as { id: string; skillCount: number; slugs: string[] }[];
  const carrying = queue.filter((row) => SLUGS.some((slug) => row.slugs.includes(slug)));
  expect(carrying).toHaveLength(1);
  expect(carrying[0].id).toBe(submission.id);
  expect(carrying[0].skillCount).toBe(2);
  expect(carrying[0].slugs.sort()).toEqual([...SLUGS].sort());

  // The submission detail carries every skill's snapshot: manifest, checks, files.
  const detail = await request.get(`/api/submissions/${submission.id}`, { headers: reviewer });
  expect(detail.status()).toBe(200);
  const detailBody = await detail.json();
  expect(detailBody.skills).toHaveLength(2);
  for (const s of detailBody.skills) {
    expect(SLUGS).toContain(s.skill.slug);
    expect(s.version.manifest.name).toBe(s.skill.slug);
    expect(s.version.files.map((f: { path: string }) => f.path)).toContain("SKILL.md");
    expect(s.version.checks.length).toBeGreaterThan(0);
  }

  // Reviewer UI: source drawer, then the nested per-skill snapshot drawer.
  await injectSession(page, request, "reviewer@govbuild.test", "review123");
  await page.goto("/governance/review");
  await page.getByRole("button", { name: "Open review of e2e/source-alpha" }).click();
  await expect(page.getByText("Reviewing e2e/source-alpha")).toBeVisible();
  await expect(page.getByText("Skills in this submission")).toBeVisible();
  await page.getByRole("button", { name: /e2e-alpha-issuer/ }).click();
  await expect(page.getByText("Automated check report")).toBeVisible();
  await expect(page.getByRole("button", { name: "SKILL.md" })).toBeVisible();
  // The nested drawer's back chevron returns to the source submission.
  await page.getByLabel("Back").click();
  await expect(page.getByText("Skills in this submission")).toBeVisible();

  // Claim, then approve the whole submission; every skill publishes at once.
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/claim`, { headers: reviewer })
    ).status(),
  ).toBe(200);
  const decided = await decide(request, reviewer, submission.id, "approve", "Approved as one.");
  expect(decided.submission.status).toBe("approved");
  expect(decided.skills.map((s: { status: string }) => s.status)).toEqual([
    "published",
    "published",
  ]);

  for (const slug of SLUGS) {
    const published = await request.get(`/api/marketplace/${slug}`);
    expect(published.status(), slug).toBe(200);
    const body = await published.json();
    expect(body.org.slug).toBe(PROVIDER);
    expect(body.source.repo).toBe("source-alpha");
  }
  await page.goto(`/skill/${SLUGS[0]}`);
  await expect(page).toHaveURL(`/marketplace/${PROVIDER}/source-alpha/${SLUGS[0]}`);
  const trailBefore = await request.get(`/api/marketplace/${SLUGS[0]}/review`);
  expect(trailBefore.status()).toBe(200);
  expect((await trailBefore.json()).trail.map((t: { type: string }) => t.type)).toContain(
    "review.approve",
  );

  // ONE call delists the source and every published skill in it.
  const delisted = await request.post(`/api/sources/${source.id}/delist`, { headers: provider });
  expect(delisted.status()).toBe(200);
  expect((await delisted.json()).delisted).toBe(2);
  for (const slug of SLUGS) {
    expect((await request.get(`/api/marketplace/${slug}`)).status(), slug).toBe(404);
  }

  // Delisting removes from the catalog without rewriting history: the trail
  // stays public, marked delisted.
  const trailAfter = await request.get(`/api/marketplace/${SLUGS[0]}/review`);
  expect(trailAfter.status()).toBe(200);
  expect((await trailAfter.json()).skill.status).toBe("delisted");

  // The audit log records the source-level action.
  const events = await (await request.get("/api/admin/events", { headers: reviewer })).json();
  const sourceEvent = events.events.find(
    (e: { type: string; subject: { sourceId?: string } }) =>
      e.type === "source.delisted" && e.subject?.sourceId === source.id,
  );
  expect(sourceEvent).toBeTruthy();
  expect(sourceEvent.detail.skillCount).toBe(2);

  // The provider dashboard shows the source as delisted.
  const mine = await (await request.get("/api/sources/mine", { headers: provider })).json();
  const mineAlpha = mine.sources.find((s: { id: string }) => s.id === source.id);
  expect(mineAlpha.status).toBe("delisted");
  await injectSession(page, request, "provider@igrant.io", "provider123");
  await page.goto("/provider/submissions");
  await expect(
    page.getByRole("row").filter({ hasText: "e2e/source-alpha" }).getByText("Delisted"),
  ).toBeVisible();
});

test("rejecting a source submission parks every skill in it", async ({ request }) => {
  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const org = await approvedOrg(request, provider);
  const { submission } = await submitSource(
    request,
    provider,
    org.id,
    "https://github.com/e2e/source-beta",
    ["e2e-beta-one", "e2e-beta-two"],
  );

  const reviewer = await signIn(request, "reviewer@govbuild.test", "review123");
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/claim`, { headers: reviewer })
    ).status(),
  ).toBe(200);
  const decided = await decide(request, reviewer, submission.id, "reject", "Both need work.");
  expect(decided.submission.status).toBe("rejected");

  for (const slug of ["e2e-beta-one", "e2e-beta-two"]) {
    expect((await request.get(`/api/marketplace/${slug}`)).status(), slug).toBe(404);
  }
  const mine = await (await request.get("/api/sources/mine", { headers: provider })).json();
  const beta = mine.sources.find(
    (s: { url: string | null }) => s.url === "https://github.com/e2e/source-beta",
  );
  const rejected = beta.submissions.find((s: { id: string }) => s.id === submission.id);
  expect(rejected.status).toBe("rejected");
  expect(rejected.reviewNotes).toBe("Both need work.");
});

test("request changes on the whole source; the resubmission re-enters the queue", async ({
  request,
}) => {
  const SOURCE_URL = "https://github.com/e2e/source-gamma";
  const SLUG = "e2e-gamma-skill";
  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const org = await approvedOrg(request, provider);
  const reviewer = await signIn(request, "reviewer@govbuild.test", "review123");

  const first = await submitSource(request, provider, org.id, SOURCE_URL, [SLUG]);
  expect(
    (
      await request.post(`/api/review/submissions/${first.submission.id}/claim`, {
        headers: reviewer,
      })
    ).status(),
  ).toBe(200);
  const changed = await decide(
    request,
    reviewer,
    first.submission.id,
    "request_changes",
    "Add an OpenAPI surface.",
  );
  expect(changed.submission.status).toBe("changes_requested");

  // The fix arrives as a fresh submission of the same source.
  const second = await submitSource(request, provider, org.id, SOURCE_URL, [SLUG], "1.0.1");
  expect(second.source.id).toBe(first.source.id);
  expect(second.submission.id).not.toBe(first.submission.id);
  const queue = await (await request.get("/api/review/queue", { headers: reviewer })).json();
  expect(queue.queue.map((s: { id: string }) => s.id)).toContain(second.submission.id);

  expect(
    (
      await request.post(`/api/review/submissions/${second.submission.id}/claim`, {
        headers: reviewer,
      })
    ).status(),
  ).toBe(200);
  await decide(request, reviewer, second.submission.id, "approve");
  expect((await request.get(`/api/marketplace/${SLUG}`)).status()).toBe(200);

  // Self-cleaning: the source leaves the catalog again.
  expect(
    (await request.post(`/api/sources/${second.source.id}/delist`, { headers: provider })).status(),
  ).toBe(200);
});

test("two organisations publish the same skill name without conflict, and a bare slug shows the chooser", async ({
  page,
  request,
}) => {
  const SLUG = "e2e-shared-skill";
  const igrant = await signIn(request, "provider@igrant.io", "provider123");
  const igrantOrg = await approvedOrg(request, igrant);
  const educhain = await signIn(request, "labs@educhain.test", "provider123");
  const educhainOrg = await approvedOrg(request, educhain);
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");

  // The same skill name goes in under both organisations - no 409 anywhere.
  const a = await submitSource(request, igrant, igrantOrg.id, "https://github.com/e2e/shared-a", [
    SLUG,
  ]);
  const b = await submitSource(
    request,
    educhain,
    educhainOrg.id,
    "https://github.com/e2e/shared-b",
    [SLUG],
  );
  await decide(request, admin, a.submission.id, "approve");
  await decide(request, admin, b.submission.id, "approve");

  // Publishing made the second organisation publicly visible.
  const providers = await (await request.get("/api/providers?page=1&pageSize=48")).json();
  expect(providers.providers.map((p: { slug: string }) => p.slug)).toContain(SECOND_PROVIDER);

  // The bare slug is ambiguous: the API lists the homes, the page shows a chooser.
  const ambiguous = await (await request.get(`/api/marketplace/${SLUG}`)).json();
  expect(ambiguous.multiple).toBe(true);
  expect(ambiguous.matches.map((m: { org: { slug: string } }) => m.org.slug).sort()).toEqual(
    [SECOND_PROVIDER, PROVIDER].sort(),
  );

  for (const [providerSlug, source] of [
    [PROVIDER, "shared-a"],
    [SECOND_PROVIDER, "shared-b"],
  ]) {
    const one = await request.get(`/api/marketplace/${SLUG}?provider=${providerSlug}`);
    expect(one.status(), providerSlug).toBe(200);
    const body = await one.json();
    expect(body.org.slug).toBe(providerSlug);
    expect(body.source.repo).toBe(source);
  }

  // The unqualified trail refuses to guess; the qualified one answers.
  expect((await request.get(`/api/marketplace/${SLUG}/review`)).status()).toBe(409);
  expect((await request.get(`/api/marketplace/${SLUG}/review?provider=${PROVIDER}`)).status()).toBe(
    200,
  );

  await page.goto(`/skill/${SLUG}`);
  await expect(page.getByText(`Several providers publish`)).toBeVisible();
  await expect(page.getByRole("link", { name: /iGrant\.io/ })).toBeVisible();
  await page.getByRole("link", { name: /EduChain Labs/ }).click();
  await expect(page).toHaveURL(`/marketplace/${SECOND_PROVIDER}/shared-b/${SLUG}`);

  // One organisation cannot delist another organisation's source.
  expect(
    (await request.post(`/api/sources/${b.source.id}/delist`, { headers: igrant })).status(),
  ).toBe(403);

  // Self-cleaning: both sources leave the catalog, and the second
  // organisation drops out of the public directory again.
  expect(
    (await request.post(`/api/sources/${a.source.id}/delist`, { headers: igrant })).status(),
  ).toBe(200);
  expect(
    (await request.post(`/api/sources/${b.source.id}/delist`, { headers: educhain })).status(),
  ).toBe(200);
  expect((await request.get(`/api/marketplace/${SLUG}`)).status()).toBe(404);
  const after = await (await request.get("/api/providers?page=1&pageSize=48")).json();
  expect(after.providers.map((p: { slug: string }) => p.slug)).not.toContain(SECOND_PROVIDER);
});

test("the same organisation cannot reuse a skill name in another source", async ({ request }) => {
  const SLUG = "e2e-delta-skill";
  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const org = await approvedOrg(request, provider);

  const first = await submitSource(
    request,
    provider,
    org.id,
    "https://github.com/e2e/source-delta",
    [SLUG],
  );

  // The same name from a different source is an explicit conflict, and the
  // whole submission aborts: no source record, no submission, no version.
  const conflicting = await request.post("/api/skills", {
    headers: provider,
    data: {
      orgId: org.id,
      sourceUrl: "https://github.com/e2e/source-epsilon",
      skills: [bundle(SLUG)],
    },
  });
  expect(conflicting.status()).toBe(409);
  expect((await conflicting.json()).error).toContain("another source in your organisation");
  const mine = await (await request.get("/api/sources/mine", { headers: provider })).json();
  expect(
    mine.sources.find(
      (s: { url: string | null }) => s.url === "https://github.com/e2e/source-epsilon",
    ),
  ).toBeFalsy();

  // Self-cleaning: reject the pending delta submission.
  const reviewer = await signIn(request, "reviewer@govbuild.test", "review123");
  expect(
    (
      await request.post(`/api/review/submissions/${first.submission.id}/claim`, {
        headers: reviewer,
      })
    ).status(),
  ).toBe(200);
  await decide(request, reviewer, first.submission.id, "reject", "e2e cleanup.");
});

test("claims are exclusive; only the claimant or a super admin decides", async ({ request }) => {
  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const org = await approvedOrg(request, provider);
  const { submission, source } = await submitSource(
    request,
    provider,
    org.id,
    "https://github.com/e2e/source-zeta",
    ["e2e-zeta-skill"],
  );

  // A provider has no reviewer powers at all.
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/claim`, { headers: provider })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/decision`, {
        headers: provider,
        data: { decision: "approve" },
      })
    ).status(),
  ).toBe(403);

  // A second reviewer account (created once; reused on re-runs).
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");
  const created = await request.post("/api/admin/users", {
    headers: admin,
    data: {
      email: "reviewer2@govbuild.test",
      password: "review223",
      name: "Second Reviewer",
      role: "reviewer",
    },
  });
  expect([200, 409]).toContain(created.status());
  const reviewerA = await signIn(request, "reviewer@govbuild.test", "review123");
  const reviewerB = await signIn(request, "reviewer2@govbuild.test", "review223");

  // First claim wins; the loser gets a conflict and cannot decide.
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/claim`, { headers: reviewerA })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/claim`, { headers: reviewerB })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/decision`, {
        headers: reviewerB,
        data: { decision: "approve" },
      })
    ).status(),
  ).toBe(403);

  // A super admin may decide a claimed submission directly.
  const decided = await decide(request, admin, submission.id, "approve");
  expect(decided.submission.status).toBe("approved");

  // Deciding twice is a conflict, not a rewrite.
  expect(
    (
      await request.post(`/api/review/submissions/${submission.id}/decision`, {
        headers: admin,
        data: { decision: "reject", notes: "too late" },
      })
    ).status(),
  ).toBe(409);

  // Self-cleaning.
  expect(
    (await request.post(`/api/sources/${source.id}/delist`, { headers: provider })).status(),
  ).toBe(200);
});

test("resubmitting a delisted source relists it through a fresh review", async ({ request }) => {
  const SOURCE_URL = "https://github.com/e2e/source-eta";
  const SLUG = "e2e-eta-skill";
  const provider = await signIn(request, "provider@igrant.io", "provider123");
  const org = await approvedOrg(request, provider);
  const admin = await signIn(request, "superadmin@govbuild.test", "super123");

  const first = await submitSource(request, provider, org.id, SOURCE_URL, [SLUG]);
  await decide(request, admin, first.submission.id, "approve");
  expect((await request.get(`/api/marketplace/${SLUG}`)).status()).toBe(200);

  expect(
    (await request.post(`/api/sources/${first.source.id}/delist`, { headers: provider })).status(),
  ).toBe(200);
  expect((await request.get(`/api/marketplace/${SLUG}`)).status()).toBe(404);

  // The resubmission reuses the same source record; approval relists it.
  const second = await submitSource(request, provider, org.id, SOURCE_URL, [SLUG], "1.0.1");
  expect(second.source.id).toBe(first.source.id);
  await decide(request, admin, second.submission.id, "approve");

  const relisted = await request.get(`/api/marketplace/${SLUG}`);
  expect(relisted.status()).toBe(200);
  expect((await relisted.json()).version.version).toBe("1.0.1");
  const mine = await (await request.get("/api/sources/mine", { headers: provider })).json();
  expect(mine.sources.find((s: { id: string }) => s.id === first.source.id).status).toBe("active");

  // Self-cleaning.
  expect(
    (await request.post(`/api/sources/${first.source.id}/delist`, { headers: provider })).status(),
  ).toBe(200);
});
