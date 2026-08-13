import { redirect } from "next/navigation";

// The governance console opens on the review queue; the former Overview
// page's metrics live there now.
export default function GovernanceIndexRedirect() {
  redirect("/governance/review");
}
