import type { Metadata } from "next";

import { LoginPage } from "../../_components/login-page";

export const metadata: Metadata = {
  title: "Resident Login - ALAB",
};

export default function ResidentLoginRoute() {
  return <LoginPage fontVariableClassName="" />;
}
