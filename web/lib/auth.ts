// Accounts, sessions, and roles. Auth is a bearer token in the Authorization header.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sql } from "./db";

const scrypt = promisify(scryptCallback);

export { ROLES, GOVERNANCE_ROLES, type Role } from "./roles";
import type { Role } from "./roles";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  createdAt: string;
  settings: {
    avatar?: string | null;
  };
}

export async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
): Promise<string> {
  const digest = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${digest.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, encodedDigest] = stored.split(":");
  if (!salt || !encodedDigest) return false;
  const expected = Buffer.from(encodedDigest, "hex");
  if (expected.length !== 64) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(expected, actual);
}

export async function issueToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await sql`INSERT INTO tokens (token, user_id) VALUES (${token}, ${userId})`;
  return token;
}

export async function userFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const [row] = await sql`
    SELECT u.id, u.email, u.name, u.role, u.status, u.settings, u.created_at AS "createdAt"
    FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ${token}`;
  return row && row.status === "active" ? (row as unknown as User) : null;
}
