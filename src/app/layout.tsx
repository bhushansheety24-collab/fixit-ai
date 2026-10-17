import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * Fonts are defined as a CSS stack in globals.css (`--font-sans`) rather than
 * `next/font/google`, so `next build` never needs network access. This keeps
 * the whole app buildable and runnable offline.
 */
export const metadata: Metadata = {
  title: "FixIt AI — Intelligent Repair & Reuse Assistant",
  description:
    "Identify damage, compare repair vs replacement, find repair professionals, and track your environmental impact.",
  keywords: ["repair", "ai", "sustainability", "troubleshooting", "damage analysis"],
  authors: [{ name: "FixIt AI" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
