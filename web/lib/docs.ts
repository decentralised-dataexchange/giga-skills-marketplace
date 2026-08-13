// The knowledgebase table of contents. Order matters: the sidebar renders the
// sections top to bottom, and the previous/next pager walks the flat list.

export interface DocPage {
  href: string;
  title: string;
}

export interface DocSection {
  label: string;
  pages: DocPage[];
}

export const DOCS: DocSection[] = [
  {
    label: "Getting started",
    pages: [
      { href: "/knowledgebase", title: "Introduction" },
      { href: "/knowledgebase/how-it-works", title: "How it works" },
    ],
  },
  {
    label: "Concepts",
    pages: [
      { href: "/knowledgebase/providers", title: "Providers" },
      { href: "/knowledgebase/skills", title: "Skills" },
      { href: "/knowledgebase/sources", title: "Source repositories" },
    ],
  },
  {
    label: "For providers",
    pages: [
      { href: "/knowledgebase/onboarding", title: "Onboard your organisation" },
      { href: "/knowledgebase/authoring", title: "Author a skill" },
      { href: "/knowledgebase/repository", title: "Build a skills repository" },
      { href: "/knowledgebase/publishing", title: "Publish and update skills" },
      { href: "/knowledgebase/review", title: "The review process" },
    ],
  },
  {
    label: "For consumers",
    pages: [{ href: "/knowledgebase/installing", title: "Install skills" }],
  },
  {
    label: "Reference",
    pages: [
      { href: "/knowledgebase/checks", title: "Automated checks" },
      { href: "/knowledgebase/roles", title: "Roles and statuses" },
    ],
  },
];

export const DOC_ORDER: DocPage[] = DOCS.flatMap((s) => s.pages);
