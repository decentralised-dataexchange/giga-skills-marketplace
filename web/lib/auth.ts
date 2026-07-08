// Accounts, sessions, and roles. Auth is a bearer token in the Authorization header.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

export const ROLES = ["builder", "provider", "reviewer", "superadmin"] as const;
export type Role = (typeof ROLES)[number];
export const GOVERNANCE_ROLES: Role[] = ["reviewer", "superadmin"];

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: string;
  settings: { openrouterKey?: string; model?: string };
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(":");
  return timingSafeEqual(Buffer.from(digest, "hex"), scryptSync(password, salt, 64));
}

export async function issueToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await sql`INSERT INTO tokens (token, user_id) VALUES (${token}, ${userId})`;
  return token;
}

export async function userFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const [row] = await sql`
    SELECT u.id, u.email, u.name, u.role, u.status, u.settings
    FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ${token}`;
  return row && row.status === "active" ? (row as unknown as User) : null;
}
