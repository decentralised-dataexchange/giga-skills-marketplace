import { cn } from "@/lib/utils";

// The Giga wordmark, served from /public/giga-logo.svg.
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVG
    <img src="/giga-logo.svg" alt="Giga" className={cn("h-9 w-auto", className)} />
  );
}
