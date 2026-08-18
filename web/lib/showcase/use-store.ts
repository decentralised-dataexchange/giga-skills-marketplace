"use client";

import { useSyncExternalStore } from "react";

import { getServerState, getState, subscribe, type ShowcaseState } from "@/lib/showcase/store";

/**
 * Read the showcase store from a client component. The whole state object is
 * the snapshot (it is small); components read the slices they need. During
 * server render and hydration the snapshot is the empty state with
 * `hydrated: false`, so guards know to wait rather than redirect.
 */
export function useShowcaseStore(): ShowcaseState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}
