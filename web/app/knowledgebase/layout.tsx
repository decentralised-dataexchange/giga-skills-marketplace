import { DocsBreadcrumb, DocsNav, DocsNavMobile, DocsPager, DocsToc } from "@/components/docs-nav";

// Documentation shell in the docs.igrant.io (Docusaurus) layout: a full-height
// sidebar rail flush left, a full-width article column, and an "On this page"
// table of contents on the right, with a previous/next pager under every page.
export default function KnowledgebaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      <aside className="hidden w-[280px] shrink-0 border-r border-panel-border lg:block">
        <div className="sticky top-[104px] max-h-[calc(100vh-120px)] overflow-y-auto px-4 pb-10 pt-6">
          <DocsNav />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 gap-10 px-5 py-8 sm:px-8 lg:px-10">
        <div className="min-w-0 flex-1">
          <div className="mb-6 lg:hidden">
            <DocsNavMobile />
          </div>
          <DocsBreadcrumb />
          <article className="docs-prose">{children}</article>
          <DocsPager />
        </div>
        <DocsToc />
      </div>
    </div>
  );
}
