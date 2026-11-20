import type { Metadata } from "next";

import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: { absolute: "ALAB Fire Response | Fire Reporting in Antique" },
  description:
    "ALAB Fire Response connects residents and BFP personnel in Antique, Philippines, through fire reporting, GIS mapping, and inter-municipal response coordination.",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "/",
    siteName: "ALAB Fire Response",
    title: "ALAB Fire Response | Fire Reporting in Antique",
    description:
      "Fire reporting, GIS mapping, and inter-municipal response coordination for residents and BFP personnel in Antique, Philippines.",
    images: [{ url: "/images/bg%20images.webp", alt: "ALAB Fire Response in Antique" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ALAB Fire Response in Antique",
    description: "Fire reporting and response coordination in Antique, Philippines.",
    images: ["/images/bg%20images.webp"],
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ALAB Fire Response",
            alternateName: "ALAB",
            url: "https://www.alabfireresponse.dev/",
            description: "GIS-based fire reporting and response coordination in Antique, Philippines.",
            inLanguage: "en-PH",
          }),
        }}
      />
      <link rel="preload" as="image" href="/images/bg%20images.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/phone-app.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/BFPBACK.webp" type="image/webp" />
      <link rel="preload" as="image" href="/images/Logo.webp" type="image/webp" />
      <LandingPage />
    </>
  );
}
