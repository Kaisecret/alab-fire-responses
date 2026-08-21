import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ALAB Resident",
    short_name: "ALAB",
    description: "Resident fire reporting and emergency updates for ALAB.",
    start_url: "/resident/login",
    scope: "/resident/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b91c1c",
    icons: [
      { src: "/images/FAVICON.webp", sizes: "any", type: "image/webp", purpose: "any" },
      { src: "/images/resident-pwa-192.webp", sizes: "192x192", type: "image/webp", purpose: "any" },
      { src: "/images/resident-pwa-512.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
    ],
  };
}
