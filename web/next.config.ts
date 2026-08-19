import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second dev instance (e.g. an e2e run against a scratch database) needs
  // its own build directory; Next refuses two servers sharing one.
  distDir: process.env.NEXT_DIST_DIR || undefined,
};

export default nextConfig;
