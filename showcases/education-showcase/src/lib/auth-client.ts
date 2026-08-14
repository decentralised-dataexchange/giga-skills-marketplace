"use client";

import { createAuthClient } from "better-auth/react";

import { BASE_PATH } from "@/lib/base-path";

// Under the monolith base path the auth handler is not at /api/auth, so the
// client needs the full URL. Empty base path keeps the same-origin default.
const baseURL =
  BASE_PATH && typeof window !== "undefined"
    ? `${window.location.origin}${BASE_PATH}/api/auth`
    : undefined;

export const authClient = createAuthClient(baseURL ? { baseURL } : {});

export const { signIn, signOut, useSession } = authClient;
