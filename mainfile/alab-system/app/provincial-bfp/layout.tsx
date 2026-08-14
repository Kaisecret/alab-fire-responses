import type { Metadata } from "next";
import { ProvincialBfpLayout } from "../_components/provincial-bfp-layout";

export const metadata: Metadata = {
  title: "Provincial BFP Command Center - ALAB",
  description:
    "Province-wide monitoring, incident command, municipal status, and assistance coordination for Antique BFP.",
};

export default function ProvincialBfpRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProvincialBfpLayout>{children}</ProvincialBfpLayout>;
}
