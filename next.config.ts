import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Allow production builds to successfully complete even if
    // there are ESLint errors. Useful for CI/CD like Railway.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
