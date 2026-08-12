import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./secondary.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RIGYADH — 5,555 rigs. One field.",
  description:
    "Strike the pressure window, secure the reserve, or push your luck and MAX DRILL.",
  applicationName: "RIGYADH",
  openGraph: {
    title: "RIGYADH — 5,555 rigs. One field.",
    description: "Bank the reserve or MAX DRILL. How deep will you go?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RIGYADH — Field transmission 001",
    description: "5,555 rigs. One field. How deep will you drill?",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080b09",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
