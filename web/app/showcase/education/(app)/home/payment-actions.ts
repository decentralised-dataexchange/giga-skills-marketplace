"use server";

import { issueDiplomaWithPayment, type DiplomaClaims } from "@/lib/showcase/server/issuance";

/**
 * Start the paid diploma issuance (dynamic credential request) with the
 * chosen payment method. The claim values come from the browser's registry
 * store; identity is client-asserted, which is acceptable for this
 * fictional demo - the server holds no user state and the payee, amount
 * and definition ids stay server-side.
 */
export async function startPayment(
  claims: DiplomaClaims,
  method: "account" | "card",
): Promise<{ exchangeId: string; qrUri: string }> {
  return issueDiplomaWithPayment(claims, method);
}
