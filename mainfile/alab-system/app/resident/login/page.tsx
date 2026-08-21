import type { Metadata } from "next";

import { LoginPage } from "../../_components/login-page";
import { ResidentInstallPrompt } from "../../_components/resident-pwa";

export const metadata: Metadata = {
  title: "Resident Login - ALAB",
  manifest: "/resident/manifest.webmanifest",
};

export default function ResidentLoginRoute() {
  return <><LoginPage fontVariableClassName="" /><ResidentInstallPrompt /></>;
}
