import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ALAB | Provincial Fire Response",
    template: "%s | ALAB",
  },
  description:
    "ALAB connects communities and the Bureau of Fire Protection through fast, coordinated emergency response across Antique.",
  icons: {
    icon: "/images/FAVICON.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
