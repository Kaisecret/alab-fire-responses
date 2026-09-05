import type { Metadata } from "next";

import { SignupPage } from "../../_components/signup-page";

export const metadata: Metadata = {
  title: "Resident Sign Up - ALAB",
  description:
    "Create your ALAB resident account to report fire incidents and stay connected with emergency responders in Antique.",
};

export default function ResidentSignupRoute() {
  return (
    <>
      <link rel="preload" as="image" href="/images/for%20sign%20up.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/Logo.webp" type="image/webp" />
      <SignupPage fontVariableClassName="" />
    </>
  );
}
