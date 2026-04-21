import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages doesn't need "export" mode
  // The functions directory handles server-side API
};

export default nextConfig;
