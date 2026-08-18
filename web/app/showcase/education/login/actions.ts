"use server";

import {
  completePidLoginRequest,
  startPidLoginRequest,
  type PidLoginResult,
} from "@/lib/showcase/server/pid";

/**
 * The PID wallet login brokers. Stateless: the wallet verification is real
 * (OWS OpenID4VP), but the resulting session is the browser's own fake
 * localStorage session - nothing is minted or persisted server-side.
 */

export async function startPidLogin(): Promise<{ exchangeId: string; qrUri: string }> {
  return startPidLoginRequest();
}

export async function completePidLogin(exchangeId: string): Promise<PidLoginResult | null> {
  return completePidLoginRequest(exchangeId);
}
