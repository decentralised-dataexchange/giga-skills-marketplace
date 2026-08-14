import { consumeEvents } from '@/lib/webhook/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/exchanges/{exchangeId}/status - polling fallback.
 * Same consume-and-delete semantics as the SSE stream, as one JSON answer.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ exchangeId: string }> }
) {
  const { exchangeId } = await ctx.params;
  const events = consumeEvents(exchangeId);
  return Response.json({ events: events.map((event) => event.payload) });
}
