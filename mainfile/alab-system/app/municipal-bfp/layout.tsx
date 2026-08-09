import type { Metadata } from "next";
import { MunicipalBfpLayout } from "../_components/municipal-bfp-layout";

export const metadata: Metadata = {
  title: "Municipal BFP Dashboard - ALAB",
  description:
    "Municipal BFP incident verification, resource management, and response coordination dashboard.",
};

export default function MunicipalBfpRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MunicipalBfpLayout>{children}</MunicipalBfpLayout>;
}
