import { sql, logEvent, json } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { publicUser } from "@/lib/views";

// Uploaded avatars live in the settings JSONB as a data URL. Cap the size so a
// large image cannot bloat the row (roughly 256 KB of decoded bytes).
const MAX_AVATAR_CHARS = 350_000;

export const GET = route(async ({ user }) => ({ user: user ? publicUser(user) : null }));

export const PATCH = route(async ({ user, body }) => {
  const { name, email, avatar } = await body<{ name?: string; email?: string; avatar?: string | null }>();
  const updates: { name?: string; email?: string } = {};

  if (name !== undefined) {
    check(name.trim().length >= 2, 400, "Name must be at least 2 characters");
    updates.name = name.trim();
  }

  if (email !== undefined) {
    const clean = email.toLowerCase().trim();
    check(/.+@.+\..+/.test(clean), 400, "email: value is not a valid email address");
    if (clean !== user!.email) {
      const [dupe] = await sql`SELECT 1 FROM users WHERE email = ${clean} AND id <> ${user!.id}`;
      check(!dupe, 409, "An account with that email already exists");
      updates.email = clean;
    }
  }

  const settings = { ...user!.settings };
  if (avatar !== undefined) {
    if (avatar === null || avatar === "") {
      delete settings.avatar;
    } else {
      check(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(avatar), 400, "Avatar must be a PNG, JPEG, GIF, or WebP image");
      check(avatar.length <= MAX_AVATAR_CHARS, 400, "Avatar image is too large (max ~256 KB)");
      settings.avatar = avatar;
    }
  }

  if (updates.name !== undefined || updates.email !== undefined) {
    await sql`
      UPDATE users
      SET name = ${updates.name ?? user!.name}, email = ${updates.email ?? user!.email}
      WHERE id = ${user!.id}`;
  }
  if (avatar !== undefined) {
    await sql`UPDATE users SET settings = ${json(settings)} WHERE id = ${user!.id}`;
  }

  await logEvent("user.profile_updated", user!.id, { userId: user!.id }, {
    nameChanged: updates.name !== undefined,
    emailChanged: updates.email !== undefined,
    avatarChanged: avatar !== undefined,
  });

  const merged = { ...user!, ...updates, settings };
  return { user: publicUser(merged) };
}, { auth: true });
