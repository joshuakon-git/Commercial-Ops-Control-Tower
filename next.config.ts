import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.framer.website https://framer.website https://framer.app https://*.framerusercontent.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;