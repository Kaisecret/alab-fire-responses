import type { Metadata } from "next";

import { LoginPage } from "../../_components/login-page";
import { ResidentInstallPrompt } from "../../_components/resident-pwa";

export const metadata: Metadata = {
  title: "Resident Login - ALAB",
  manifest: "/resident-manifest.webmanifest",
};

export default function ResidentLoginRoute() {
  return (
    <>
      <link rel="preload" as="image" href="/images/side%20pic%20for%20login.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/Logo.webp" type="image/webp" />
      <LoginPage fontVariableClassName="" />
      <ResidentInstallPrompt />
    </>
  );
}
