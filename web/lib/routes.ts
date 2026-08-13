// Canonical catalog URLs. Every published skill is addressed under the
// provider that owns it and the source it comes from, so the path itself
// states the ownership (as on skills.sh: /<owner>/<repo>/<skill>):
//
//   /marketplace/<provider>
//   /marketplace/<provider>/<source>
//   /marketplace/<provider>/<source>/<skill>
//   /marketplace/<provider>/<source>/<skill>/review
//
// Bare /skill/<slug> remains as a redirect, because a skill slug is all an
// agent prompt can name.

export const providerPath = (provider: string) => `/marketplace/${provider}`;

// A source is one GitHub repository (addressed by repo name); skills without
// a repository fall under the "bundles" pseudo-source.
export const sourcePath = (provider: string, source: string) =>
  `/marketplace/${provider}/${source}`;

export const skillPath = (provider: string, source: string, slug: string) =>
  `/marketplace/${provider}/${source}/${slug}`;

export const skillReviewPath = (provider: string, source: string, slug: string) =>
  `${skillPath(provider, source, slug)}/review`;

/** Provider-agnostic entry point; redirects to the canonical path. */
export const skillEntryPath = (slug: string) => `/skill/${slug}`;
