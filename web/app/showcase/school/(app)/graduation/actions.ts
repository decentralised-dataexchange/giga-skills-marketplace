"use server";

import { revokeDiplomaCredential } from "@/lib/showcase/server/issuance";

/**
 * Permanently revoke an issued diploma by its OWS exchange id. The registry
 * record-keeping happens in the browser store; this action performs the
 * real OWS revocation. A fresh employer verification then rejects the
 * credential. Identity is client-asserted, acceptable for this demo.
 */
export async function revokeIssuedDiploma(owsExchangeId: string): Promise<void> {
  await revokeDiplomaCredential(owsExchangeId);
}
