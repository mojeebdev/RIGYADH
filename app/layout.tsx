import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./secondary.css";
import "./credits.css";
import "./profile.css";
import "./content.css";

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
      "@type": "WebSite",
      "@id": "https://rigyadh.buzz/#website",
      name: "RIGYADH",
      url: "https://rigyadh.buzz",
      description: "An independent competitive drilling game with open practice and 5,555 ranked Operator identities.",
      creator: { "@id": "https://blindspotlab.xyz/#mojeeb-titilayo" },
      publisher: { "@id": "https://blindspotlab.xyz/#organization" },
    },
    {
      "@type": "VideoGame",
      "@id": "https://rigyadh.buzz/#game",
      name: "RIGYADH",
      url: "https://rigyadh.buzz",
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
  metadataBase: new URL("https://rigyadh.buzz"),
  title: { default: "RIGYADH — 5,555 rigs. One field.", template: "%s | RIGYADH" },
  description:
    "Strike the pressure window, secure the reserve, or push your luck and MAX DRILL.",
  applicationName: "RIGYADH",
  authors: [{ name: "Mojeeb Titilayo", url: "https://github.com/mojeebdev" }],
  creator: "Mojeeb Titilayo",
  publisher: "BlindspotLab",
  category: "game",
  robots: { index: true, follow: true },
  openGraph: {
    title: "RIGYADH — 5,555 rigs. One field.",
    description: "Bank the reserve or MAX DRILL. How deep will you go?",
    type: "website",
    url: "/",
    siteName: "RIGYADH",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "RIGYADH — 5,555 rigs. One field." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RIGYADH — Field transmission 001",
    description: "5,555 rigs. One field. How deep will you drill?",
    images: ["/opengraph-image"],
  },
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080b09",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
