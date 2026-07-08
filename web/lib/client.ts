// Browser-side API helper and auth store (bearer token in localStorage).
"use client";

import { useSyncExternalStore } from "react";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "builder" | "provider" | "reviewer" | "superadmin";
}

export const auth = {
  get token(): string {
    return typeof window === "undefined" ? "" : localStorage.getItem("token") ?? "";
  },
  get user(): SessionUser | null {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("user") ?? "null");
    } catch {
      return null;
    }
  },
  signIn(token: string, user: SessionUser) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    notifySession();
  },
  signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    notifySession();
  },
};

/* Session as an external store, so components re-render on sign-in/out. */
const sessionListeners = new Set<() => void>();
let sessionCache: SessionUser | null = null;
let sessionCacheRead = false;

function notifySession() {
  sessionCacheRead = false;
  sessionListeners.forEach((fn) => fn());
}

function sessionSnapshot(): SessionUser | null {
  if (!sessionCacheRead) {
    sessionCache = auth.user;
    sessionCacheRead = true;
  }
  return sessionCache;
}

export function useSession(): SessionUser | null {
  return useSyncExternalStore(
    (fn) => (sessionListeners.add(fn), () => sessionListeners.delete(fn)),
    sessionSnapshot,
    () => null,
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(path, {
    ...init,
    headers: { ...headers, ...init.headers },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && auth.token) {
    // Stale or revoked session: sign out locally and return to the login page.
    auth.signOut();
    location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
    throw new Error("Session expired, please sign in again");
  }
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function fmtDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";
}
