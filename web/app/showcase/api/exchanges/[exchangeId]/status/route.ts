import { ows, type OwsOrg } from "@/lib/showcase/server/ows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /showcase/api/exchanges/{exchangeId}/status?org=..&kind=.. - the
 * exchange's live status, read straight from the OWS record. No webhooks
 * and no relay storage: the browser polls, this route asks OWS, and the
 * answer keeps the webhook topic vocabulary so the client reads one
 * language. OWS makes exactly one webhook delivery attempt with no retry,
 * so polling the record is also the more robust channel.
 *
 * The exchange id alone does not say which sandbox and history hold it, so
 * the caller names them; the pair is allow-listed. Identity is
 * client-asserted, like every broker of this fictional demo.
 */

// Issuance statuses that map 1:1 onto webhook topic names.
const ISSUANCE_TOPIC_STATUSES = [
  "offer_received",
  "token_issued",
  "credential_acked",
  "credential_accepted",
];

const SOURCES: Record<string, OwsOrg> = {
  "moe/presentation": "moe",
  "moe/issuance": "moe",
  "civicworks/presentation": "civicworks",
};

export async function GET(req: Request, ctx: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await ctx.params;
  const url = new URL(req.url);
  const org = url.searchParams.get("org") ?? "";
  const kind = url.searchParams.get("kind") ?? "";
  if (!SOURCES[`${org}/${kind}`]) {
    return Response.json({ error: "Unknown exchange source" }, { status: 400 });
  }

  const events: Array<{ topic: string; org: string }> = [];
  try {
    if (kind === "issuance") {
      const record = await ows(
        org as OwsOrg,
        "GET",
        `/v2/config/digital-wallet/openid/sdjwt/credential/history/${encodeURIComponent(exchangeId)}`,
      );
      const status = String(record?.credentialHistory?.status ?? "");
      if (ISSUANCE_TOPIC_STATUSES.includes(status)) {
        events.push({ topic: `openid.credential.${status}`, org });
      }
    } else {
      const record = await ows(
        org as OwsOrg,
        "GET",
        `/v3/config/digital-wallet/openid/sdjwt/verification/history/${encodeURIComponent(exchangeId)}`,
      );
      const history = record?.verificationHistory ?? record;
      // The holder answered: verified decision made, a vpTokenResponse
      // present, or the terminal status. The client then reads the full
      // record through its own broker, which re-checks `verified`.
      const answered =
        history?.verified === true ||
        (Array.isArray(history?.vpTokenResponse) && history.vpTokenResponse.length > 0) ||
        history?.status === "presentation_acked";
      if (answered) {
        events.push({ topic: "digitalwallet.presentation.verified", org });
      }
    }
  } catch {
    // Transient OWS error: answer empty; the browser polls again.
  }
  return Response.json({ events });
}
