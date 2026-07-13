// The AI coding agents the marketplace targets, and how each one references an
// installed skill. Single source of truth — the hero strip, skill install
// section, and the use-case prompt tabs all read from here.
//
// NOTE: `skillRef` is the marketplace's recommended way to reference an installed
// skill for each agent. Adjust the tokens here if an agent's convention changes;
// every surface updates automatically.

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

export const AGENT_LABELS: string[] = AGENTS.map((a) => a.label);

/** How to reference an installed skill by id in a prompt, per agent. */
export function skillRef(agent: AgentId, skillId: string): string {
  return agent === "claude" ? `/${skillId}` : `@${skillId}`;
}

// Prompt skill-reference syntax:  <skill:skill-id>
const SKILL_TOKEN = /<skill:([a-zA-Z0-9._-]+)>/g;

/** All skill ids referenced via <skill:...> tokens in a prompt. */
export function skillTokens(text: string): string[] {
  return [...text.matchAll(SKILL_TOKEN)].map((m) => m[1]);
}

/** Replace every <skill:id> token with the agent's invocation syntax (plain text). */
export function renderPromptText(text: string, agent: AgentId): string {
  return text.replace(SKILL_TOKEN, (_m, id) => skillRef(agent, id));
}

/** Split a prompt into literal text and skill-token segments for rich rendering. */
export type PromptSegment = { type: "text"; value: string } | { type: "skill"; id: string };

export function parsePrompt(text: string): PromptSegment[] {
  const out: PromptSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(SKILL_TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    out.push({ type: "skill", id: m[1] });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/** Copy-pasteable install snippet: unzip the downloaded bundle + how to invoke. */
export function installSnippet(agent: AgentId, skillId: string): string {
  switch (agent) {
    case "claude":
      return [
        `# Unzip the downloaded bundle into your Claude Code skills directory`,
        `unzip ${skillId}.zip -d .claude/skills/`,
        `# Invoke it in a prompt:  ${skillRef("claude", skillId)}`,
      ].join("\n");
    case "codex":
      return [
        `# Unzip into your project and reference it from AGENTS.md`,
        `unzip ${skillId}.zip -d skills/`,
        `# AGENTS.md: "See ./skills/${skillId}/SKILL.md and the openapi/ specs."`,
        `# Invoke it in a prompt:  ${skillRef("codex", skillId)}`,
      ].join("\n");
    case "opencode":
      return [
        `# Unzip and add it to opencode.json instructions`,
        `unzip ${skillId}.zip -d skills/`,
        `# opencode.json: { "instructions": ["./skills/${skillId}/SKILL.md"] }`,
        `# Invoke it in a prompt:  ${skillRef("opencode", skillId)}`,
      ].join("\n");
    case "pi":
      return [
        `# Unzip into the agent's skill paths`,
        `unzip ${skillId}.zip -d skills/`,
        `# Add ./skills/${skillId}/SKILL.md to Pi's skill paths`,
        `# Invoke it in a prompt:  ${skillRef("pi", skillId)}`,
      ].join("\n");
  }
}
