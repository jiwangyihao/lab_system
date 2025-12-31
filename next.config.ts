import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Externalize Prisma packages for Node.js runtime
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
