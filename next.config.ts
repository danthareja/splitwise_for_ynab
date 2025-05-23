import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "splitwise.s3.amazonaws.com",
      },
      {
        hostname: "s3.amazonaws.com",
      },
    ],
  },
}

export default nextConfig
