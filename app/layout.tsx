import type React from "react";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToasterProvider } from "@/components/ui/toaster-provider";
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
    default: "Splitwise for YNAB - Automate your shared expenses",
    template: "%s | Splitwise for YNAB",
  },
  description:
    "Stop manual data entry! Flag transactions in YNAB and automatically sync them with Splitwise while maintaining perfect category tracking. Built for YNAB users and coaches.",
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
    title: "Splitwise for YNAB - Automate Shared Expense Tracking",
    description:
      "Stop manual data entry! Flag transactions in YNAB and automatically sync them with Splitwise while maintaining perfect category tracking.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Splitwise for YNAB - Automate Shared Expense Tracking",
    description:
      "Stop manual data entry! Flag transactions in YNAB and automatically sync them with Splitwise while maintaining perfect category tracking.",
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
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
      "Automate shared expense tracking by syncing YNAB transactions with Splitwise while maintaining category insights.",
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
        <SessionProvider>
          {children}
          <ToasterProvider />
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
