"use client";

import { store } from "@/lib/showcase/store";

/**
 * Sign out of one portal's fake session: remove that portal's localStorage
 * session key and return to the portal's public page. The other portal's
 * session survives - each portal keeps its own key, so the demo can switch
 * portals freely. A full navigation, not the client router: clearing the
 * session re-arms the route guard, and a hard leave wins that race
 * deterministically.
 */
export function SignOutButton({
  role,
  redirectTo,
  className,
}: {
  role: "learner" | "school";
  redirectTo: string;
  className?: string;
}) {
  function signOut() {
    if (role === "learner") store.setLearnerSession(null);
    else store.setSchoolSession(null);
    window.location.assign(redirectTo);
  }

  return (
    <button type="button" className={className} onClick={signOut}>
      Sign out
    </button>
  );
}
