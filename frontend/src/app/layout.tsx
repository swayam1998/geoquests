import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoquests.io";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "GeoQuests - Get a reason to explore the world",
  description: "Create and complete location-based photo quests. Share meaningful places, discover hidden gems, or get real-time crowd-sourced information.",
  keywords: ["quests", "location", "photo", "explore", "travel", "scavenger hunt"],
  openGraph: {
    title: "GeoQuests - Get a reason to explore the world",
    description: "Create and complete location-based photo quests. Share meaningful places, discover hidden gems.",
    siteName: "GeoQuests",
    images: [{ url: "/images/hero-bg-web.png", width: 1200, height: 630, alt: "GeoQuests" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoQuests - Get a reason to explore the world",
    description: "Create and complete location-based photo quests.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <TooltipProvider delay={300}>
              {children}
              <Footer />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
