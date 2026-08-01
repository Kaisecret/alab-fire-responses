import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { SignupPage } from "../../_components/signup-page";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Resident Sign Up - ALAB",
  description:
    "Create your ALAB resident account to report fire incidents and stay connected with emergency responders in Antique.",
};

export default function ResidentSignupRoute() {
  return <SignupPage fontVariableClassName={plusJakartaSans.variable} />;
}
