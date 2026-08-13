// Server-side GitHub access for repository-based skill submissions.
//
// A provider names a public repository (optionally pinned to a commit, tag, or
// branch; the default branch's head otherwise). The marketplace resolves the
// ref to a commit SHA, walks the git tree, treats every directory holding a
// SKILL.md as one skill bundle, and downloads the bundle files pinned to that
// SHA. All fetching happens server-side so the stored snapshot and repository
// metadata are marketplace-verified, never client-supplied.
//
// GITHUB_TOKEN is optional; unauthenticated API calls are limited to 60/hour
// per IP, which covers light use (3 API calls per inspect or submit).
import { ApiError } from "./handler";
import type { BundleFile } from "./views";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const USER_AGENT = "giga-skills-marketplace";
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 400 * 1024;
const MAX_SKILLS = 200;
const RAW_CONCURRENCY = 8;

const JUNK_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|\.git|node_modules|\.github)(\/|$)/;
const BINARY_EXT_RE =
  /\.(png|jpe?g|gif|webp|avif|ico|icns|pdf|zip|gz|tgz|bz2|7z|jar|woff2?|ttf|otf|eot|mp3|mp4|mov|avi|webm|bin|exe|dll|dylib|so|class|wasm|pyc)$/i;
const SHA_RE = /^[0-9a-f]{40}$/i;

export interface RepoTarget {
  owner: string;
  repo: string;
  /** Commit SHA, tag, or branch; empty means the default branch's head. */
  ref?: string;
}

export interface RepoMetadata {
  url: string;
  owner: string;
  repo: string;
  description: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
  license: string | null;
  topics: string[];
}

export interface RepoSkill {
  /** Directory of the skill inside the repository; "" for the repository root. */
  dir: string;
  files: BundleFile[];
  /** Paths left out of the bundle and why (binary, oversize, budget). */
  skipped: string[];
}

export interface RepoSnapshot {
  meta: RepoMetadata;
  /** The ref the snapshot was requested at (branch, tag, or SHA). */
  ref: string;
  /** The commit SHA the ref resolved to; every file is pinned to it. */
  commit: string;
  skills: RepoSkill[];
}

/**
 * Accepts "owner/repo", "github.com/owner/repo", or a full https URL, with an
 * optional ".git" suffix or "/tree/<ref>" path carrying the ref.
 */
export function parseRepoUrl(input: string, ref?: string): RepoTarget {
  const cleaned = String(input ?? "").trim();
  const withoutScheme = cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^github\.com\//i, "");
  if (/^[a-z0-9-]+\.[a-z]+\//i.test(withoutScheme) && !cleaned.includes("github.com")) {
    throw new ApiError(400, "Only public github.com repositories are supported");
  }
  const parts = withoutScheme.replace(/\/+$/, "").split("/");
  const [owner, repoRaw] = parts;
  const repo = repoRaw?.replace(/\.git$/i, "");
  if (!owner || !repo || !/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new ApiError(400, "Enter a repository as https://github.com/<owner>/<repo>");
  }
  let parsedRef: string | undefined;
  if (parts[2] === "tree" && parts.length > 3) parsedRef = parts.slice(3).join("/");
  const chosen = (ref ?? "").trim() || parsedRef;
  return { owner, repo, ref: chosen || undefined };
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(502, "Could not reach GitHub - try again shortly");
  }
  if (response.status === 404) {
    throw new ApiError(404, "Repository, ref, or path not found on GitHub (is the repo public?)");
  }
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new ApiError(
      429,
      remaining === "0"
        ? "GitHub API rate limit reached - try again later or configure GITHUB_TOKEN"
        : "GitHub refused the request",
    );
  }
  if (!response.ok) throw new ApiError(502, `GitHub API error (${response.status})`);
  return (await response.json()) as T;
}

