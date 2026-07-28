import type { Metadata } from "next";

import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: "ALAB | Provincial Fire Response",
  description:
    "ALAB connects communities and the Bureau of Fire Protection through fast, coordinated emergency response across Antique.",
};

export default function Home() {
  return <LandingPage />;
}
