import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GeoQuests - Get a reason to explore the world",
  description: "Create and complete location-based photo quests. Share meaningful places, discover hidden gems, or get real-time crowd-sourced information.",
  keywords: ["quests", "location", "photo", "explore", "travel", "scavenger hunt"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
