import { cn } from "@/lib/utils";
import { AGENTS as AGENT_DEFS } from "@/lib/agents";

// Official brand marks for the AI coding agents a skill file installs into,
// served from /public/agents. Some logos ship their own dark tile (opencode,
// Pi); the white OpenAI mark needs a dark chip; the rest sit on a white chip.
type AgentKey = "claude" | "codex" | "opencode" | "pi";

interface LogoDef {
  src: string;
  label: string;
  chip: string; // background chip so every mark stays visible
  pad: string;
  fit: string;
}

const LOGOS: Record<AgentKey, LogoDef> = {
  claude: {
    src: "/agents/claude.svg",
    label: "Claude Code",
    chip: "bg-white ring-1 ring-black/10",
    pad: "p-1",
    fit: "object-contain",
  },
  codex: {
    src: "/agents/openai.svg",
    label: "Codex CLI",
    chip: "bg-white ring-1 ring-black/10",
    pad: "p-1",
    fit: "object-contain",
  },
  opencode: {
    src: "/agents/opencode.svg",
    label: "opencode",
    chip: "",
    pad: "",
    fit: "object-cover",
  },
  pi: { src: "/agents/pi.svg", label: "Pi", chip: "", pad: "", fit: "object-cover" },
};

function keyFor(name: string): AgentKey {
  const n = name.toLowerCase();
  if (n.includes("claude")) return "claude";
  if (n.includes("codex") || n.includes("openai")) return "codex";
  if (n.includes("pi")) return "pi";
  return "opencode";
}

export function AgentLogo({ name, className }: { name: string; className?: string }) {
  const logo = LOGOS[keyFor(name)];
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center overflow-hidden rounded-md",
        logo.chip,
        logo.pad,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- small static brand SVG */}
      <img src={logo.src} alt={`${name} logo`} className={cn("size-full", logo.fit)} />
    </span>
  );
}

// The AI coding agents a skill file installs into. Order is shared across the
// hero strip and each skill's install section so the set reads consistently.
export const AGENTS = AGENT_DEFS.map((a) => a.label);

export function AgentsStrip({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      {label && <span className="text-sm font-semibold text-muted-foreground">{label}</span>}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {AGENTS.map((a) => (
          <li key={a} className="flex items-center gap-2">
            <AgentLogo name={a} />
            <span className="text-sm font-medium text-ink">{a}</span>
          </li>
        ))}
        <li className="text-sm font-medium text-muted-foreground">and many more</li>
      </ul>
    </div>
  );
}
