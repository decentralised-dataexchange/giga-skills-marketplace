import { sql } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { route } from "@/lib/handler";

const toMap = (rows: { k: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.k, r.n]));

export const GET = route(
  async () => {
    const [skills, orgs, users, [queue]] = await Promise.all([
      sql`SELECT status AS k, count(*)::int AS n FROM skills GROUP BY status`,
      sql`SELECT status AS k, count(*)::int AS n FROM orgs GROUP BY status`,
      sql`SELECT role AS k, count(*)::int AS n FROM users GROUP BY role`,
      sql`SELECT count(*)::int AS n FROM submissions WHERE status IN ('submitted','in_review')`,
    ]);
    return {
      stats: {
        skillsByStatus: toMap(skills as never),
        reviewQueue: queue.n,
        orgsByStatus: toMap(orgs as never),
        usersByRole: toMap(users as never),
      },
    };
  },
  { roles: GOVERNANCE_ROLES },
);
