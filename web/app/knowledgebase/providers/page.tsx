import Link from "next/link";

export const metadata = {
  title: "Providers · Knowledgebase · Giga Skills Marketplace",
  description:
    "What a provider organisation is, how registration works, and when a provider becomes publicly visible.",
};

export default function ProvidersPage() {
  return (
    <>
      <h1>Providers</h1>
      <p className="docs-lead">
        A provider is a wallet solution organisation that publishes skills - its OpenAPI specs,
        credential schemas, protocol flows, and integration rulebooks - so any AI coding agent can
        wire up its wallet.
      </p>

      <h2>Registration is instant</h2>
      <p>
        Anyone with a provider account can register an organisation from the Provider Console: name,
        an optional URL handle, website, and a short description. There is no approval step for
        organisations - only skills go through review.
      </p>

      <div className="docs-callout">
        <p>
          An organisation becomes{" "}
          <strong>publicly visible only after its first skill is published</strong>. Until then it
          exists only in the provider’s own console and the governance views.
        </p>
      </div>

      <h2>The provider page</h2>
      <p>
        Every visible provider has a public page at <code>/marketplace/&lt;provider&gt;</code>,
        where <code>&lt;provider&gt;</code> is the organisation’s URL handle (its UUID resolves
        too). The page shows the organisation’s logo and description, its source repositories, and
        every published skill with its install command.
      </p>

      <h2>Accountability</h2>
      <p>
        A super admin can rename an organisation, change its handle, reject it (which removes its
        publishing rights), or delete it together with everything it published. Every such action
        lands in the audit trail. See <Link href="/knowledgebase/roles">Roles and statuses</Link>.
      </p>
    </>
  );
}
