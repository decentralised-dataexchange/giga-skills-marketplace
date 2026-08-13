import Link from "next/link";

export const metadata = {
  title: "Onboard your organisation · Knowledgebase · Giga Skills Marketplace",
  description:
    "Create a provider account, register your organisation, and get ready to publish skills.",
};

export default function OnboardingPage() {
  return (
    <>
      <h1>Onboard your organisation</h1>
      <p className="docs-lead">
        Onboarding takes minutes and needs no approval: create an account, register your
        organisation, and you can publish immediately. Only your skills go through review.
      </p>

      <h2>1. Create a provider account</h2>
      <p>
        Open the <Link href="/login">sign-in page</Link> and choose <strong>Create account</strong>.
        Self-registration always gets the <em>provider</em> role; governance roles are granted by a
        marketplace operator, never claimed.
      </p>

      <h2>2. Register your organisation</h2>
      <p>
        In the dashboard, open <strong>Organisation</strong> and register yours:
      </p>
      <ul>
        <li>
          <strong>Name</strong> - the display name shown across the catalog.
        </li>
        <li>
          <strong>Handle</strong> (optional) - the URL-safe slug for your public page, e.g.{" "}
          <code>igrant-io</code> gives <code>/marketplace/igrant-io</code>. Derived from the name if
          left empty.
        </li>
        <li>
          <strong>Website</strong> and a short <strong>description</strong> of what you provide.
        </li>
      </ul>
      <p>
        Registration is immediate. You can edit the name, website, description, and upload a logo at
        any time from the same page.
      </p>

      <div className="docs-callout">
        <p>
          Your organisation stays{" "}
          <strong>out of the public catalog until its first skill is published</strong>. Registering
          creates your publishing identity; publishing makes it visible.
        </p>
      </div>

      <h2>3. Prepare your skills</h2>
      <p>Skills live in a public GitHub repository, not in the marketplace. Next steps:</p>
      <ul>
        <li>
          <Link href="/knowledgebase/authoring">Author a skill</Link> - write the{" "}
          <code>SKILL.md</code> and gather its reference files.
        </li>
        <li>
          <Link href="/knowledgebase/repository">Build a skills repository</Link> - lay the skills
          out so the marketplace can discover them.
        </li>
        <li>
          <Link href="/knowledgebase/publishing">Publish and update skills</Link> - submit the
          repository for review.
        </li>
      </ul>
    </>
  );
}
