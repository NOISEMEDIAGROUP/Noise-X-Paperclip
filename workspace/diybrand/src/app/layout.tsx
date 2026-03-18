import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "diybrand.app — Build your brand in minutes, not months",
  description:
    "Answer a short questionnaire and let AI create your complete brand identity — logo, colors, fonts, and guidelines — ready to use. No design skills needed.",
  openGraph: {
    title: "diybrand.app — Build your brand in minutes, not months",
    description:
      "Answer a short questionnaire and let AI create your complete brand identity — logo, colors, fonts, and guidelines — ready to use.",
    url: "https://diybrand.app",
    siteName: "diybrand.app",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "diybrand.app — Build your brand in minutes, not months",
    description:
      "Answer a short questionnaire and let AI create your complete brand identity — logo, colors, fonts, and guidelines — ready to use.",
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
        "Answer a short questionnaire and let AI create your complete brand identity — logo, colors, fonts, and guidelines — ready to use.",
    },
    {
      "@type": "Organization",
      name: "diybrand.app",
      url: "https://diybrand.app",
      description:
        "AI-powered brand identity generator. Build your brand in minutes, not months.",
    },
    {
      "@type": "SoftwareApplication",
      name: "diybrand.app",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description:
        "AI-powered brand kit generator — logo, colors, fonts, and guidelines.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free during early access",
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
