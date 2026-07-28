import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["169.254.6.6"],
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
};

export default nextConfig;
