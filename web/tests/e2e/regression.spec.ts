import { expect, test, type APIRequestContext } from "@playwright/test";
import fs from "node:fs/promises";
import AdmZip from "adm-zip";

async function signIn(request: APIRequestContext, email: string, password: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  return { authorization: `Bearer ${body.token}` };
}

test("catalog and detail pages render published skills and use cases", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("igrantio-education-issuer", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Use cases" }).click();
  await expect(page.getByText("national-learner-registry", { exact: true })).toBeVisible();

  await page.goto("/usecase/national-learner-registry");
  await expect(page.getByRole("heading", { name: "National Learner Registry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Journeys" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(4);
});

test("use-case Markdown download contains the complete SKILL.md", async ({ page }) => {
  await page.goto("/usecase/national-learner-registry");
  await expect(page.getByRole("button", { name: "Download as Markdown" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download as Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("national-learner-registry.md");

  const path = await download.path();
  expect(path).not.toBeNull();
  const markdown = await fs.readFile(path!, "utf8");
  expect(markdown).toContain("name: national-learner-registry");
  expect(markdown).toContain("journeys:");
  expect(markdown).toContain("# National Learner Registry");
});

test("skill bundle route returns a valid, path-preserving zip", async ({ page }) => {
  await page.goto("/skill/igrantio-education-issuer");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download .zip" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("igrantio-education-issuer.zip");

  const path = await download.path();
  expect(path).not.toBeNull();
  const zip = new AdmZip(path!);
  const names = zip.getEntries().map((entry) => entry.entryName);
  expect(names).toContain("igrantio-education-issuer/SKILL.md");
  expect(names).toContain("igrantio-education-issuer/openapi/issuer.yaml");
  expect(zip.readAsText("igrantio-education-issuer/SKILL.md")).toContain(
    "name: igrantio-education-issuer",
  );
});

test("moved bundle route and skill API siblings do not conflict", async ({ request }) => {
  const getChecks: [string, number][] = [
    ["/api/bundles/igrantio-education-issuer", 200],
    ["/api/bundles/not-a-real-skill", 404],
    ["/api/marketplace/not-a-real-skill", 404],
    ["/api/skills/mine", 401],
  ];
  for (const [path, status] of getChecks) {
    expect((await request.get(path)).status(), path).toBe(status);
  }
  for (const path of ["/api/skills/1/delist", "/api/skills/1/official"]) {
    expect((await request.post(path)).status(), path).toBe(401);
  }
});

test("public, provider, reviewer, and admin API smoke matrix", async ({ request }) => {
  const list = await request.get("/api/marketplace?type=skill&page=1&pageSize=1");
  expect(list.status()).toBe(200);
  expect(list.headers()["cache-control"]).toContain("s-maxage=300");
  expect((await list.json()).skills).toHaveLength(1);

  const detail = await request.get("/api/marketplace/national-learner-registry");
  expect(detail.status()).toBe(200);
  expect((await detail.json()).skill.type).toBe("usecase");

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
  expect(usersBody.total).toBeGreaterThanOrEqual(5);
  expect((await request.get("/api/admin/stats", { headers: admin })).status()).toBe(200);
  expect((await request.get("/api/admin/orgs", { headers: admin })).status()).toBe(200);
});
