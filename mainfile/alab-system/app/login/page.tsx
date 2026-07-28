import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { LoginPage } from "../_components/login-page";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Login - ALAB Provincial Fire Response",
};

export default function LoginRoute() {
  return <LoginPage fontVariableClassName={plusJakartaSans.variable} />;
}
