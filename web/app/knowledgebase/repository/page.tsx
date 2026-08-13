import Link from "next/link";

export const metadata = {
  title: "Build a skills repository · Knowledgebase · Giga Skills Marketplace",
  description:
    "How to lay out a public GitHub repository so the marketplace discovers every skill in it.",
};

const TREE = `acme-skills/                 <- public GitHub repository
├── README.md
├── LICENSE
├── acme-education-issuer/   <- one directory = one skill
│   ├── SKILL.md
│   ├── openapi/issuer.yaml
│   ├── schemas/learner-credential.json
│   └── rulebooks/issuance.md
└── acme-education-verifier/
    ├── SKILL.md
    ├── openapi/verifier.yaml
    └── rulebooks/verification.md
`;

export default function RepositoryPage() {
  return (
    <>
      <h1>Build a skills repository</h1>
      <p className="docs-lead">
        The marketplace discovers skills by scanning a public GitHub repository: every directory
        that holds a <code>SKILL.md</code> becomes one skill. The repository is also where published
        skills install from, so its shape matters.
      </p>

      <h2>Layout</h2>
      <pre>
        <code>{TREE}</code>
      </pre>
      <ul>
        <li>
          <strong>One directory per skill</strong>, each with its own <code>SKILL.md</code> and its
          own reference files. Nested locations work too - discovery walks the whole tree.
        </li>
        <li>
          <strong>A LICENSE file at the root.</strong> The repository licence is shown as provenance
          in the catalog and checked by reviewers.
        </li>
        <li>
          <strong>A README for humans.</strong> The marketplace reads the skills; visitors who land
          on GitHub read the README.
        </li>
      </ul>

      <h2>Releases and tags</h2>
      <p>
        Tag the repository when you want a named, stable submission point (for example{" "}
        <code>2026.08.0</code>). Submitting a tag pins the skills to that exact state; submitting a
        branch pins them to the branch’s head commit at that moment. Either way, later pushes never
        change what was reviewed. See <Link href="/knowledgebase/sources">Source repositories</Link>
        .
      </p>

      <h2>One repository or many</h2>
      <p>
        Both work. A single repository holding your whole catalogue is easiest to maintain and
        submit; separate repositories make sense when skills have different release cadences or
        owners. When submitting, you can also select only a subset of the skill directories a
        repository contains.
      </p>

      <h2>Keep it public</h2>
      <p>
        The repository must stay public: the marketplace fetches it for verification, the catalog
        deep-links into it, and the skills CLI installs from it. A repository that disappears breaks
        installation for everyone who uses your skills.
      </p>
    </>
  );
}
