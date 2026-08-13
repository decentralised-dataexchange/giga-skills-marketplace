// Account roles. Kept free of server imports so client screens can render the
// same lists the API validates against.

export const ROLES = ["provider", "reviewer", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export const GOVERNANCE_ROLES: Role[] = ["reviewer", "superadmin"];

/** Roles an operator may assign to an account. */
export const ASSIGNABLE_ROLES: Role[] = [...ROLES];

/** Roles a visitor may choose when registering; governance roles are granted, never claimed. */
export const SELF_SERVICE_ROLES: Role[] = ["provider"];

export const DEFAULT_SELF_SERVICE_ROLE: Role = "provider";
