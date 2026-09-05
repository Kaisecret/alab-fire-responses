import type { Metadata } from "next";
import { ProvincialBfpLogin } from "../../_components/provincial-bfp-login";

export const metadata: Metadata = {
  title: "Provincial BFP Command Portal - Login",
};

export default function ProvincialBfpLoginPage() {
  return (
    <>
      <link rel="preload" as="image" href="/images/FOR%20PROVOCIAL%20SIDE.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/WHITE%20LOGO.webp" type="image/webp" />
      <ProvincialBfpLogin />
    </>
  );
}
