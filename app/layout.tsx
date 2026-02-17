import type React from "react";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";

import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.splitwiseforynab.com",
  ),
  title: {
    default: "Splitwise for YNAB — Track Your Share, Not the Full Bill",
    template: "%s | Splitwise for YNAB",
  },
  description:
    "Track what you spent, not what you fronted. Splitwise for YNAB adjusts your categories so shared expenses don't break your budget.",
  keywords: [
    "YNAB",
    "Splitwise",
    "expense sharing",
    "budget tracking",
    "shared expenses",
    "You Need A Budget",
    "expense automation",
    "couples budgeting",
    "roommate expenses",
    "bill splitting",
    "financial automation",
  ],
  authors: [{ name: "Splitwise for YNAB" }],
  creator: "Splitwise for YNAB",
  publisher: "Splitwise for YNAB",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Splitwise for YNAB",
    title: "Splitwise for YNAB — Track Your Share, Not the Full Bill",
    description:
      "Track what you spent, not what you fronted. Splitwise for YNAB adjusts your categories so shared expenses don't break your budget.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Splitwise for YNAB — Track Your Share, Not the Full Bill",
    description:
      "Track what you spent, not what you fronted. Splitwise for YNAB adjusts your categories so shared expenses don't break your budget.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Splitwise for YNAB",
    description:
      "Sync YNAB with Splitwise so your categories reflect what you actually spent, not what you fronted for shared expenses.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.splitwiseforynab.com",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Splitwise for YNAB",
    },
    keywords:
      "YNAB, Splitwise, expense sharing, budget tracking, shared expenses, You Need A Budget, expense automation",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${instrumentSerif.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
