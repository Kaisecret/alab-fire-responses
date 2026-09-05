import type { Metadata } from "next";

import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: "ALAB | Provincial Fire Response",
  description:
    "ALAB connects communities and the Bureau of Fire Protection through fast, coordinated emergency response across Antique.",
};

export default function Home() {
  return (
    <>
      <link rel="preload" as="image" href="/images/bg%20images.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/phone.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/BFPBACK.webp" type="image/webp" />
      <link rel="preload" as="image" href="/images/Logo.webp" type="image/webp" />
      <LandingPage />
    </>
  );
}
