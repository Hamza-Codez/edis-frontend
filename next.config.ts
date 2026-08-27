import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");
if (process.env.NODE_ENV === "production" && !apiOrigin) {
  throw new Error("API_ORIGIN is required for production builds.");
}
if (process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL overrides the proxy. Remove it.");
}
if (!apiOrigin) {
  // Without it the rewrite is not registered at all, so /api/* falls through to
  // the app and returns the HTML shell. The symptom is "HTTP error! status: 404"
  // on login, which points nowhere near the cause — so say the cause here.
  console.warn(
    "\n[EDIS] API_ORIGIN is not set, so /api/* is NOT proxied to the backend.\n" +
      "       Every API call will return this app's HTML and fail as a 404.\n" +
      "       Set API_ORIGIN=http://localhost:8000 in .env.local and restart\n" +
      "       the dev server — next.config.ts is read at startup, not on reload.\n"
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return apiOrigin ? [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }] : [];
  }
};

export default nextConfig;
