// Superadmin account deletion. A user and the organisation they own are two
// sides of one account, so removing either removes both: deleting a user drops
// the organisations they own, and deleting an organisation drops its owner. The
// set is closed transitively, then everything is removed in one transaction.
// References to a removed user from surviving records (audit events, reviews,
// organisation decisions, settings) are nulled rather than deleted, so the
// history stays intact. Removing your own account this way is refused.
import { logEvent, sql } from "./db";
import { ApiError } from "./handler";

export interface PurgeResult {
  users: { id: string; email: string }[];
  orgs: { id: string; name: string }[];
}

export async function purgeAccounts(
  seed: { userIds?: string[]; orgIds?: string[] },
  actorId: string,
): Promise<PurgeResult> {
  const result: PurgeResult = await sql.begin(async (tx) => {
    const userIds = new Set(seed.userIds ?? []);
    const orgIds = new Set(seed.orgIds ?? []);

    // Close the set: user -> organisations they own -> those organisations'
    // owners -> ... until nothing new is added.
    for (;;) {
      const before = userIds.size + orgIds.size;
      if (userIds.size) {
        const owned = await tx`SELECT id FROM orgs WHERE owner_id = ANY(${[...userIds]}::uuid[])`;
        for (const r of owned) orgIds.add(r.id);
      }
      if (orgIds.size) {
        const owners = await tx`SELECT owner_id FROM orgs WHERE id = ANY(${[...orgIds]}::uuid[])`;
        for (const r of owners) if (r.owner_id) userIds.add(r.owner_id);
      }
      if (userIds.size + orgIds.size === before) break;
    }

    if (userIds.has(actorId))
      throw new ApiError(409, "This would delete your own account, which is not allowed");

    const users = [...userIds];
    const orgs = [...orgIds];

    // Snapshot names and emails before the rows are gone, for the audit log and
    // the response.
    const userRows = users.length
      ? await tx`SELECT id, email FROM users WHERE id = ANY(${users}::uuid[])`
      : [];
    const orgRows = orgs.length
      ? await tx`SELECT id, name FROM orgs WHERE id = ANY(${orgs}::uuid[])`
      : [];

    if (orgs.length) {
      // Delete each organisation's published content in foreign-key-safe order:
      // versions, then submissions, then skills, then sources, then the org.
      await tx`DELETE FROM versions WHERE skill_id IN (SELECT id FROM skills WHERE org_id = ANY(${orgs}::uuid[]))`;
      await tx`DELETE FROM submissions WHERE source_id IN (SELECT id FROM sources WHERE org_id = ANY(${orgs}::uuid[]))`;
      await tx`DELETE FROM skills WHERE org_id = ANY(${orgs}::uuid[])`;
      await tx`DELETE FROM sources WHERE org_id = ANY(${orgs}::uuid[])`;
      await tx`DELETE FROM orgs WHERE id = ANY(${orgs}::uuid[])`;
    }

    if (users.length) {
      // Detach the removed users from records that survive, so no foreign key
      // dangles and the history is kept.
      await tx`UPDATE orgs SET decided_by = NULL WHERE decided_by = ANY(${users}::uuid[])`;
      await tx`UPDATE submissions SET submitted_by = NULL WHERE submitted_by = ANY(${users}::uuid[])`;
      await tx`UPDATE submissions SET reviewer_id = NULL WHERE reviewer_id = ANY(${users}::uuid[])`;
      await tx`UPDATE versions SET submitted_by = NULL WHERE submitted_by = ANY(${users}::uuid[])`;
      await tx`UPDATE versions SET reviewer_id = NULL WHERE reviewer_id = ANY(${users}::uuid[])`;
      await tx`UPDATE events SET actor_id = NULL WHERE actor_id = ANY(${users}::uuid[])`;
      await tx`UPDATE settings SET updated_by = NULL WHERE updated_by = ANY(${users}::uuid[])`;
      await tx`DELETE FROM tokens WHERE user_id = ANY(${users}::uuid[])`;
      await tx`DELETE FROM users WHERE id = ANY(${users}::uuid[])`;
    }

    return {
      users: userRows.map((u) => ({ id: u.id, email: u.email })),
      orgs: orgRows.map((o) => ({ id: o.id, name: o.name })),
    };
  });

  // Record the audit trail once the deletion has committed. The actor survives,
  // so these events keep a valid actor_id.
  for (const o of result.orgs)
    await logEvent("org.deleted", actorId, { orgId: o.id }, { name: o.name });
  for (const u of result.users)
    await logEvent("user.deleted", actorId, { userId: u.id }, { email: u.email });

  return result;
}
