import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Giga typefaces (provided font files): Manrope for headings, Open Sans for body.
const manrope = localFont({
  variable: "--font-manrope",
  display: "swap",
  src: [
    { path: "./fonts/Manrope-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Manrope-Medium.ttf", weight: "500", style: "normal" },
  ],
});
const openSans = localFont({
  variable: "--font-open-sans",
  display: "swap",
  src: [{ path: "./fonts/manrope-provided.woff2", weight: "300 800", style: "normal" }],
});
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb-mono" });

export const metadata: Metadata = {
  title: "Giga Skills Marketplace",
  description:
    "Provider-published, agent-agnostic skill files for the education wallet building block, part of the ITU / UNICEF Giga initiative. Reviewed app-store style and ready to install into any AI coding agent.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${openSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <TooltipProvider delay={150}>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
