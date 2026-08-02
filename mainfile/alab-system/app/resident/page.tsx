import type { Metadata } from "next";

import { ResidentHomePage } from "../_components/resident-home-page";

export const metadata: Metadata = {
  title: "Resident Home - ALAB",
  description:
    "Resident fire reporting and report-status module for ALAB Provincial Fire Response.",
};

export default function ResidentRoute() {
  return <ResidentHomePage />;
}