async function fetchRawFile(target: RepoTarget, commit: string, path: string): Promise<string> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  let response: Response;
  try {
    response = await fetch(`${RAW}/${target.owner}/${target.repo}/${commit}/${encoded}`, {
      headers: { "user-agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(502, `Could not download ${path} from GitHub`);
  }
  if (!response.ok) throw new ApiError(502, `GitHub returned ${response.status} for ${path}`);
  return response.text();
}

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
}

/** How many skills one submission may carry; larger repositories are narrowed
 * to a chosen subset of directories first. */
export const SKILLS_PER_SUBMISSION = MAX_SKILLS;

export interface RepoTree {
  target: RepoTarget;
  meta: RepoMetadata;
  ref: string;
  commit: string;
  blobs: TreeEntry[];
  /** Every skill directory discovered ("" is the repository root). */
  roots: string[];
}

/** Resolve the target to a commit and discover the skill directories, without
 * downloading any bundle files (3 GitHub API calls). */
export async function resolveRepoTree(target: RepoTarget): Promise<RepoTree> {
  const repoData = await gh<{
    description: string | null;
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string | null;
    license: { spdx_id?: string | null } | null;
    topics?: string[];
  }>(`/repos/${target.owner}/${target.repo}`);
  const ref = target.ref ?? repoData.default_branch;
  // The commits endpoint resolves a branch name, tag, or (abbreviated) SHA alike.
  const commitData = await gh<{ sha: string }>(
    `/repos/${target.owner}/${target.repo}/commits/${encodeURIComponent(ref)}`,
  );
  const commit = commitData.sha;
  const tree = await gh<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${target.owner}/${target.repo}/git/trees/${commit}?recursive=1`,
  );
  if (tree.truncated) {
    throw new ApiError(400, "The repository tree is too large for the marketplace to scan");
  }

  const blobs = tree.tree.filter((e) => e.type === "blob");
  const roots = blobs
    .filter((e) => e.path === "SKILL.md" || e.path.endsWith("/SKILL.md"))
    .map((e) => (e.path === "SKILL.md" ? "" : e.path.slice(0, -"/SKILL.md".length)))
    .sort((a, b) => a.length - b.length);
  if (!roots.length) {
    throw new ApiError(400, "No SKILL.md found anywhere in the repository at that ref");
  }

  return {
    target,
    meta: {
      url: `https://github.com/${target.owner}/${target.repo}`,
      owner: target.owner,
      repo: target.repo,
      description: repoData.description ?? "",
      defaultBranch: repoData.default_branch,
      stars: repoData.stargazers_count ?? 0,
      forks: repoData.forks_count ?? 0,
      openIssues: repoData.open_issues_count ?? 0,
      pushedAt: repoData.pushed_at,
      license:
        repoData.license?.spdx_id && repoData.license.spdx_id !== "NOASSERTION"
          ? repoData.license.spdx_id
          : null,
      topics: (repoData.topics ?? []).slice(0, 10),
    },
    ref,
    commit,
    blobs,
    roots,
  };
}

/** Download the bundle files for the tree's skills, pinned to its commit.
 * `dirs` narrows a large repository to the chosen skill directories. */
