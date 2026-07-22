// Surfaces that are built and kept working, but not currently exposed.
//
// A disabled surface is hidden everywhere it is reachable: its navigation
// entries, the links pointing at it, and the route itself (which answers 404 so
// a stray bookmark does not advertise it). Nothing behind it is removed - the
// pages, their API routes and the console screens that feed them are untouched,
// so re-enabling one is a single edit here.
export const FEATURES = {
  /** Public gallery of developer applications at /showcase. */
  showcase: false,
  /** Integration Assistant (AI app builder) at /builder, and its API-key settings. */
  assistant: false,
};
