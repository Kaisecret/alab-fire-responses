import type { Metadata } from "next";

import { ResidentModule } from "../_components/resident-module";

export const metadata: Metadata = {
  title: "Resident Module - ALAB",
  description:
    "Resident fire reporting and report-status module for ALAB Provincial Fire Response.",
};

export default function ResidentRoute() {
  return <ResidentModule />;
}
