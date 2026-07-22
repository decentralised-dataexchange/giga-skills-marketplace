// Canonical catalog URLs. Every published item is addressed under the provider
// that owns it, so the path itself states the ownership:
//
//   /providers/<provider>
//   /providers/<provider>/skills/<skill>
//   /providers/<provider>/skills/<skill>/review
//   /providers/<provider>/usecases/<usecase>
//
// Bare /skill/<slug> and /usecase/<slug> remain as redirects, because skill
// slugs are all a manifest's `uses_skills` list and a showcase entry can name.

export const providerPath = (provider: string) => `/providers/${provider}`;

export const skillPath = (provider: string, slug: string) =>
  `/providers/${provider}/skills/${slug}`;

export const skillReviewPath = (provider: string, slug: string) =>
  `${skillPath(provider, slug)}/review`;

export const usecasePath = (provider: string, slug: string) =>
  `/providers/${provider}/usecases/${slug}`;

export const usecaseReviewPath = (provider: string, slug: string) =>
  `${usecasePath(provider, slug)}/review`;

/** Provider-agnostic entry point; redirects to the canonical path. */
export const skillEntryPath = (slug: string) => `/skill/${slug}`;

/** Provider-agnostic entry point; redirects to the canonical path. */
export const usecaseEntryPath = (slug: string) => `/usecase/${slug}`;
