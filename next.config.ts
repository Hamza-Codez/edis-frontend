import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");
if (process.env.NODE_ENV === "production" && !apiOrigin) {
  throw new Error("API_ORIGIN is required for production builds.");
}
if (process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL overrides the proxy. Remove it.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return apiOrigin ? [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }] : [];
  }
};

export default nextConfig;