export async function snapshotFromTree(tree: RepoTree, dirs?: string[]): Promise<RepoSnapshot> {
  const { target, blobs, commit } = tree;
  let roots = tree.roots;
  if (dirs?.length) {
    const wanted = new Set(dirs);
    roots = roots.filter((r) => wanted.has(r));
    if (!roots.length) {
      throw new ApiError(400, "No matching skills found in the repository");
    }
  }
  if (roots.length > MAX_SKILLS) {
    throw new ApiError(
      400,
      `Select at most ${MAX_SKILLS} skills per submission (this selection holds ${roots.length})`,
    );
  }

  // A file belongs to the deepest skill directory that contains it, so a root
  // SKILL.md does not swallow nested skills. Ownership considers every
  // discovered directory, not only the chosen ones, so narrowing a selection
  // never pulls a nested skill's files into its parent.
  const ownerOf = (path: string): string | null => {
    let best: string | null = null;
    for (const root of tree.roots) {
      if (root === "" || path === root || path.startsWith(`${root}/`)) {
        if (best === null || root.length > best.length) best = root;
      }
    }
    return best;
  };

  const plans = new Map<string, { keep: TreeEntry[]; skipped: string[]; bytes: number }>();
  for (const root of roots) plans.set(root, { keep: [], skipped: [], bytes: 0 });
  for (const blob of blobs) {
    const root = ownerOf(blob.path);
    if (root === null) continue;
    const plan = plans.get(root);
    if (!plan) continue; // belongs to a skill outside the chosen subset
    const rel = root === "" ? blob.path : blob.path.slice(root.length + 1);
    if (JUNK_RE.test(blob.path) || rel.includes("..")) continue;
    if (BINARY_EXT_RE.test(rel)) {
      plan.skipped.push(`${rel} (binary)`);
      continue;
    }
    const size = blob.size ?? 0;
    if (size > MAX_FILE_BYTES) {
      plan.skipped.push(`${rel} (over ${Math.round(MAX_FILE_BYTES / 1024)} KB)`);
      continue;
    }
    if (plan.bytes + size > MAX_BUNDLE_BYTES) {
      plan.skipped.push(`${rel} (bundle over 2 MB)`);
      continue;
    }
    plan.bytes += size;
    plan.keep.push(blob);
  }

  // Download every kept file, pinned to the resolved commit.
  const jobs: { root: string; rel: string; path: string }[] = [];
  for (const [root, plan] of plans) {
    for (const blob of plan.keep) {
      jobs.push({
        root,
        rel: root === "" ? blob.path : blob.path.slice(root.length + 1),
        path: blob.path,
      });
    }
  }
  const contents = new Map<string, string>();
  for (let i = 0; i < jobs.length; i += RAW_CONCURRENCY) {
    const batch = jobs.slice(i, i + RAW_CONCURRENCY);
    const texts = await Promise.all(batch.map((j) => fetchRawFile(target, commit, j.path)));
    batch.forEach((j, k) => contents.set(j.path, texts[k]));
  }

  const skills: RepoSkill[] = [...plans.entries()].map(([root, plan]) => ({
    dir: root,
    files: plan.keep
      .map((blob) => ({
        path: root === "" ? blob.path : blob.path.slice(root.length + 1),
        content: contents.get(blob.path) ?? "",
      }))
      .filter((f) => {
        if (f.content.includes("\0")) {
          plan.skipped.push(`${f.path} (binary)`);
          return false;
        }
        return true;
      }),
    skipped: plan.skipped,
  }));

  return { meta: tree.meta, ref: tree.ref, commit: tree.commit, skills };
}

/** Resolve the target to a commit, discover skill directories, download files.
 * `dirs` narrows a large repository to the chosen skill directories. */
export async function fetchRepoSnapshot(
  target: RepoTarget,
  dirs?: string[],
): Promise<RepoSnapshot> {
  return snapshotFromTree(await resolveRepoTree(target), dirs);
}

/**
 * The version string a repository submission records: the manifest's own
 * version (spec `version:` or `metadata.version`), else the pinned tag, else
 * the short commit SHA.
 */
export function deriveVersion(
  manifest: { version?: unknown; metadata?: Record<string, unknown> } | undefined,
  snapshot: Pick<RepoSnapshot, "ref" | "commit" | "meta">,
): string {
  const declared = manifest?.version ?? manifest?.metadata?.version;
  if (declared) return String(declared);
  if (snapshot.ref !== snapshot.meta.defaultBranch && !SHA_RE.test(snapshot.ref)) {
    return snapshot.ref;
  }
  return snapshot.commit.slice(0, 7);
}

/** The provenance record stored on each version submitted from a repository. */
export function repoRecord(snapshot: RepoSnapshot, dir: string) {
  return {
    url: snapshot.meta.url,
    owner: snapshot.meta.owner,
    repo: snapshot.meta.repo,
    dir,
    ref: snapshot.ref,
    commit: snapshot.commit,
    stars: snapshot.meta.stars,
    forks: snapshot.meta.forks,
    openIssues: snapshot.meta.openIssues,
    pushedAt: snapshot.meta.pushedAt,
    license: snapshot.meta.license,
    description: snapshot.meta.description,
    topics: snapshot.meta.topics,
    fetchedAt: new Date().toISOString(),
  };
}

export type RepoRecord = ReturnType<typeof repoRecord>;
