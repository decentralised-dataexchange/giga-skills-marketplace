// Human-readable rendering of audit events. The stored event stays structured
// JSON (type + subject + detail); these helpers only shape what people read.

/* eslint-disable @typescript-eslint/no-explicit-any */

type Detail = Record<string, any> | null | undefined;

// Friendly column label per event type; unknown types are prettified.
const LABELS: Record<string, string> = {
  "user.registered": "Account created",
  "user.created": "User added",
  "user.profile_updated": "Profile updated",
  "user.password_changed": "Password changed",
  "user.suspended": "Account suspended",
  "user.active": "Account reactivated",
  "user.role_changed": "Role changed",
  "org.registered": "Organisation registered",
  "org.submitted": "Organisation submitted",
  "org.approved": "Organisation approved",
  "org.rejected": "Organisation rejected",
  "org.updated": "Organisation updated",
  "org.deleted": "Organisation deleted",
  "review.claimed": "Review claimed",
  "review.approve": "Skill approved",
  "review.reject": "Skill rejected",
  "review.request_changes": "Changes requested",
  "skill.submitted": "Skill submitted",
  "skill.checks_failed": "Checks failed",
  "skill.delisted": "Skill delisted",
  "source.delisted": "Source delisted",
  "skill.official_set": "Endorsement changed",
  "seed.completed": "Demo data seeded",
};

export function eventLabel(type: string): string {
  if (LABELS[type]) return LABELS[type];
  const text = type.replace(/[._]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const q = (value: unknown) => `“${String(value)}”`;

const withNotes = (sentence: string, notes: unknown) =>
  notes ? `${sentence} Notes: ${String(notes)}` : sentence;

/** One plain-English sentence per event. The actor is shown in its own
 * column, so sentences read as what the actor did. */
export function describeEvent(type: string, detail: Detail): string {
  const d = detail ?? {};
  switch (type) {
    case "user.registered":
      return `Created an account with the ${d.role ?? "provider"} role.`;
    case "user.created":
      return `Added the user ${q(d.email)} with the ${d.role} role.`;
    case "user.profile_updated": {
      const changed = [
        d.nameChanged && "name",
        d.emailChanged && "email",
        d.avatarChanged && "avatar",
      ].filter(Boolean);
      return changed.length
        ? `Updated their profile: ${changed.join(", ")}.`
        : "Updated their profile.";
    }
    case "user.password_changed":
      return "Changed their account password.";
    case "user.suspended":
      return "Suspended the account.";
    case "user.active":
      return "Reactivated the account.";
    case "user.role_changed":
      return `Changed the user's role to ${d.role}.`;
    case "org.registered":
      return `Registered the organisation ${q(d.name)}.`;
    case "org.submitted":
      return `Submitted the organisation ${q(d.name)} for verification.`;
    case "org.approved":
      return withNotes("Approved the organisation.", d.notes);
    case "org.rejected":
      return withNotes("Rejected the organisation.", d.notes);
    case "org.updated": {
      let sentence = `Updated the organisation ${q(d.name)}`;
      if (d.slug) sentence += ` (handle ${d.slug})`;
      if (d.status) sentence += `; status set to ${d.status}`;
      return `${sentence}.`;
    }
    case "org.deleted":
      return `Deleted the organisation ${q(d.name)} and everything it published.`;
    case "review.claimed":
      return "Claimed a submission from the review queue.";
    case "review.approve":
      return withNotes(
        `Approved ${q(d.slug)} for publication${d.official ? " and endorsed it as Official" : ""}.`,
        d.notes,
      );
    case "review.reject":
      return withNotes(`Rejected ${q(d.slug)}.`, d.notes);
    case "review.request_changes":
      return withNotes(`Requested changes to ${q(d.slug)}.`, d.notes);
    case "skill.submitted": {
      let sentence = `Submitted ${q(d.slug)} version ${d.version} for review`;
      if (d.repo) sentence += ` from ${d.repo}`;
      if (d.commit) sentence += ` at commit ${String(d.commit).slice(0, 7)}`;
      if (d.checksPassed === false) sentence += ` (automated checks failing)`;
      return `${sentence}.`;
    }
    case "skill.checks_failed":
      return `Submitted ${q(d.slug)} version ${d.version}, but the automated checks failed.`;
    case "skill.delisted":
      return `Delisted ${q(d.slug)} from the catalog.`;
    case "source.delisted": {
      const label = d.repo ?? d.url ?? "the direct-submission source";
      const n = Number(d.skillCount ?? 0);
      return `Delisted the source ${q(label)}; ${n} published skill${n === 1 ? "" : "s"} left the catalog.`;
    }
    case "skill.official_set":
      return d.official ? `Endorsed ${q(d.slug)} as Official.` : `Moved ${q(d.slug)} to Community.`;
    case "seed.completed":
      return d.note ? `${d.note}.` : "Seeded the demo data.";
    default: {
      const extras = Object.keys(d).length ? ` (${JSON.stringify(d)})` : "";
      return `${eventLabel(type)}.${extras}`;
    }
  }
}
