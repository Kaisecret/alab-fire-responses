import type { NextConfig } from "next";

// Sharp loads libvips through its native addon. Static tracing can include the
// addon but omit its shared libraries, crashing evidence routes on Linux before
// their handlers run. Include the installed platform packages in those bundles.
const evidenceRuntimeFiles = ["node_modules/sharp/**/*", "node_modules/@img/sharp-*/**/*"];
const faceRuntimeFiles = [
  ...evidenceRuntimeFiles,
  "models/resident-face/*.onnx",
  "models/resident-face/manifest.json",
  "models/resident-face/LICENSE*",
  "node_modules/onnxruntime-node/dist/**/*",
  "node_modules/onnxruntime-node/package.json",
  "node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node",
  "node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/auth/register/face-check": faceRuntimeFiles,
    "/api/auth/register": evidenceRuntimeFiles,
    "/api/resident/application-status/resubmit": evidenceRuntimeFiles,
    "/api/municipal-bfp/resident-applications": evidenceRuntimeFiles,
    "/api/municipal-bfp/resident-applications/**": evidenceRuntimeFiles,
    "/api/provincial-bfp/resident-applications": evidenceRuntimeFiles,
    "/api/provincial-bfp/resident-applications/**": evidenceRuntimeFiles,
    // ID checks read brightness, and sent photos are watermarked, with sharp.
    "/api/auth/register/id-check": evidenceRuntimeFiles,
    "/api/resident/fire-reports": evidenceRuntimeFiles,
    "/api/mobile-bfp/backup-requests": evidenceRuntimeFiles,
    "/api/resident/profile/photo": evidenceRuntimeFiles,
  },
  // Keep Vercel's Linux CPU function within its uncompressed bundle limit.
  outputFileTracingExcludes: {
    "/api/auth/register/face-check": [
      "node_modules/onnxruntime-node/bin/napi-v6/darwin/**/*",
      "node_modules/onnxruntime-node/bin/napi-v6/win32/**/*",
      "node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**/*",
      "node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_cuda*",
      "node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_tensorrt*",
    ],
  },
  allowedDevOrigins: ["169.254.6.6"],
  // sharp loads a platform-specific native binary, so it must stay external
  // and be traced from node_modules rather than bundled. Declaring it here
  // makes that deliberate instead of relying on implicit externalisation.
  serverExternalPackages: ["sharp", "onnxruntime-node"],
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        // Installed mobile apps still use the original API origin. Redirect
        // website links without sending their authenticated API calls away.
        source: "/:path((?!api/|api$|_next/).*)",
        has: [{ type: "host", value: "alab-fire-responses-bynr.vercel.app" }],
        destination: "https://www.alabfireresponse.dev/:path",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // These upstream bytes are pinned and checksum-verified. Cache them
      // across camera visits; the ALAB worker and manifest stay revalidated.
      ...["vision_bundle.js", "face_landmarker.task", "wasm/:file"].map((file) => ({
        source: `/models/selfie-guidance/mediapipe-1.1.1-face-landmarker-1/${file}`,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      })),
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
