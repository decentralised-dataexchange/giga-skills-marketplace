import Link from "next/link";

const PARTNERS = ["ITU", "UNICEF", "Giga", "GovStack", "iGrant.io"];

const LINKS = [
  { href: "/", label: "Marketplace" },
  { href: "/login", label: "Publish a skill" },
  { href: "https://w3c-ccg.github.io/vc-ed/", label: "VC for Education", external: true },
  { href: "https://govstack.global/", label: "GovStack", external: true },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-footer text-white/90">
      <div className="mx-auto max-w-[1536px] px-5 py-14">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-b border-white/10 pb-10">
          {PARTNERS.map((p) => (
            <span key={p} className="text-sm font-semibold tracking-wide text-white/70">
              {p}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <p className="text-white/60">
            AI-Enabled GovBuild Education Wallet Building Block · ITU / UNICEF Giga Initiative
          </p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LINKS.map((l) =>
              l.external ? (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} className="text-white/70 transition-colors hover:text-white">
                  {l.label}
                </Link>
              ),
            )}
          </nav>
        </div>
        <p className="mt-6 text-xs text-white/70">© 2026 · Prototype Knowledge Product. GovStack Wallet Building Block · W3C Verifiable Credentials · OpenID4VCI / OpenID4VP.</p>
      </div>
    </footer>
  );
}
