import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
// Geist Sans (vercel.com/font), self-hosted via the official package.
import { GeistSans } from "geist/font/sans";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { AppShell } from "@/components/app-shell";
import { ToastHost } from "@/components/toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Inter, self hosted (the iGrant.io site family). Two files rather than one
// @font-face with unicode-range: next/font cannot express per-subset ranges,
// so the browser falls through to the ext family only for glyphs latin lacks.
const interLatin = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter-latin",
});
const interLatinExt = localFont({
  src: "./fonts/inter-latin-ext.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-inter-latin-ext",
});
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb-mono" });

const TITLE = "Giga Skills Marketplace";
const DESCRIPTION =
  "Provider-published, agent-agnostic skill files for the education wallet building block, part of the ITU / UNICEF Giga initiative. Reviewed app-store style and ready to install into any AI coding agent.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://giga-staging.igrant.io"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    url: "/",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${interLatin.variable} ${interLatinExt.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {/* Server-renders the MUI icon styles, so icons never flash unsized. */}
        <AppRouterCacheProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <AppShell>{children}</AppShell>
          <ToastHost />
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
