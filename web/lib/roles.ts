// Account roles. Kept free of server imports so client screens can render the
// same lists the API validates against.
import { FEATURES } from "./features";

export const ROLES = ["builder", "provider", "reviewer", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export const GOVERNANCE_ROLES: Role[] = ["reviewer", "superadmin"];

// A disabled role stays a recognised value - accounts created before it was
// switched off keep it, and keep signing in - it just cannot be handed out.
const available = (role: Role) => role !== "builder" || FEATURES.developerRole;

/** Roles an operator may assign to an account. */
export const ASSIGNABLE_ROLES: Role[] = ROLES.filter(available);

/** Roles a visitor may choose when registering; governance roles are granted, never claimed. */
export const SELF_SERVICE_ROLES: Role[] = (["builder", "provider"] as Role[]).filter(available);

export const DEFAULT_SELF_SERVICE_ROLE: Role = SELF_SERVICE_ROLES[0] ?? "provider";

/** `builder` is named "Developer" everywhere it faces a person. */
export const roleLabel = (role: string) => (role === "builder" ? "Developer" : role);
