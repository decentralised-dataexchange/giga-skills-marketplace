import { cn } from "@/lib/utils";

// The marketplace logo, served from /public/logo.png.
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand image
    <img src="/logo.png" alt="ITU Skills Marketplace" className={cn("h-9 w-auto", className)} />
  );
}
