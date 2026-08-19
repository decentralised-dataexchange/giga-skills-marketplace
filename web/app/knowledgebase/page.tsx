import Link from "next/link";
import { REPO_URL } from "@/components/nav-links";

export const metadata = {
  title: "Introduction · Knowledgebase · Giga Skills Marketplace",
  description:
    "What the Giga Skills Marketplace is, who it is for, and where to start in the documentation.",
};

export default function IntroductionPage() {
  return (
    <>
      <h1>Introduction</h1>
      <p className="docs-lead">
        The Giga Skills Marketplace is a catalog of provider-published, agent-agnostic{" "}
        <strong>skills</strong> for the education wallet building block. Wallet solution providers
        publish skills from their public GitHub repositories; every submission passes automated
        checks and human review; anyone can install a published skill into their own AI coding
        agent. This page is the map.
      </p>

      <div className="docs-callout">
        <p>
          <strong>New here?</strong> If you represent a wallet solution provider, start with{" "}
          <Link href="/knowledgebase/onboarding">Onboard your organisation</Link>. If you want to
          use skills in your agent, go straight to{" "}
          <Link href="/knowledgebase/installing">Install skills</Link>.
        </p>
      </div>

      <h2>Who this is for</h2>
      <ul>
        <li>
          <strong>Providers</strong> - organisations that build wallet solutions and want AI coding
          agents to integrate against their APIs correctly. You publish skills that carry your
          OpenAPI specs, credential schemas, and integration rulebooks.
        </li>
        <li>
          <strong>Builders</strong> - teams building a National Learner Registry or a
          digital-credential solution with an AI coding agent (Claude Code, Codex, opencode, Pi, and
          more). You install skills so your agent knows how to wire up a provider’s wallet.
        </li>
        <li>
          <strong>Reviewers and operators</strong> - the governance side of the marketplace, who
          review submissions and curate the catalog.
        </li>
      </ul>

      <h2>Prerequisites</h2>
      <p>To install skills you need:</p>
      <ul>
        <li>An AI coding agent that understands skill files (Claude Code, Codex, opencode, Pi).</li>
        <li>
          Node.js with <code>npx</code>, to run the{" "}
          <a href="https://github.com/vercel-labs/skills" target="_blank" rel="noopener">
            skills CLI
          </a>
          .
        </li>
      </ul>
      <p>To publish skills you also need:</p>
      <ul>
        <li>A marketplace account with the provider role (self-service registration).</li>
        <li>A public GitHub repository that holds your skill files.</li>
      </ul>

      <h2>What is in this knowledgebase</h2>
      <ul>
        <li>
          <Link href="/knowledgebase/how-it-works">How it works</Link> - the pipeline from a GitHub
          repository to an installed skill.
        </li>
        <li>
          <strong>Concepts</strong> - what a <Link href="/knowledgebase/providers">provider</Link>,
          a <Link href="/knowledgebase/skills">skill</Link>, and a{" "}
          <Link href="/knowledgebase/sources">source repository</Link> are.
        </li>
        <li>
          <strong>For providers</strong> - step-by-step guides:{" "}
          <Link href="/knowledgebase/onboarding">onboard your organisation</Link>,{" "}
          <Link href="/knowledgebase/authoring">author a skill</Link>,{" "}
          <Link href="/knowledgebase/repository">build a skills repository</Link>,{" "}
          <Link href="/knowledgebase/publishing">publish and update skills</Link>, and what{" "}
          <Link href="/knowledgebase/review">the review process</Link> does with your submission.
        </li>
        <li>
          <strong>For consumers</strong> -{" "}
          <Link href="/knowledgebase/installing">install skills</Link> into your agent.
        </li>
        <li>
          <strong>Reference</strong> - the{" "}
          <Link href="/knowledgebase/checks">automated checks</Link> and the{" "}
          <Link href="/knowledgebase/roles">roles and statuses</Link> used across the marketplace.
        </li>
      </ul>

      <h2>Open source</h2>
      <p>
        The marketplace and the education showcase are open source under the Apache 2.0 license. The
        source code, the deployment charts, and the contribution guide live in the{" "}
        <a href={REPO_URL} target="_blank" rel="noopener">
          giga-skills-marketplace
        </a>{" "}
        repository on GitHub, built for the ITU/UNICEF Giga initiative. Issues and pull requests are
        welcome there.
      </p>
    </>
  );
}
