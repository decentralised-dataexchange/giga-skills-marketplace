import type { Metadata } from "next";

import { ShowcaseGuide } from "@/components/showcase/showcase-guide";

import "./showcase.css";

const TITLE = "National Learner Registry & Education Wallet Showcase";
const DESCRIPTION =
  "ITU/Giga education use case showcase: learner registration, credential issuance, wallet storage and third-party verification.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "en_GB",
  },
};

/**
 * The showcase segment: every /showcase page gets the floating demo guide.
 * The landing and audit pages keep the marketplace chrome; the portal
 * subtrees render bare and bring their own branded shells (see AppShell).
 */
export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ShowcaseGuide />
    </>
  );
}
