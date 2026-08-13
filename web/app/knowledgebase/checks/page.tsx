import Link from "next/link";

export const metadata = {
  title: "Automated checks · Knowledgebase · Giga Skills Marketplace",
  description:
    "The pre-review validation every skill bundle passes: what is checked, and what fails versus warns.",
};

const CHECKS: [what: string, level: "Fail" | "Warn", detail: string][] = [
  [
    "SKILL.md present and parseable",
    "Fail",
    "The file exists at the skill root and opens with a valid YAML frontmatter block.",
  ],
  ["Manifest declares name, description, license", "Fail", "All three fields are required."],
  [
    "Manifest declares a provider",
    "Fail",
    "Under metadata.provider (or top-level provider for legacy manifests).",
  ],
  [
    "Skill name is a valid slug",
    "Fail",
    "Lowercase letters, digits, and hyphens; 3-64 characters.",
  ],
  [
    "SKILL.md carries real instructions",
    "Fail",
    "At least 80 characters of body beyond the manifest.",
  ],
  [
    "OpenAPI spec present under openapi/",
    "Warn",
    "Recommended for API skills; absence is flagged, not blocking.",
  ],
  [
    "Each OpenAPI file is a valid 3.x document",
    "Fail",
    "Every .yaml/.json under openapi/ must parse and declare openapi: 3.x.",
  ],
  ["Schemas present under schemas/", "Warn", "Recommended by the marketplace guidelines."],
  ["Each schema file is valid JSON", "Fail", "Every .json under schemas/ must parse."],
  ["Rulebooks present under rulebooks/", "Warn", "Policy rules should be separable from code."],
  [
    "depends_on paths resolve",
    "Fail",
    "Every schema or rulebook the manifest names must exist inside the bundle.",
  ],
];

export default function ChecksPage() {
  return (
    <>
      <h1>Automated checks</h1>
      <p className="docs-lead">
        Every submitted skill bundle is validated automatically, and the full report travels with
        the submission into the review queue as evidence. Failing checks never auto-reject a
        submission: the reviewer weighs the report and decides. The only hard requirement is a
        parseable manifest with a valid name, without which the skill cannot be identified.
      </p>

      <h2>The checks</h2>
      <p>
        Fail-level findings weigh heaviest in review; warnings flag recommended practice. Neither
        blocks the queue.
      </p>
      <table>
        <thead>
          <tr>
            <th>Check</th>
            <th>Level</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {CHECKS.map(([what, level, detail]) => (
            <tr key={what}>
              <td>{what}</td>
              <td>{level}</td>
              <td>{detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Where you see the results</h2>
      <p>
        The full report appears in the provider’s <strong>My submissions</strong> view, in the
        reviewer’s pane, and - once published - in the skill’s public{" "}
        <Link href="/knowledgebase/review">review trail</Link>. Fix a failed bundle by updating the
        repository and resubmitting; see{" "}
        <Link href="/knowledgebase/publishing">Publish and update skills</Link>.
      </p>
    </>
  );
}
