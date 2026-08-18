"use client";

/**
 * The showcase demo state, stored entirely in this browser's localStorage.
 *
 * The showcase is a self-guided demo: sessions are fake (nothing is verified
 * server-side and nothing persists beyond this browser), and the National
 * Learner Registry's records - learner profile, applications, credential
 * exchanges, audit trail - are this visitor's own. All portals share one
 * origin, so the school portal reads the application the learner submitted
 * in the education portal from the same store. The server holds no user
 * state: it is a stateless broker for wallet (OWS) and consent calls.
 *
 * Every key is namespaced `giga.showcase.*` and holds JSON. A version key
 * guards the shape: on mismatch the whole namespace is wiped, which is the
 * demo's reset semantics.
 */

const VERSION = "1";
const NS = "giga.showcase.";

const KEYS = {
  version: `${NS}version`,
  sessionLearner: `${NS}session.learner`,
  sessionSchool: `${NS}session.school`,
  learner: `${NS}learner`,
  applications: `${NS}applications`,
  exchanges: `${NS}exchanges`,
  audit: `${NS}audit`,
} as const;

export type LearnerSession = {
  pseudonym: string;
  displayName: string;
  signedInAt: string;
};

export type SchoolSession = {
  email: string;
  name: string;
  signedInAt: string;
};

export type LearnerProfile = {
  pseudonym: string;
  displayName: string;
  /** Transient PID prefill; cleared when the application is submitted. */
  prefill: { dateOfBirth: string; email: string; address: string } | null;
  ulid: string | null;
  /** The Consent Building Block individual, once onboarded. */
  individualId: string | null;
  createdAt: string;
};

export type ApplicationStatus =
  | "submitted"
  | "approved"
  | "graduation_submitted"
  | "payment_pending"
  | "issued";

export type ApplicationForm = {
  firstName: string;
  familyName: string;
  dateOfBirth: string;
  email: string;
  address: string;
  priorEducation: string;
  specialSupport: string;
  consentAnalytics: boolean;
  consentEmployerSharing: boolean;
  studentIdOffer?: string;
  studentIdExchangeId?: string;
  studentIdPin?: string;
  diplomaOffer?: string;
  diplomaExchangeId?: string;
  paymentMethod?: "account" | "card";
};

export type Application = {
  id: string;
  learnerPseudonym: string;
  learnerName: string;
  institutionId: string;
  institutionName: string;
  esrRef: string;
  status: ApplicationStatus;
  form: ApplicationForm;
  documents: string[];
  programme: string | null;
  qualificationCode: string | null;
  result: string | null;
  graduationDocHash: string | null;
  paymentExchangeId: string | null;
  paymentLedgerRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExchangeRecord = {
  direction: "issuance" | "presentation";
  credentialType: "pid-login" | "student-id" | "diploma" | "diploma-verify";
  applicationId?: string;
  /** The latest webhook topic seen for this exchange. */
  status: string;
  revoked: boolean;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  seq: number;
  id: string;
  actorPseudonym: string | null;
  actorRole: string;
  action: string;
  subjectType: string;
  subjectId: string;
  /** JSON-encoded detail payload. */
  payload: string;
  prevHash: string;
  hash: string;
  createdAt: string;
};

export type ShowcaseState = {
  /** False during server render and hydration; guards wait for true. */
  hydrated: boolean;
  sessionLearner: LearnerSession | null;
  sessionSchool: SchoolSession | null;
  learner: LearnerProfile | null;
  applications: Application[];
  exchanges: Record<string, ExchangeRecord>;
  audit: AuditEvent[];
};

export const EMPTY_STATE: ShowcaseState = {
  hydrated: false,
  sessionLearner: null,
  sessionSchool: null,
  learner: null,
  applications: [],
  exchanges: {},
  audit: [],
};

function readKey<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function wipeNamespace(): void {
  const stale: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(NS)) stale.push(key);
  }
  for (const key of stale) localStorage.removeItem(key);
}

function ensureVersion(): void {
  if (localStorage.getItem(KEYS.version) === VERSION) return;
  wipeNamespace();
  localStorage.setItem(KEYS.version, VERSION);
}

let cache: ShowcaseState | null = null;
const listeners = new Set<() => void>();
let storageListenerBound = false;

