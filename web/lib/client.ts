// Browser-side API helper and auth store (bearer token in localStorage).
"use client";

import { useSyncExternalStore } from "react";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "builder" | "provider" | "reviewer" | "superadmin";
  avatar?: string | null;
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
  update(patch: Partial<SessionUser>) {
    const current = auth.user;
    if (!current) return;
    localStorage.setItem("user", JSON.stringify({ ...current, ...patch }));
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

/* Relative "X ago" time. */
export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
