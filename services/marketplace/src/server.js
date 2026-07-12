import http from "node:http";
import postgres from "postgres";

const port = Number(process.env.PORT ?? 4830);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required; the marketplace supports PostgreSQL only");
}

const sql = postgres(databaseUrl, { onnotice: () => {} });
const internalToken = process.env.MARKETPLACE_INTERNAL_TOKEN;

const json = (res, status, body) => {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.CORS_ORIGIN ?? "*",
  });
  res.end(JSON.stringify(body));
};

const entry = (row) => {
  const manifest = row.manifest ?? {};
  return {
    id: row.id,
    slug: row.slug,
    type: row.type ?? "skill",
    status: row.status,
    official: row.official ?? false,
    installs: row.installs,
    org: { id: row.org_id, name: row.org_name, website: row.org_website },
    version: row.version,
    publishedAt: row.decided_at,
    description: manifest.description ?? "",
    license: manifest.license ?? "",
    protocols: manifest.targets?.protocols ?? [],
    journeyCount: Array.isArray(manifest.journeys) ? manifest.journeys.length : 0,
    usesSkills: manifest.uses_skills ?? [],
  };
};

async function listSkills(url) {
  const q = url.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const type = url.searchParams.get("type");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get("pageSize")) || 12));
  const offset = (page - 1) * pageSize;
  const like = `%${q}%`;
  const typeCond = type === "skill" || type === "usecase" ? sql`AND s.type = ${type}` : sql``;
  const qCond = q
    ? sql`AND (lower(s.slug) LIKE ${like} OR lower(o.name) LIKE ${like} OR lower(coalesce(v.manifest->>'description','')) LIKE ${like})`
    : sql``;
  const rows = await sql`
    SELECT s.id, s.slug, s.type, s.status, s.official, s.installs,
           o.id AS org_id, o.name AS org_name, o.website AS org_website,
           v.version, v.manifest, v.decided_at
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    JOIN versions v ON v.id = s.published_version_id
    WHERE s.status = 'published' ${typeCond} ${qCond}
    ORDER BY v.decided_at DESC NULLS LAST, s.id DESC
    LIMIT ${pageSize} OFFSET ${offset}`;
  const [{ n: total }] = await sql`
    SELECT count(*)::int AS n
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    JOIN versions v ON v.id = s.published_version_id
    WHERE s.status = 'published' ${typeCond} ${qCond}`;
  return { skills: rows.map(entry), total, page, pageSize };
}

async function getSkill(slug) {
  const [skill] = await sql`
    SELECT s.*, o.name AS org_name, o.website AS org_website, o.description AS org_description,
           o.status AS org_status, o.contact AS org_contact
    FROM skills s JOIN orgs o ON o.id = s.org_id
    WHERE s.slug = ${slug} AND s.status = 'published'`;
  if (!skill) return null;
  const [version] = await sql`SELECT * FROM versions WHERE id = ${skill.published_version_id}`;
  const history = await sql`
    SELECT id, version, status, decided_at FROM versions
    WHERE skill_id = ${skill.id} AND status IN ('published','superseded') ORDER BY id DESC`;
  return {
    skill: {
      id: skill.id,
      slug: skill.slug,
      type: skill.type ?? "skill",
      installs: skill.installs,
      official: skill.official ?? false,
    },
    org: {
      name: skill.org_name,
      website: skill.org_website,
      description: skill.org_description,
      status: skill.org_status,
      contact: skill.org_contact,
    },
    version: {
      id: version.id,
      version: version.version,
      manifest: version.manifest,
      files: version.files,
      checks: version.checks,
      publishedAt: version.decided_at,
    },
    history: history.map((item) => ({
      id: item.id,
      version: item.version,
      status: item.status,
      publishedAt: item.decided_at,
    })),
  };
}

async function skillContext(slugs) {
  if (!slugs.length) return { skills: [] };
  const rows = await sql`
    SELECT s.slug, v.version, v.files, o.name AS org_name
    FROM skills s
    JOIN versions v ON v.id = s.published_version_id
    JOIN orgs o ON o.id = s.org_id
    WHERE s.status = 'published' AND s.slug = ANY(${slugs})`;
  return {
    skills: rows.map((row) => ({
      slug: row.slug,
      version: row.version,
      files: row.files,
      orgName: row.org_name,
    })),
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "OPTIONS") return json(res, 204, null);
    if (req.method === "GET" && url.pathname === "/health") {
      await sql`SELECT 1`;
      return json(res, 200, { status: "ok", database: "postgresql" });
    }
    if (req.method === "GET" && url.pathname === "/v1/skills") {
      return json(res, 200, await listSkills(url));
    }
    if (req.method === "GET" && url.pathname === "/internal/v1/skill-context") {
      if (internalToken && req.headers.authorization !== `Bearer ${internalToken}`) {
        return json(res, 401, { error: "Invalid internal token" });
      }
      const slugs = [...new Set(url.searchParams.getAll("slug").map(String))];
      return json(res, 200, await skillContext(slugs));
    }
    const match = url.pathname.match(/^\/v1\/skills\/([^/]+)(\/install)?$/);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      if (req.method === "GET" && !match[2]) {
        const result = await getSkill(slug);
        return result
          ? json(res, 200, result)
          : json(res, 404, { error: "Skill not found or not published" });
      }
      if (req.method === "POST" && match[2]) {
        const [row] = await sql`UPDATE skills SET installs = installs + 1
          WHERE slug = ${slug} AND status = 'published' RETURNING installs`;
        return row
          ? json(res, 200, { installs: row.installs })
          : json(res, 404, { error: "Skill not found" });
      }
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Internal server error" });
  }
});

server.listen(port, () => console.log(`Marketplace service listening on :${port}`));

const shutdown = async () => {
  server.close();
  await sql.end();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
