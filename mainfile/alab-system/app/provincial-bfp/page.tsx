import type { Metadata } from "next";

import { ProvincialBfpModule } from "../_components/provincial-bfp-module";

export const metadata: Metadata = {
  title: "Provincial BFP Module - ALAB",
  description:
    "Provincial BFP monitoring, analytics, resource, and coordination module for ALAB.",
};

export default function ProvincialBfpRoute() {
  return <ProvincialBfpModule />;
}
