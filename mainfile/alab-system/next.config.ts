import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["169.254.6.6"],
  // sharp loads a platform-specific native binary, so it must stay external
  // and be traced from node_modules rather than bundled. Declaring it here
  // makes that deliberate instead of relying on implicit externalisation.
  serverExternalPackages: ["sharp"],
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
