import type { Metadata } from "next";
import { MunicipalBfpLogin } from "../../_components/municipal-bfp-login";

export const metadata: Metadata = {
  title: "Municipal BFP Station Portal - Login",
};

export default function MunicipalBfpLoginPage() {
  return (
    <>
      <link rel="preload" as="image" href="/images/formunicipallogin.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/WHITE%20LOGO.webp" type="image/webp" />
      <MunicipalBfpLogin />
    </>
  );
}
