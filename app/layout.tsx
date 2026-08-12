import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./secondary.css";
import "./credits.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://blindspotlab.xyz/#mojeeb-titilayo",
      name: "Mojeeb Titilayo",
      url: "https://github.com/mojeebdev",
      sameAs: ["https://github.com/mojeebdev"],
    },
    {
      "@type": "Organization",
      "@id": "https://blindspotlab.xyz/#organization",
      name: "BlindspotLab",
      url: "https://blindspotlab.xyz",
      founder: { "@id": "https://blindspotlab.xyz/#mojeeb-titilayo" },
    },
    {
      "@type": "VideoGame",
      "@id": "#rigyadh",
      name: "RIGYADH",
      description:
        "A competitive push-your-luck drilling game for The Saudis community.",
      genre: ["Arcade", "Strategy", "Community Game"],
      playMode: "SinglePlayer",
      isAccessibleForFree: true,
      creator: { "@id": "https://blindspotlab.xyz/#mojeeb-titilayo" },
      publisher: { "@id": "https://blindspotlab.xyz/#organization" },
    },
  ],
};

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
      <body className={`${sans.variable} ${mono.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
