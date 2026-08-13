export const metadata = {
  title: "Author a skill · Knowledgebase · Giga Skills Marketplace",
  description:
    "How to write a SKILL.md: the manifest fields, the instruction body, and the reference files a skill carries.",
};

const EXAMPLE = `---
name: acme-education-issuer
description: Issue education credentials with the ACME wallet over OpenID4VCI.
version: 1.0.0
license: Apache-2.0
metadata:
  provider: ACME Wallets
  protocols: OpenID4VCI
targets:
  openapi: openapi/issuer.yaml
depends_on:
  schemas:
    - schemas/learner-credential.json
---

# ACME education issuer

Use this skill when the user wants to issue education credentials
with the ACME wallet. Read openapi/issuer.yaml for the API surface,
follow rulebooks/issuance.md for the policy rules, and validate
credential payloads against schemas/learner-credential.json.
`;

export default function AuthoringPage() {
  return (
    <>
      <h1>Author a skill</h1>
      <p className="docs-lead">
        One skill is one directory with a <code>SKILL.md</code> at its root. The file opens with a
        YAML manifest and continues with the instructions your skill gives an AI coding agent.
      </p>

      <h2>The SKILL.md</h2>
      <pre>
        <code>{EXAMPLE}</code>
      </pre>

      <h2>Manifest fields</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Required</th>
            <th>Rules</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>name</code>
            </td>
            <td>Yes</td>
            <td>
              The skill’s slug and identity: lowercase letters, digits, and hyphens, 3-64
              characters. Unique across the marketplace.
            </td>
          </tr>
          <tr>
            <td>
              <code>description</code>
            </td>
            <td>Yes</td>
            <td>One or two sentences; shown in the catalog and read by agents.</td>
          </tr>
          <tr>
            <td>
              <code>license</code>
            </td>
            <td>Yes</td>
            <td>
              An SPDX identifier such as <code>Apache-2.0</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>metadata.provider</code>
            </td>
            <td>Yes</td>
            <td>Your organisation’s name.</td>
          </tr>
          <tr>
            <td>
              <code>version</code>
            </td>
            <td>Recommended</td>
            <td>Your own version label; the marketplace also pins every submission to a commit.</td>
          </tr>
          <tr>
            <td>
              <code>targets</code>, <code>depends_on</code>
            </td>
            <td>Optional</td>
            <td>
              Paths to the OpenAPI spec, schemas, and rulebooks the skill relies on. Every path must
              resolve inside the skill directory.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>The instruction body</h2>
      <p>
        Everything after the closing <code>---</code> is what the agent reads. Write it for the
        agent: when to use the skill, which files to read, which endpoints to call, what to
        validate. The automated checks require at least 80 characters of instructions - real skills
        carry far more.
      </p>

      <h2>Reference files</h2>
      <ul>
        <li>
          <code>openapi/</code> - OpenAPI 3.x documents (<code>.yaml</code> or <code>.json</code>
          ). Each file must parse and declare <code>openapi: 3.x</code>.
        </li>
        <li>
          <code>schemas/</code> - JSON schema files; each must be valid JSON.
        </li>
        <li>
          <code>rulebooks/</code> - policy rules in markdown, separable from code.
        </li>
        <li>
          <code>references/</code> - anything else the agent should be able to consult.
        </li>
      </ul>
      <div className="docs-callout">
        <p>
          Keep a skill <strong>self-contained</strong>: every path in <code>depends_on</code> and{" "}
          <code>targets</code> must exist inside the skill’s own directory, because each skill is
          checked, reviewed, and installed as one unit.
        </p>
      </div>
    </>
  );
}
