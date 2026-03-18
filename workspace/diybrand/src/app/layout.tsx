import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["700"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "diybrand.app — AI brand kit in minutes. One-time payment.",
  description:
    "Build a complete brand identity in minutes: logo, colors, fonts, guidelines. AI-powered, no design skills needed. Own everything. One-time payment, not monthly.",
  openGraph: {
    title: "DIYBrand.app — One-Time AI Brand Kit (No Subscriptions, Own Everything)",
    description:
      "Answer a questionnaire. Get a professional brand kit instantly: logo, palette, typography, guidelines. Download and own all files. One-time payment — no monthly fees.",
    url: "https://diybrand.app",
    siteName: "diybrand.app",
    type: "website",
    images: [
      {
        url: "https://diybrand.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "DIYBrand.app — AI-powered brand kit builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DIYBrand.app — One-Time AI Brand Kit (No Subscriptions)",
    description:
      "Build a complete brand identity in minutes: logo, colors, fonts, guidelines. AI-powered, no design skills needed. Own everything. One-time payment, not monthly.",
  },
  metadataBase: new URL("https://diybrand.app"),
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "diybrand.app",
      url: "https://diybrand.app",
      description:
        "Build a complete brand identity in minutes: logo, colors, fonts, guidelines. AI-powered, no design skills needed. Own everything.",
    },
    {
      "@type": "Organization",
      name: "diybrand.app",
      url: "https://diybrand.app",
      description:
        "AI-powered brand identity generator. Professional brand kit in minutes, not months.",
    },
    {
      "@type": "SoftwareApplication",
      name: "diybrand.app",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description:
        "AI-powered brand kit generator — logo, colors, fonts, and guidelines. One-time purchase.",
      offers: {
        "@type": "Offer",
        price: "19",
        priceCurrency: "USD",
        description: "One-time purchase. No subscriptions. All files owned by you.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
