import { cn } from "@/lib/utils";

// Matches the marketplace "organisation" monogram: a light circle with
// brand-blue initials, or the uploaded image.
const SIZES = {
  sm: "size-8 rounded-full text-xs",
  md: "size-10 rounded-full text-sm",
  lg: "size-24 rounded-full text-3xl",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  name,
  avatar,
  size = "md",
  className,
  decorative = false,
}: {
  name: string;
  avatar?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  decorative?: boolean;
}) {
  const label = decorative ? "" : `${name} avatar`;

  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user data URL, not a static asset
      <img
        src={avatar}
        alt={label}
        aria-hidden={decorative || undefined}
        className={cn("shrink-0 object-cover ring-1 ring-brand/15", SIZES[size], className)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        "grid shrink-0 place-items-center bg-cyan-tint font-bold tracking-tight text-brand ring-1 ring-brand/15",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
