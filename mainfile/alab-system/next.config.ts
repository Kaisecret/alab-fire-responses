import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["169.254.6.6"],
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
