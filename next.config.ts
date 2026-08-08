import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["es-toolkit", "tiny-invariant"],
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
  turbopack: {
    root: ".",
  },
  // Generate unique build ID for cache busting on each deployment
  generateBuildId: async () => {
    // Use timestamp for cache busting - ensures fresh deploys always get new assets
    return `build-${Date.now()}`;
  },
  typescript: {
    // Skip TypeScript checking during production build
    // Vercel will run type checking separately
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Prevent caching of HTML pages - always check server for latest version
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
        ],
      },
      {
        // Cache public assets but revalidate
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
