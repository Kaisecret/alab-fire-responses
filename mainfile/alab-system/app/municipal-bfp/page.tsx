import type { Metadata } from "next";

import { MunicipalBfpModule } from "../_components/municipal-bfp-module";

export const metadata: Metadata = {
  title: "Municipal BFP Module - ALAB",
  description:
    "Municipal BFP incident verification, resource management, and response coordination module.",
};

export default function MunicipalBfpRoute() {
  return <MunicipalBfpModule />;
}
