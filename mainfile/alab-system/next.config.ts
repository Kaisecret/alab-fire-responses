import type { NextConfig } from "next";

// Sharp loads libvips through its native addon. Static tracing can include the
// addon but omit its shared libraries, crashing evidence routes on Linux before
// their handlers run. Include the installed platform packages in those bundles.
const evidenceRuntimeFiles = ["node_modules/sharp/**/*", "node_modules/@img/sharp-*/**/*"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/auth/register": evidenceRuntimeFiles,
    "/api/resident/application-status/resubmit": evidenceRuntimeFiles,
    "/api/municipal-bfp/resident-applications": evidenceRuntimeFiles,
    "/api/municipal-bfp/resident-applications/**": evidenceRuntimeFiles,
    "/api/provincial-bfp/resident-applications": evidenceRuntimeFiles,
    "/api/provincial-bfp/resident-applications/**": evidenceRuntimeFiles,
  },
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
