// The AI coding agents the marketplace targets (shown in the hero strip), and
// the `skills` CLI commands that install a published skill from its source
// repository.

export type AgentId = "claude" | "codex" | "opencode" | "pi";

export interface AgentDef {
  id: AgentId;
  label: string;
}

export const AGENTS: AgentDef[] = [
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex CLI" },
  { id: "opencode", label: "opencode" },
  { id: "pi", label: "Pi" },
];

export interface InstallSource {
  /** GitHub repository URL, e.g. https://github.com/l3-igrant/skills. */
  repoUrl?: string | null;
  /** The skill's slug (its manifest name). */
  skillId: string;
}

/** `<owner>/<repo>` shorthand of a GitHub repository URL. */
function repoShorthand(repoUrl: string): string {
  return repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "");
}

/**
 * `npx skills add` command for one skill from its source repository, e.g.
 * `npx skills add l3-iGrant/skills --skill igrantio-qr-code`.
 * The marketplace only accepts public GitHub repositories, so a published
 * skill always has one; without it no valid install command exists.
 */
export function installCommand({ repoUrl, skillId }: InstallSource): string {
  if (!repoUrl) return "";
  return `npx skills add ${repoShorthand(repoUrl)} --skill ${skillId}`;
}

/** `npx skills add` command for every skill in a repository. */
export function installRepoCommand(repoUrl: string): string {
  return `npx skills add ${repoShorthand(repoUrl)}`;
}

/**
 * `npx skills add` command for a chosen set of skills from a repository, e.g.
 * `npx skills add l3-iGrant/skills --skill igrantio-qr-code --skill igrantio-pid`.
 * The `skills` CLI accepts one repeatable `--skill` flag, so each skill adds a
 * flag. With no skill ids given, it falls back to the whole-repository command.
 */
export function installSkillsCommand(repoUrl: string, skillIds: string[]): string {
  if (!repoUrl) return "";
  if (!skillIds.length) return installRepoCommand(repoUrl);
  const flags = skillIds.map((id) => `--skill ${id}`).join(" ");
  return `npx skills add ${repoShorthand(repoUrl)} ${flags}`;
}
