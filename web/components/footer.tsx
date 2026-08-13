import Link from "next/link";
import { cn } from "@/lib/utils";

// Lean single-row footer in the iGrant.io backoffice treatment: 12px text on
// white with a hairline top border, pinned to the bottom of the viewport so it
// overlays the content as it scrolls.
const LINKS = [
  { href: "/knowledgebase", label: "Knowledgebase" },
  { href: "/login", label: "Publish a skill" },
  { href: "https://govstack.global/", label: "GovStack", external: true },
];

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-10 flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#e0e0e0] bg-white px-6 py-2 text-[12px] whitespace-nowrap text-black",
        className,
      )}
    >
      <p className="m-0">© 2026 ITU / UNICEF Giga · Education Wallet Building Block</p>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-3">
        {LINKS.map((l, i) => (
          <span key={l.href} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden="true" className="text-[#bdbdbd]">
                |
              </span>
            )}
            {l.external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/70 transition-colors hover:text-black"
              >
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-black/70 transition-colors hover:text-black">
                {l.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </footer>
  );
}
