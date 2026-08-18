"use server";

import { ows, requiredEnv } from "@/lib/showcase/server/ows";
import { readVerification, type VerificationResult } from "@/lib/showcase/server/verification";

/**
 * The candidate's application brokers, public by design (the candidate is
 * an anonymous visitor). One wallet request asks for the PID (to fill the
 * personal fields) and the diploma (the qualification evidence); the
 * candidate reviews the filled form in the browser and submits there. The
 * audit events live in the browser's own trail.
 */

export async function startApplicationRequest(): Promise<{
  exchangeId: string;
  qrUri: string;
}> {
  const answer = await ows(
    "civicworks",
    "POST",
    "/v3/config/digital-wallet/openid/sdjwt/verification/send",
    {
      presentationDefinitionId: requiredEnv(
        "DIPLOMA_PRESENTATION_DEFINITION_ID",
        "Job application",
      ),
      // By reference: the QR carries a request_uri, not the whole request.
      requestByReference: true,
    },
  );

  const history = answer?.verificationHistory ?? answer;
  const exchangeId: string | undefined = history?.presentationExchangeId;
  const qrUri: string | undefined = history?.vpTokenQrCode;
  if (!exchangeId || !qrUri) {
    throw new Error("The wallet service could not start the request.");
  }
  return { exchangeId, qrUri };
}

/** Read the finished presentation so the form can be filled for review. */
export async function readApplicationData(exchangeId: string): Promise<VerificationResult | null> {
  return readVerification(exchangeId);
}
