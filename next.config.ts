import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not fail production builds on ESLint errors (we'll fix lints incrementally)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
