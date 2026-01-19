import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000', // Port Backend (Go) tempat gambar berada
        pathname: '/uploads/**', // Folder tempat gambar disimpan
      },
    ],
  },
};

export default nextConfig;