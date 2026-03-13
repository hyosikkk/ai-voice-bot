import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel Blob 도메인 허용
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
