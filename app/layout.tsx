import type React from "react";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
