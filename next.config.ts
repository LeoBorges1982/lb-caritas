import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Não usa next/image: desligar o otimizador tira de circulação a rota
  // /_next/image, onde caíram falhas críticas do Next em 2026.
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
