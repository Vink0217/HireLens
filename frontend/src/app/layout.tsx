import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  axes: ["opsz", "SOFT", "WONK"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "HireLens | AI-Powered Signal, Not Noise",
  description: "Screen resumes securely with configurable extraction and evidence-based AI scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${outfit.variable}`}>
      <body className="antialiased min-h-screen selection:bg-brand-accent selection:text-black">
        {children}
      </body>
    </html>
  );
}
