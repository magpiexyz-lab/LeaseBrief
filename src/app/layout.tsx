import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from "@/components/nav-bar";
import { RetainTracker } from "@/components/RetainTracker";
import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LeaseBrief — Lease abstracts in 90 seconds",
  description:
    "Drag-and-drop AI that turns commercial real estate lease PDFs into 30-field structured abstracts in 90 seconds, with confidence scoring and Yardi/MRI/AppFolio export. For mid-market CRE brokers.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000",
  ),
  openGraph: {
    title: "LeaseBrief — Lease abstracts in 90 seconds",
    description:
      "AI-powered commercial lease abstraction for mid-market CRE brokers. 30 fields, confidence scored, $399/month.",
    type: "website",
    siteName: "LeaseBrief",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeaseBrief — Lease abstracts in 90 seconds",
    description:
      "AI-powered commercial lease abstraction for mid-market CRE brokers.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LeaseBrief",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description:
    "AI tool that turns commercial real estate lease PDFs into structured 30-field abstracts in 90 seconds.",
  offers: {
    "@type": "Offer",
    price: "399",
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "399",
      priceCurrency: "USD",
      unitText: "month",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="font-body antialiased">
        {/* Paid-attribution capture — synchronously stashes gclid/utm_* into
            sessionStorage BEFORE React hydrates so analytics.ts can register
            them as PostHog super-properties even when Next.js router
            replaceState() strips the query string during client navigation.
            beforeInteractive hoists into <head> regardless of JSX placement.
            See framework/nextjs.md → "Paid-attribution capture". */}
        <Script
          id="capture-paid-attribution"
          strategy="beforeInteractive"
        >
          {`
            try {
              var p = new URLSearchParams(window.location.search);
              var g = p.get('gclid');
              if (g && g.length > 40 && /^(Cj|EAI|CIa)/.test(g)) {
                sessionStorage.setItem('__ph_gclid', g);
              }
              ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
                var v = p.get(k);
                if (v) sessionStorage.setItem('__ph_' + k, v);
              });
            } catch (e) {
              // sessionStorage unavailable — skip silently.
            }
          `}
        </Script>
        <Script
          id="ld-webapplication"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(jsonLd)}
        </Script>
        {/* Skip-nav anchor (WCAG 2.4.1) — appears BEFORE the first nav block.
            Targets <main id="main-content" tabIndex={-1}> below; without
            tabIndex={-1} the link's target is not programmatically focusable
            and Tab cycles back to the link. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded"
        >
          Skip to main content
        </a>
        <TooltipProvider>
          <NavBar />
          {/* Skip-link target — a generic <div> wrapper, NOT a <main>. Each
              route owns its own <main className=...> for the landmark; this
              wrapper exists purely to give the skip-nav anchor a programmatically
              focusable target without duplicating the landmark-main role. */}
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <RetainTracker />
        </TooltipProvider>
      </body>
    </html>
  );
}
