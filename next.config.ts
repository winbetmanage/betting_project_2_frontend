import type { NextConfig } from "next";

const API_BACKEND_URL = (process.env.API_BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;