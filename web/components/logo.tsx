import { cn } from "@/lib/utils";

// The ITU emblem, served from /public/itu-logo.svg.
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVG
    <img src="/itu-logo.svg" alt="ITU" className={cn("h-9 w-auto", className)} />
  );
}
