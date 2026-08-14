import { consumeEvents } from "@/lib/webhook/store";

// Long-lived streaming response; never cache, always run on the node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TICK_MS = 1000;
const MAX_MS = 5 * 60 * 1000;

/**
 * GET /api/exchanges/{exchangeId}/events - Server-Sent Events stream.
 *
 * Emits each stored webhook event for this exchange as soon as it arrives
 * (checked once a second, consume-and-delete), with a keepalive comment every
 * 15 seconds, and closes after five minutes. The flows that wait on an
 * issuance or a presentation open this stream and close it on the terminal
 * event; the polling endpoint is the fallback.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await ctx.params;
  const enc = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(": open\n\n"));
      let ticks = 0;
      interval = setInterval(() => {
        ticks += 1;
        try {
          const events = consumeEvents(exchangeId);
          for (const event of events) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(event.payload)}\n\n`));
          }
          if (events.length === 0 && ticks % 15 === 0) {
            controller.enqueue(enc.encode(": keepalive\n\n"));
          }
          if (ticks * TICK_MS >= MAX_MS) {
            controller.close();
            if (interval) clearInterval(interval);
          }
        } catch {
          // Transient store error: keep the stream open and retry next tick.
        }
      }, TICK_MS);
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