function loadState(): ShowcaseState {
  ensureVersion();
  return {
    hydrated: true,
    sessionLearner: readKey<LearnerSession>(KEYS.sessionLearner),
    sessionSchool: readKey<SchoolSession>(KEYS.sessionSchool),
    learner: readKey<LearnerProfile>(KEYS.learner),
    applications: readKey<Application[]>(KEYS.applications) ?? [],
    exchanges: readKey<Record<string, ExchangeRecord>>(KEYS.exchanges) ?? {},
    audit: readKey<AuditEvent[]>(KEYS.audit) ?? [],
  };
}

function notify(): void {
  cache = null;
  for (const listener of listeners) listener();
}

export function getState(): ShowcaseState {
  if (typeof window === "undefined") return EMPTY_STATE;
  cache ??= loadState();
  return cache;
}

export function getServerState(): ShowcaseState {
  return EMPTY_STATE;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageListenerBound && typeof window !== "undefined") {
    storageListenerBound = true;
    // Cross-tab sync: another tab's write lands here as a storage event.
    window.addEventListener("storage", (event) => {
      if (event.key === null || event.key.startsWith(NS)) notify();
    });
  }
  return () => listeners.delete(listener);
}

function writeKey(key: string, value: unknown): void {
  ensureVersion();
  if (value === null || value === undefined) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
  notify();
}

export const store = {
  setLearnerSession: (session: LearnerSession | null) => writeKey(KEYS.sessionLearner, session),
  setSchoolSession: (session: SchoolSession | null) => writeKey(KEYS.sessionSchool, session),
  setLearner: (learner: LearnerProfile | null) => writeKey(KEYS.learner, learner),
  setApplications: (applications: Application[]) => writeKey(KEYS.applications, applications),
  setExchanges: (exchanges: Record<string, ExchangeRecord>) => writeKey(KEYS.exchanges, exchanges),
  setAudit: (audit: AuditEvent[]) => writeKey(KEYS.audit, audit),
};

/** Update one application in place (by id) with a partial patch. */
export function patchApplication(id: string, patch: Partial<Application>): void {
  const now = new Date().toISOString();
  store.setApplications(
    getState().applications.map((app) =>
      app.id === id ? { ...app, ...patch, updatedAt: now } : app,
    ),
  );
}

/** Update (or create) one exchange record. */
export function patchExchange(owsExchangeId: string, patch: Partial<ExchangeRecord>): void {
  const now = new Date().toISOString();
  const exchanges = { ...getState().exchanges };
  const existing = exchanges[owsExchangeId];
  exchanges[owsExchangeId] = existing
    ? { ...existing, ...patch, updatedAt: now }
    : {
        direction: "issuance",
        credentialType: "student-id",
        status: "",
        revoked: false,
        revokedAt: null,
        createdAt: now,
        ...patch,
        updatedAt: now,
      };
  store.setExchanges(exchanges);
}

/** The learner's newest application, if any. */
export function latestApplication(state: ShowcaseState): Application | undefined {
  return [...state.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** True when the wallet has accepted the credential of this exchange. */
export function isExchangeAccepted(state: ShowcaseState, owsExchangeId: string): boolean {
  const status = state.exchanges[owsExchangeId]?.status;
  return (
    status === "openid.credential.credential_accepted" ||
    status === "openid.credential.credential_acked"
  );
}

/** The diploma exchange record for an application, if one exists. */
export function getDiplomaExchange(
  state: ShowcaseState,
  applicationId: string,
): (ExchangeRecord & { owsExchangeId: string }) | undefined {
  const entries = Object.entries(state.exchanges)
    .filter(
      ([, record]) => record.applicationId === applicationId && record.credentialType === "diploma",
    )
    .sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt));
  const first = entries[0];
  return first ? { owsExchangeId: first[0], ...first[1] } : undefined;
}

/**
 * Delete the learner's local data: profile, sessions, applications and
 * exchange records. The audit trail stays, mirroring the registry's
 * append-only semantics: deletion is itself an audited action.
 */
export function deleteLearnerData(): void {
  writeKey(KEYS.learner, null);
  writeKey(KEYS.sessionLearner, null);
  writeKey(KEYS.applications, null);
  writeKey(KEYS.exchanges, null);
}
